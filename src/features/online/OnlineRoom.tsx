"use client";

import { useEffect, useState } from "react";
import type { PlayerId } from "@/lib/game/types";
import { ensurePlayerSession, isOnlineConfigured } from "@/lib/supabase/client";
import { fetchRoom, getRoomPreview, ROOM_CODE_PATTERN, type RoomPreview, type RoomRow } from "./api";
import { JoinRoom } from "./JoinRoom";
import { RoomMessage } from "./RoomMessage";
import { RoomSession } from "./RoomSession";
import { seatOf } from "./room";

type Phase =
  | { kind: "loading" }
  | { kind: "message"; reason: MessageReason }
  | { kind: "join"; preview: Extract<RoomPreview, { state: "open" }> }
  | { kind: "room"; room: RoomRow; me: PlayerId };

type MessageReason = "invalid" | "not_found" | "expired" | "closed" | "full" | "error" | "unconfigured";

/**
 * Entry point for /online/[code]. Works out who the visitor is relative to
 * the room — a returning player (reconnect), a new opponent (join form), or
 * someone who can't get in — and renders the right screen.
 */
export function OnlineRoom({ code: rawCode }: { code: string }) {
  const code = rawCode.toUpperCase();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const update = (next: Phase) => !cancelled && setPhase(next);

    async function load() {
      if (!isOnlineConfigured()) return update({ kind: "message", reason: "unconfigured" });
      if (!ROOM_CODE_PATTERN.test(code)) return update({ kind: "message", reason: "invalid" });
      try {
        const userId = await ensurePlayerSession();
        const preview = await getRoomPreview(code);
        if (preview.state === "open") return update({ kind: "join", preview });
        if (preview.state !== "member") return update({ kind: "message", reason: preview.state });

        const room = await fetchRoom(preview.roomId);
        const me = room && seatOf(room, userId);
        if (!room || !me) return update({ kind: "message", reason: "not_found" });
        update({ kind: "room", room, me });
      } catch {
        update({ kind: "message", reason: "error" });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);

  switch (phase.kind) {
    case "loading":
      return <RoomMessage reason="loading" />;
    case "message":
      return <RoomMessage reason={phase.reason} onRetry={() => setAttempt((a) => a + 1)} />;
    case "join":
      return (
        <JoinRoom
          code={code}
          preview={phase.preview}
          onJoined={(room) => setPhase({ kind: "room", room, me: "player2" })}
          onUnavailable={(reason) => setPhase({ kind: "message", reason })}
        />
      );
    case "room":
      return <RoomSession key={phase.room.id} initialRoom={phase.room} me={phase.me} />;
  }
}
