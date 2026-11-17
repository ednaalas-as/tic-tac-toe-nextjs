"use client";

import { useId } from "react";
import { SymbolPicker } from "@/components/symbols/SymbolPicker";
import { NAME_MAX_LENGTH } from "@/lib/preferences";
import styles from "./PlayerFields.module.css";

type Props = {
  heading: string;
  tone: "p1" | "p2";
  name: string;
  onNameChange: (name: string) => void;
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  taken?: { symbol: string; by: string };
  namePlaceholder?: string;
  disabled?: boolean;
};

/** Name input + symbol picker for one player. */
export function PlayerFields({
  heading,
  tone,
  name,
  onNameChange,
  symbol,
  onSymbolChange,
  taken,
  namePlaceholder,
  disabled,
}: Props) {
  const inputId = useId();
  return (
    <section className={`${styles.player} ${styles[tone]}`} aria-label={heading}>
      <h2 className={styles.heading}>{heading}</h2>
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          Name
        </label>
        <input
          id={inputId}
          className="text-input"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          placeholder={namePlaceholder}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </div>
      <SymbolPicker
        label="Symbol"
        value={symbol}
        onChange={onSymbolChange}
        taken={taken}
        tone={tone}
        disabled={disabled}
      />
    </section>
  );
}
