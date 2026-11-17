"use client";

import { useId } from "react";
import styles from "./Segmented.module.css";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  hint?: string;
};

/** A small radio group styled as a segmented control. */
export function Segmented<T extends string>({ label, options, value, onChange, hint }: Props<T>) {
  const name = useId();
  return (
    <fieldset className={styles.field}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.track}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint && <p className={styles.hint} aria-live="polite">{hint}</p>}
    </fieldset>
  );
}
