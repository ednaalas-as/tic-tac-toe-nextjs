"use client";

import { useState } from "react";
import { DIFFICULTY_INFO } from "@/lib/game/ai";
import { DEFAULT_COMPUTER_PREFS, parseComputerPrefs } from "@/lib/preferences";
import { useStoredState } from "@/lib/storage";
import { ComputerGame } from "./ComputerGame";
import { ComputerSetup } from "./ComputerSetup";
import { buildComputerConfig, type ComputerConfig } from "./config";

/** Player vs Computer: setup screen, then the game. */
export function ComputerMode() {
  const [prefs, setPrefs] = useStoredState(
    "triad:computer-setup",
    DEFAULT_COMPUTER_PREFS,
    parseComputerPrefs,
  );
  const [config, setConfig] = useState<ComputerConfig | null>(null);
  const [gameKey, setGameKey] = useState(0);

  if (!config) {
    return (
      <ComputerSetup
        prefs={prefs}
        onChange={setPrefs}
        onStart={(finalPrefs) => {
          setPrefs(finalPrefs);
          setConfig(buildComputerConfig(finalPrefs));
          setGameKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <ComputerGame
      key={gameKey}
      config={config}
      subtitle={`${DIFFICULTY_INFO[config.difficulty].label} difficulty`}
      onEditSetup={() => setConfig(null)}
    />
  );
}
