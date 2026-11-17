"use client";

import { SetupShell } from "@/components/layout/SetupShell";
import { PlayerFields } from "@/components/players/PlayerFields";
import { Button } from "@/components/ui/Button";
import type { PlayerId } from "@/lib/game/types";
import { cleanName, type LocalPrefs, type PlayerPrefs } from "@/lib/preferences";
import styles from "./LocalSetup.module.css";

type Props = {
  prefs: LocalPrefs;
  onChange: (prefs: LocalPrefs) => void;
  onStart: () => void;
};

export function LocalSetup({ prefs, onChange, onStart }: Props) {
  function update(id: PlayerId, patch: Partial<PlayerPrefs>) {
    onChange({ ...prefs, [id]: { ...prefs[id], ...patch } });
  }

  const name1 = cleanName(prefs.player1.name, "Player 1");
  const name2 = cleanName(prefs.player2.name, "Player 2");

  return (
    <SetupShell
      wide
      title="Local multiplayer"
      intro="Two players, one screen. Each of you picks a name and a symbol — no two alike. Player 1 starts, then you take turns starting."
      onSubmit={onStart}
      footer={
        <Button type="submit" className={styles.start}>
          Start game
        </Button>
      }
    >
      <div className={styles.players}>
        <PlayerFields
          heading="Player 1"
          tone="p1"
          name={prefs.player1.name}
          onNameChange={(name) => update("player1", { name })}
          symbol={prefs.player1.symbol}
          onSymbolChange={(symbol) => update("player1", { symbol })}
          taken={{ symbol: prefs.player2.symbol, by: name2 }}
          namePlaceholder="Player 1"
        />
        <PlayerFields
          heading="Player 2"
          tone="p2"
          name={prefs.player2.name}
          onNameChange={(name) => update("player2", { name })}
          symbol={prefs.player2.symbol}
          onSymbolChange={(symbol) => update("player2", { symbol })}
          taken={{ symbol: prefs.player1.symbol, by: name1 }}
          namePlaceholder="Player 2"
        />
      </div>
    </SetupShell>
  );
}
