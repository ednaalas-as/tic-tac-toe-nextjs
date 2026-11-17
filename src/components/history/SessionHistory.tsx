"use client";

import { useState } from "react";
import { SetupShell } from "@/components/layout/SetupShell";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useApp } from "@/context/AppProviders";
import type { GameMode } from "@/lib/game/types";
import { HistoryList } from "./HistoryList";
import styles from "./SessionHistory.module.css";

const FILTERS: { value: GameMode | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "computer", label: "vs Computer" },
  { value: "local", label: "Local" },
  { value: "online", label: "Online" },
];

export function SessionHistory() {
  const { history, clearHistory } = useApp();
  const [filter, setFilter] = useState<GameMode | "all">("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const entries = filter === "all" ? history : history.filter((e) => e.mode === filter);

  return (
    <SetupShell
      title="Session history"
      intro="Every round you finish in this browser tab session, across all modes. It clears when you close the browser."
    >
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Filter by mode">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={styles.filter}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {history.length > 0 && (
          <Button variant="ghost" onClick={() => setConfirmClear(true)}>
            Clear history
          </Button>
        )}
      </div>
      <HistoryList entries={entries} emptyMessage="No finished rounds yet. Go play one!" />
      <ConfirmDialog
        open={confirmClear}
        title="Clear history?"
        message="This removes every round recorded in this session."
        confirmLabel="Clear"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearHistory();
          setConfirmClear(false);
        }}
      />
    </SetupShell>
  );
}
