"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { appendHistory, type HistoryEntry } from "@/lib/game/history";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  type Settings,
} from "@/lib/preferences";
import { useStoredState } from "@/lib/storage";

type AppContextValue = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  history: readonly HistoryEntry[];
  recordResult: (entry: HistoryEntry) => void;
  clearHistory: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY_HISTORY: HistoryEntry[] = [];
const parseHistory = (stored: unknown) => (Array.isArray(stored) ? (stored as HistoryEntry[]) : EMPTY_HISTORY);

export function AppProviders({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useStoredState("triad:settings", DEFAULT_SETTINGS, parseSettings);
  // Session storage: history lasts for this browser session only.
  const [history, setHistory] = useStoredState("triad:history", EMPTY_HISTORY, parseHistory, "session");

  // Reflect the theme choice on <html>; CSS does the rest.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch })),
    [setSettings],
  );
  const recordResult = useCallback(
    (entry: HistoryEntry) => setHistory((prev) => appendHistory(prev, entry)),
    [setHistory],
  );
  const clearHistory = useCallback(() => setHistory([]), [setHistory]);

  const value = useMemo(
    () => ({ settings, updateSettings, history, recordResult, clearHistory }),
    [settings, updateSettings, history, recordResult, clearHistory],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProviders>");
  return ctx;
}
