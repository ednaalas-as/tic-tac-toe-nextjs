"use client";

import { useState } from "react";
import { SetupShell } from "@/components/layout/SetupShell";
import { PlayerFields } from "@/components/players/PlayerFields";
import { SymbolGlyph } from "@/components/symbols/SymbolGlyph";
import { Button } from "@/components/ui/Button";
import { getSymbol, resolveSymbol } from "@/lib/game/symbols";
import { cleanName, DEFAULT_ONLINE_PREFS, parseOnlinePrefs } from "@/lib/preferences";
import { useStoredState } from "@/lib/storage";
import { getRoomPreview, joinRoom, RoomError, type RoomPreview, type RoomRow } from "./api";
import styles from "./JoinRoom.module.css";

type Props = {
  code: string;
  preview: Extract<RoomPreview, { state: "open" }>;
  onJoined: (room: RoomRow) => void;
  onUnavailable: (reason: "not_found" | "expired" | "closed" | "full") => void;
};

const UNAVAILABLE = ["room_not_found", "room_expired", "room_closed", "room_full"] as const;
const REASON = {
  room_not_found: "not_found",
  room_expired: "expired",
  room_closed: "closed",
  room_full: "full",
} as const;

export function JoinRoom({ code, preview, onJoined, onUnavailable }: Props) {
  const [prefs, setPrefs] = useStoredState("triad:online-profile", DEFAULT_ONLINE_PREFS, parseOnlinePrefs);
  const [host, setHost] = useState({ name: preview.hostName, symbol: preview.hostSymbol });
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Never default to the host's symbol.
  const symbol = resolveSymbol(prefs.symbol, host.symbol, ["o", "x", "star"]);

  async function handleJoin() {
    const name = cleanName(prefs.name, "");
    if (!name) {
      setError("Enter your name so your opponent knows who they're playing.");
      return;
    }
    setError(null);
    setJoining(true);
    try {
      setPrefs({ name, symbol });
      onJoined(await joinRoom(code, name, symbol));
    } catch (e) {
      setJoining(false);
      if (e instanceof RoomError && (UNAVAILABLE as readonly string[]).includes(e.code)) {
        onUnavailable(REASON[e.code as (typeof UNAVAILABLE)[number]]);
        return;
      }
      if (e instanceof RoomError && e.code === "symbol_taken") {
        // The host changed symbol while we were choosing: refresh and retry.
        const latest = await getRoomPreview(code).catch(() => null);
        if (latest?.state === "open") setHost({ name: latest.hostName, symbol: latest.hostSymbol });
      }
      setError(e instanceof Error ? e.message : "Couldn't join the room.");
    }
  }

  return (
    <SetupShell
      title="You're invited"
      intro="Pick your name and symbol, then jump in. The game starts as soon as you join."
      onSubmit={handleJoin}
      footer={
        <Button type="submit" busy={joining} className={styles.join}>
          {joining ? "Joining…" : "Join game"}
        </Button>
      }
    >
      <section className={styles.host} aria-label="Host">
        <span className={styles.avatar}>
          <SymbolGlyph symbol={host.symbol} tone="p1" size="lg" />
        </span>
        <div>
          <p className={styles.hostName}>{host.name}</p>
          <p className={styles.hostMeta}>
            is waiting in room <strong className={styles.code}>{code}</strong> playing{" "}
            {getSymbol(host.symbol).label}
          </p>
        </div>
      </section>

      <PlayerFields
        heading="You"
        tone="p2"
        name={prefs.name}
        onNameChange={(name) => setPrefs({ ...prefs, name })}
        symbol={symbol}
        onSymbolChange={(next) => setPrefs({ ...prefs, symbol: next })}
        taken={{ symbol: host.symbol, by: host.name }}
        namePlaceholder="Your name"
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </SetupShell>
  );
}
