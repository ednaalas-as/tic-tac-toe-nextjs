"use client";

import { useState } from "react";
import { GameScreen, type PlayerDecoration } from "@/components/game/GameScreen";
import { StatusLine } from "@/components/game/StatusLine";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { SymbolPicker } from "@/components/symbols/SymbolPicker";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { otherPlayer } from "@/lib/game/engine";
import type { PlayerId } from "@/lib/game/types";
import { changeSymbol, makeMove, type RoomRow } from "./api";
import { RematchPanel } from "./RematchPanel";
import { roomToGame, roomToPlayers, roomToScore } from "./room";
import type { ConnectionState } from "./useOnlineRoom";
import styles from "./OnlineGame.module.css";

type Props = {
  room: RoomRow;
  me: PlayerId;
  connection: ConnectionState;
  opponentOnline: boolean;
  onRoomChange: (room: RoomRow) => void;
  onRefresh: () => Promise<void>;
  onLeave: () => void;
  leaving: boolean;
};

export function OnlineGame({
  room,
  me,
  connection,
  opponentOnline,
  onRoomChange,
  onRefresh,
  onLeave,
  leaving,
}: Props) {
  const them = otherPlayer(me);
  const game = roomToGame(room);
  const players = roomToPlayers(room);
  const [pendingCell, setPendingCell] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const connected = connection === "live";
  const myTurn = room.status === "playing" && room.current_turn === me;
  const canMove = myTurn && connected && pendingCell === null;
  const opponent = players[them];

  // The server is the source of truth: we show the move as "pending" until
  // make_move returns the updated room (or an error explains why not).
  async function handleSelect(index: number) {
    if (!canMove) return;
    setNotice(null);
    setPendingCell(index);
    try {
      onRoomChange(await makeMove(room.id, index));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "That move didn't go through.");
      await onRefresh();
    } finally {
      setPendingCell(null);
    }
  }

  async function handleSymbol(symbol: string) {
    setNotice(null);
    try {
      onRoomChange(await changeSymbol(room.id, symbol));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't change symbol.");
    }
  }

  let status;
  if (connection === "offline") status = <StatusLine>You&apos;re offline — reconnecting when you&apos;re back</StatusLine>;
  else if (connection !== "live") status = <StatusLine>Reconnecting…</StatusLine>;
  else if (game.outcome === "draw") status = <StatusLine>It&apos;s a draw</StatusLine>;
  else if (game.outcome === me) status = <StatusLine player={players[me]}>You win!</StatusLine>;
  else if (game.outcome) status = <StatusLine player={opponent}>{opponent.name} wins</StatusLine>;
  else if (myTurn) status = <StatusLine player={players[me]}>Your turn</StatusLine>;
  else if (!opponentOnline) status = <StatusLine player={opponent}>{opponent.name} disconnected — waiting…</StatusLine>;
  else status = <StatusLine player={opponent}>{opponent.name}&apos;s turn</StatusLine>;

  const decorations: Partial<Record<PlayerId, PlayerDecoration>> = {
    [me]: { tag: "You" },
    [them]: opponentOnline ? { tag: "Online" } : { tag: "Offline", tagTone: "warning" },
  };

  return (
    <>
      <GameScreen
        title="Online match"
        subtitle={`Room ${room.code} · Round ${room.round}`}
        backHref="/online"
        backLabel="Online lobby"
        players={players}
        game={game}
        score={roomToScore(room)}
        status={status}
        interactive={canMove}
        onCellSelect={handleSelect}
        previewPlayer={me}
        pendingCell={pendingCell === null ? null : { index: pendingCell, player: me }}
        decorations={decorations}
        banner={
          <>
            {notice && (
              <p className={styles.notice} role="alert">
                {notice}
              </p>
            )}
            {room.status === "finished" && (
              <RematchPanel room={room} me={me} opponentName={opponent.name} onRoomChange={onRoomChange} />
            )}
          </>
        }
        actions={
          <Button variant="ghost" onClick={() => setConfirmLeave(true)} busy={leaving}>
            Leave room
          </Button>
        }
        aside={
          <div className={styles.aside}>
            {room.status === "finished" && (
              <details className={styles.symbolEdit}>
                <summary>Change your symbol for the next round</summary>
                <div className={styles.symbolBody}>
                  <SymbolPicker
                    label="Your symbol"
                    value={players[me].symbol}
                    onChange={handleSymbol}
                    taken={{ symbol: opponent.symbol, by: opponent.name }}
                    tone={me === "player1" ? "p1" : "p2"}
                  />
                </div>
              </details>
            )}
            <HistoryPanel mode="online" />
          </div>
        }
      />
      <ConfirmDialog
        open={confirmLeave}
        title="Leave this room?"
        message={`${opponent.name} will be told you left, and this room will close.`}
        confirmLabel="Leave room"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          onLeave();
        }}
      />
    </>
  );
}
