"use client";

import { useState } from "react";
import type { Players } from "@/lib/game/types";
import { cleanName, DEFAULT_LOCAL_PREFS, parseLocalPrefs, type LocalPrefs } from "@/lib/preferences";
import { useStoredState } from "@/lib/storage";
import { LocalGame } from "./LocalGame";
import { LocalSetup } from "./LocalSetup";

export function buildLocalPlayers(prefs: LocalPrefs): Players {
  return {
    player1: { id: "player1", kind: "human", name: cleanName(prefs.player1.name, "Player 1"), symbol: prefs.player1.symbol },
    player2: { id: "player2", kind: "human", name: cleanName(prefs.player2.name, "Player 2"), symbol: prefs.player2.symbol },
  };
}

/** Local multiplayer: two people, one device. Works fully offline. */
export function LocalMode() {
  const [prefs, setPrefs] = useStoredState("triad:local-setup", DEFAULT_LOCAL_PREFS, parseLocalPrefs);
  const [players, setPlayers] = useState<Players | null>(null);
  const [gameKey, setGameKey] = useState(0);

  if (!players) {
    return (
      <LocalSetup
        prefs={prefs}
        onChange={setPrefs}
        onStart={() => {
          const built = buildLocalPlayers(prefs);
          setPrefs({ player1: built.player1, player2: built.player2 });
          setPlayers(built);
          setGameKey((k) => k + 1);
        }}
      />
    );
  }

  return <LocalGame key={gameKey} players={players} onEditPlayers={() => setPlayers(null)} />;
}
