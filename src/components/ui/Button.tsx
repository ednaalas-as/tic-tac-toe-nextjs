import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";

function classes(variant: Variant, block?: boolean, extra?: string) {
  return [styles.button, styles[variant], block && styles.block, extra].filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  block?: boolean;
  busy?: boolean;
};

export function Button({ variant = "primary", block, busy, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={classes(variant, block, className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; block?: boolean };

export function LinkButton({ variant = "primary", block, className, ...rest }: LinkButtonProps) {
  return <Link className={classes(variant, block, className)} {...rest} />;
}
