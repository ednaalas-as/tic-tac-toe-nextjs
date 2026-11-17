"use client";

import Link from "next/link";
import { useApp } from "@/context/AppProviders";
import type { GameMode } from "@/lib/game/types";
import { HistoryList } from "./HistoryList";
import styles from "./HistoryPanel.module.css";

/** Collapsible list of this session's recent rounds for one mode. */
export function HistoryPanel({ mode }: { mode: GameMode }) {
  const { history } = useApp();
  const entries = history.filter((e) => e.mode === mode).slice(0, 5);

  return (
    <details className={styles.panel}>
      <summary className={styles.summary}>
        Recent rounds <span className={styles.count}>{entries.length}</span>
      </summary>
      <div className={styles.body}>
        <HistoryList entries={entries} showMode={false} emptyMessage="Finished rounds will appear here." />
        <Link href="/history" className={styles.link}>
          Full session history →
        </Link>
      </div>
    </details>
  );
}
