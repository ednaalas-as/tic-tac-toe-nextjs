"use client";

import { useState } from "react";
import { SetupShell } from "@/components/layout/SetupShell";
import { SymbolGlyph } from "@/components/symbols/SymbolGlyph";
import { SymbolPicker } from "@/components/symbols/SymbolPicker";
import { Button } from "@/components/ui/Button";
import { changeSymbol, type RoomRow } from "./api";
import type { ConnectionState } from "./useOnlineRoom";
import { useCopy } from "./useCopy";
import styles from "./WaitingRoom.module.css";

type Props = {
  room: RoomRow;
  connection: ConnectionState;
  onRoomChange: (room: RoomRow) => void;
  onLeave: () => void;
  leaving: boolean;
};

export function WaitingRoom({ room, connection, onRoomChange, onLeave, leaving }: Props) {
  const inviteUrl = typeof window === "undefined" ? "" : `${window.location.origin}/online/${room.code}`;
  const copy = useCopy();
  const [symbolError, setSymbolError] = useState<string | null>(null);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function handleSymbol(symbol: string) {
    setSymbolError(null);
    try {
      onRoomChange(await changeSymbol(room.id, symbol));
    } catch (e) {
      setSymbolError(e instanceof Error ? e.message : "Couldn't change symbol.");
    }
  }

  return (
    <SetupShell
      title="Your room is ready"
      intro="Send the invite link or code to a friend. The game starts the moment they join."
    >
      <section className={styles.codeCard} aria-label="Room code">
        <p className={styles.codeLabel}>Room code</p>
        <p className={styles.code} aria-label={room.code.split("").join(" ")}>
          {room.code}
        </p>
        <div className={styles.copyRow}>
          <Button variant="secondary" onClick={() => copy.copy(room.code, "code")}>
            {copy.copied === "code" ? "Code copied ✓" : "Copy code"}
          </Button>
          <Button onClick={() => copy.copy(inviteUrl, "link")}>
            {copy.copied === "link" ? "Link copied ✓" : "Copy invite link"}
          </Button>
          {canShare && (
            <Button
              variant="ghost"
              onClick={() =>
                navigator.share({ title: "Play tic-tac-toe with me", text: `Join my Triad room ${room.code}`, url: inviteUrl }).catch(() => {})
              }
            >
              Share…
            </Button>
          )}
        </div>
        {copy.error && <p className={styles.error} role="alert">{copy.error}</p>}
        <p className={styles.link}>{inviteUrl}</p>
      </section>

      <section className={styles.status} aria-live="polite">
        <span className={styles.pulse} aria-hidden="true" />
        <div>
          <p className={styles.statusTitle}>
            {connection === "live" ? "Waiting for an opponent…" : "Connecting…"}
          </p>
          <p className={styles.statusBody}>
            You&apos;re playing as <strong>{room.player1_name}</strong>{" "}
            <SymbolGlyph symbol={room.player1_symbol} tone="p1" size="sm" />. Keep this page open.
          </p>
        </div>
      </section>

      <details className={styles.symbolEdit}>
        <summary>Change your symbol</summary>
        <div className={styles.symbolBody}>
          <SymbolPicker label="Your symbol" value={room.player1_symbol} onChange={handleSymbol} tone="p1" />
          {symbolError && <p className={styles.error} role="alert">{symbolError}</p>}
        </div>
      </details>

      <div>
        <Button variant="ghost" onClick={onLeave} busy={leaving}>
          Leave room
        </Button>
      </div>
    </SetupShell>
  );
}
