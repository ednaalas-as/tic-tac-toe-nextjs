"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppProviders";
import { useSound } from "@/hooks/useSound";
import { otherPlayer } from "@/lib/game/engine";
import type { PlayerId } from "@/lib/game/types";
import { leaveRoom, type RoomRow } from "./api";
import { OnlineGame } from "./OnlineGame";
import { OpponentLeft } from "./OpponentLeft";
import { RoomMessage } from "./RoomMessage";
import { roomToPlayers } from "./room";
import { useNow, useOnlineRoom } from "./useOnlineRoom";
import { WaitingRoom } from "./WaitingRoom";

type Props = { initialRoom: RoomRow; me: PlayerId };

/** A live room: subscribes to updates and shows the screen for its status. */
export function RoomSession({ initialRoom, me }: Props) {
  const router = useRouter();
  const live = useOnlineRoom(initialRoom, me);
  const { room } = live;
  const now = useNow(15_000);
  const [leaving, setLeaving] = useState(false);
  useRoomEffects(room, me);

  async function handleLeave() {
    setLeaving(true);
    try {
      await leaveRoom(room.id);
    } catch {
      // Leaving is best-effort; the room expires on its own anyway.
    }
    router.push("/online");
  }

  if (live.missing) return <RoomMessage reason="expired" />;
  if (room.status === "abandoned") {
    if (room.left_by === me || leaving) return <RoomMessage reason="loading" />;
    return <OpponentLeft room={room} me={me} />;
  }
  if (Date.parse(room.expires_at) < now) return <RoomMessage reason="expired" />;

  if (room.status === "waiting") {
    return <WaitingRoom room={room} connection={live.connection} onRoomChange={live.applyRoom} onLeave={handleLeave} leaving={leaving} />;
  }
  return (
    <OnlineGame
      room={room}
      me={me}
      connection={live.connection}
      opponentOnline={live.opponentOnline}
      onRoomChange={live.applyRoom}
      onRefresh={live.refresh}
      onLeave={handleLeave}
      leaving={leaving}
    />
  );
}

/** Sounds and session history, driven by server updates. */
function useRoomEffects(room: RoomRow, me: PlayerId) {
  const { recordResult } = useApp();
  const playSound = useSound();
  const previous = useRef(room);

  useEffect(() => {
    const before = previous.current;
    previous.current = room;
    if (before.version === room.version) return;

    const movesBefore = before.board.replace(/-/g, "").length;
    const movesNow = room.board.replace(/-/g, "").length;
    if (movesNow > movesBefore) {
      playSound("move", movesNow % 2 === 1 ? room.starting_player as PlayerId : otherPlayer(room.starting_player as PlayerId));
    }

    if (room.status === "finished" && room.outcome && before.status !== "finished") {
      playSound(room.outcome === "draw" ? "draw" : room.outcome === me ? "win" : "lose");
      const players = roomToPlayers(room);
      recordResult({
        id: `online-${room.id}-${room.round}`,
        mode: "online",
        finishedAt: Date.now(),
        outcome: room.outcome as "player1" | "player2" | "draw",
        detail: `Room ${room.code}`,
        players: {
          player1: { name: players.player1.name, symbol: players.player1.symbol },
          player2: { name: players.player2.name, symbol: players.player2.symbol },
        },
      });
    }
  }, [room, me, playSound, recordResult]);
}
