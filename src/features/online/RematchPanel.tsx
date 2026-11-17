"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PlayerId } from "@/lib/game/types";
import { declineRematch, requestRematch, type RoomRow } from "./api";
import { getRematchState, REMATCH_TIMEOUT_MS } from "./rematch";
import { useNow } from "./useOnlineRoom";
import styles from "./RematchPanel.module.css";

type Props = {
  room: RoomRow;
  me: PlayerId;
  opponentName: string;
  onRoomChange: (room: RoomRow) => void;
};

/**
 * Rematch handshake: one player asks, the other accepts or declines.
 * The server only starts the next round once both have agreed.
 */
export function RematchPanel({ room, me, opponentName, onRoomChange }: Props) {
  const now = useNow(1000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = getRematchState(room, me, now);

  async function run(action: (id: string) => Promise<RoomRow>) {
    setBusy(true);
    setError(null);
    try {
      onRoomChange(await action(room.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const secondsLeft =
    room.rematch_requested_at === null
      ? 0
      : Math.max(0, Math.ceil((Date.parse(room.rematch_requested_at) + REMATCH_TIMEOUT_MS - now) / 1000));

  return (
    <div className={styles.panel} aria-live="polite">
      {state === "none" && (
        <Button onClick={() => run(requestRematch)} busy={busy}>
          Request rematch
        </Button>
      )}

      {state === "sent" && (
        <>
          <p className={styles.text}>
            Waiting for {opponentName} to accept… <span className={styles.timer}>{secondsLeft}s</span>
          </p>
          <Button variant="secondary" onClick={() => run(declineRematch)} busy={busy}>
            Cancel request
          </Button>
        </>
      )}

      {state === "received" && (
        <>
          <p className={styles.text}>
            <strong>{opponentName}</strong> wants a rematch!
          </p>
          <div className={styles.row}>
            <Button onClick={() => run(requestRematch)} busy={busy} autoFocus>
              Accept
            </Button>
            <Button variant="secondary" onClick={() => run(declineRematch)} disabled={busy}>
              Decline
            </Button>
          </div>
        </>
      )}

      {state === "declined-by-them" && (
        <>
          <p className={styles.text}>{opponentName} declined the rematch.</p>
          <Button variant="secondary" onClick={() => run(requestRematch)} busy={busy}>
            Ask again
          </Button>
        </>
      )}

      {state === "declined-by-me" && (
        <>
          <p className={styles.text}>You declined the rematch.</p>
          <Button variant="secondary" onClick={() => run(requestRematch)} busy={busy}>
            Request rematch
          </Button>
        </>
      )}

      {state === "expired" && (
        <>
          <p className={styles.text}>The rematch request expired.</p>
          <Button onClick={() => run(requestRematch)} busy={busy}>
            Request rematch
          </Button>
        </>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
