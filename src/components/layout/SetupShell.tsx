import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import styles from "./SetupShell.module.css";

type Props = {
  title: string;
  intro: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

/** Page frame for the pre-game setup screens. */
export function SetupShell({ title, intro, onSubmit, children, footer, wide }: Props) {
  return (
    <div className={`${styles.shell} ${wide ? styles.wide : ""}`}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> All modes
      </Link>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.intro}>{intro}</p>
      </header>
      {onSubmit ? (
        <form
          className={styles.body}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(e);
          }}
          noValidate
        >
          {children}
          {footer && <div className={styles.footer}>{footer}</div>}
        </form>
      ) : (
        <div className={styles.body}>
          {children}
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      )}
    </div>
  );
}
