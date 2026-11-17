"use client";

import { useId, type KeyboardEvent } from "react";
import { getSymbol, SYMBOL_CATEGORIES, SYMBOLS } from "@/lib/game/symbols";
import { SymbolGlyph } from "./SymbolGlyph";
import styles from "./SymbolPicker.module.css";

type Props = {
  label: string;
  value: string;
  onChange: (symbol: string) => void;
  /** Symbol already used by the other player, and who owns it. */
  taken?: { symbol: string; by: string };
  tone?: "p1" | "p2";
  disabled?: boolean;
};

/**
 * Accessible symbol chooser (radio group semantics).
 * The opponent's symbol is shown but cannot be selected.
 */
export function SymbolPicker({ label, value, onChange, taken, tone = "p1", disabled }: Props) {
  const groupId = useId();
  const selectable = SYMBOLS.filter((s) => s.id !== taken?.symbol && !disabled);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, symbolId: string) {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(event.key) || selectable.length === 0) return;
    event.preventDefault();
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const index = selectable.findIndex((s) => s.id === symbolId);
    const next = selectable[(index + step + selectable.length) % selectable.length];
    onChange(next.id);
    document.getElementById(`${groupId}-${next.id}`)?.focus();
  }

  return (
    <fieldset className={styles.picker} disabled={disabled}>
      <legend className={styles.legend}>
        {label}
        <span className={styles.current}>
          <SymbolGlyph symbol={value} tone={tone} size="sm" />
          {getSymbol(value).label}
        </span>
      </legend>
      <div role="radiogroup" aria-label={label} className={styles.groups}>
        {SYMBOL_CATEGORIES.map((category) => (
          <div key={category} className={styles.group}>
            <span className={styles.category} aria-hidden="true">
              {category}
            </span>
            <div className={styles.grid}>
              {SYMBOLS.filter((s) => s.category === category).map((symbol) => {
                const isTaken = symbol.id === taken?.symbol;
                const isSelected = symbol.id === value;
                return (
                  <button
                    key={symbol.id}
                    id={`${groupId}-${symbol.id}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={isTaken || undefined}
                    aria-label={isTaken ? `${symbol.label} (taken by ${taken?.by})` : symbol.label}
                    title={isTaken ? `Taken by ${taken?.by}` : symbol.label}
                    tabIndex={isSelected ? 0 : -1}
                    className={[
                      styles.option,
                      isSelected && styles.selected,
                      isSelected && styles[tone],
                      isTaken && styles.taken,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => !isTaken && onChange(symbol.id)}
                    onKeyDown={(e) => handleKeyDown(e, symbol.id)}
                  >
                    <SymbolGlyph symbol={symbol.id} tone={isSelected ? tone : "ink"} size="md" />
                    {isTaken && <span className={styles.lock} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
