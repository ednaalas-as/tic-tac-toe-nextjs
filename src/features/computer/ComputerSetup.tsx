"use client";

import { SetupShell } from "@/components/layout/SetupShell";
import { PlayerFields } from "@/components/players/PlayerFields";
import { SymbolGlyph } from "@/components/symbols/SymbolGlyph";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { DIFFICULTY_INFO } from "@/lib/game/ai";
import type { Difficulty } from "@/lib/game/types";
import { cleanName, type ComputerPrefs, type FirstMove } from "@/lib/preferences";
import { COMPUTER_NAMES, computerSymbolFor } from "./config";
import styles from "./ComputerSetup.module.css";

type Props = {
  prefs: ComputerPrefs;
  onChange: (prefs: ComputerPrefs) => void;
  onStart: (prefs: ComputerPrefs) => void;
};

export function ComputerSetup({ prefs, onChange, onStart }: Props) {
  const update = (patch: Partial<ComputerPrefs>) => onChange({ ...prefs, ...patch });
  const computerSymbol = computerSymbolFor(prefs.symbol);
  const computerName = COMPUTER_NAMES[prefs.difficulty];

  return (
    <SetupShell
      title="Player vs Computer"
      intro="Pick your name and symbol, choose how tough the computer is, and decide who goes first."
      onSubmit={() => onStart({ ...prefs, name: cleanName(prefs.name, "You") })}
      footer={
        <Button type="submit" className={styles.start}>
          Start game
        </Button>
      }
    >
      <PlayerFields
        heading="You"
        tone="p1"
        name={prefs.name}
        onNameChange={(name) => update({ name })}
        symbol={prefs.symbol}
        onSymbolChange={(symbol) => update({ symbol })}
        namePlaceholder="Your name"
      />

      <section className={styles.opponent} aria-label="Computer opponent">
        <div className={styles.identity}>
          <span className={styles.avatar}>
            <SymbolGlyph symbol={computerSymbol} tone="p2" size="lg" />
          </span>
          <div>
            <h2 className={styles.name}>{computerName}</h2>
            <p className={styles.kind}>Computer opponent</p>
          </div>
        </div>

        <Segmented<Difficulty>
          label="Difficulty"
          value={prefs.difficulty}
          onChange={(difficulty) => update({ difficulty })}
          options={(["easy", "medium", "hard"] as const).map((d) => ({
            value: d,
            label: DIFFICULTY_INFO[d].label,
          }))}
          hint={DIFFICULTY_INFO[prefs.difficulty].description}
        />

        <Segmented<FirstMove>
          label="First move"
          value={prefs.firstMove}
          onChange={(firstMove) => update({ firstMove })}
          options={[
            { value: "human", label: "Me" },
            { value: "computer", label: computerName },
          ]}
          hint="After each round, the other side starts."
        />
      </section>
    </SetupShell>
  );
}
