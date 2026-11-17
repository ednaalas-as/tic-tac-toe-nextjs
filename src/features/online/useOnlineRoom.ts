"use client";

import { useCallback, useEffect, useState } from "react";
import { otherPlayer } from "@/lib/game/engine";
import type { PlayerId } from "@/lib/game/types";
import { getSupabase } from "@/lib/supabase/client";
import { fetchRoom, type RoomRow } from "./api";

export type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";

/**
 * Keeps a room row in sync with the database.
 *
 * - Postgres changes (filtered by RLS) push every update to both players.
 * - Presence tells us whether the opponent currently has the room open.
 * - After any reconnect the row is re-fetched, so a missed update can never
 *   leave the board out of date.
 * - `version` guards against out-of-order updates.
 */
export function useOnlineRoom(initial: RoomRow, me: PlayerId) {
  const roomId = initial.id;
  const [room, setRoom] = useState<RoomRow>(initial);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [missing, setMissing] = useState(false);

  const applyRoom = useCallback((next: RoomRow) => {
    setRoom((prev) => (next.id === prev.id && next.version >= prev.version ? next : prev));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const latest = await fetchRoom(roomId);
      if (latest) applyRoom(latest);
      else setMissing(true); // deleted by cleanup, or access lost
    } catch {
      setConnection("reconnecting");
    }
  }, [roomId, applyRoom]);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: me } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => applyRoom(payload.new as RoomRow),
      )
      .on("presence", { event: "sync" }, () => {
        setOpponentOnline(otherPlayer(me) in channel.presenceState());
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnection("live");
          void channel.track({ seat: me, at: Date.now() });
          void refresh();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("reconnecting");
        }
      });

    const handleOffline = () => setConnection("offline");
    const handleOnline = () => {
      setConnection("reconnecting");
      void refresh();
    };
    const handleVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisible);
      void supabase.removeChannel(channel);
    };
  }, [roomId, me, applyRoom, refresh]);

  return { room, applyRoom, refresh, connection, opponentOnline, missing };
}

/** Current time, re-rendering every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
