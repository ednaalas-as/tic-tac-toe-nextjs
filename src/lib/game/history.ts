import type { GameMode, Outcome, PlayerId } from "./types";

/** A snapshot of one finished round, kept for the current browser session. */
export type HistoryEntry = {
  readonly id: string;
  readonly mode: GameMode;
  readonly finishedAt: number;
  readonly outcome: Outcome;
  readonly players: Readonly<Record<PlayerId, { name: string; symbol: string }>>;
  /** Extra context such as the computer difficulty. */
  readonly detail?: string;
};

export const MAX_HISTORY = 50;

export function appendHistory(
  history: readonly HistoryEntry[],
  entry: HistoryEntry,
): HistoryEntry[] {
  if (history.some((e) => e.id === entry.id)) return [...history];
  return [entry, ...history].slice(0, MAX_HISTORY);
}

export function describeOutcome(entry: HistoryEntry): string {
  if (entry.outcome === "draw") return "Draw";
  return `${entry.players[entry.outcome].name} won`;
}
