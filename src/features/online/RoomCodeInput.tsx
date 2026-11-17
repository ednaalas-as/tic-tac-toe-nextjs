"use client";

import { useId } from "react";
import { normalizeRoomCode } from "./api";
import styles from "./RoomCodeInput.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
};

/** Mobile-friendly room code field: big, uppercase, no autocorrect. */
export function RoomCodeInput({ value, onChange, invalid }: Props) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        Room code
      </label>
      <input
        id={id}
        className={`text-input ${styles.input}`}
        value={value}
        onChange={(e) => onChange(normalizeRoomCode(e.target.value))}
        placeholder="ABC234"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={6}
        aria-invalid={invalid || undefined}
        enterKeyHint="go"
      />
    </div>
  );
}
