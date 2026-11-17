import { DEFAULT_SYMBOLS, isValidSymbol } from "./game/symbols";
import type { Difficulty } from "./game/types";

/** Validation helpers + defaults for everything we keep in localStorage. */

export const NAME_MAX_LENGTH = 20;

export function cleanName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, NAME_MAX_LENGTH);
  return cleaned || fallback;
}

/**
 * Names are stored exactly as typed (so the input can be cleared or contain
 * spaces mid-edit); they're only cleaned with `cleanName` when a game starts.
 */
function storedName(value: unknown, fallback: string): string {
  return typeof value === "string" ? value.slice(0, NAME_MAX_LENGTH) : fallback;
}

function cleanSymbol(value: unknown, fallback: string): string {
  return typeof value === "string" && isValidSymbol(value) ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export type PlayerPrefs = { name: string; symbol: string };

// ---- Settings ---------------------------------------------------------------

export type ThemePreference = "system" | "light" | "dark";
export type Settings = { sound: boolean; theme: ThemePreference };

export const DEFAULT_SETTINGS: Settings = { sound: true, theme: "system" };

export function parseSettings(stored: unknown): Settings {
  const s = asRecord(stored);
  return {
    sound: typeof s.sound === "boolean" ? s.sound : DEFAULT_SETTINGS.sound,
    theme: s.theme === "light" || s.theme === "dark" ? s.theme : "system",
  };
}

// ---- Player vs Computer -----------------------------------------------------

export type FirstMove = "human" | "computer";
export type ComputerPrefs = PlayerPrefs & { difficulty: Difficulty; firstMove: FirstMove };

export const DEFAULT_COMPUTER_PREFS: ComputerPrefs = {
  name: "You",
  symbol: DEFAULT_SYMBOLS.player1,
  difficulty: "medium",
  firstMove: "human",
};

export function parseComputerPrefs(stored: unknown): ComputerPrefs {
  const s = asRecord(stored);
  return {
    name: storedName(s.name, DEFAULT_COMPUTER_PREFS.name),
    symbol: cleanSymbol(s.symbol, DEFAULT_COMPUTER_PREFS.symbol),
    difficulty:
      s.difficulty === "easy" || s.difficulty === "hard" ? s.difficulty : "medium",
    firstMove: s.firstMove === "computer" ? "computer" : "human",
  };
}

// ---- Local multiplayer ------------------------------------------------------

export type LocalPrefs = { player1: PlayerPrefs; player2: PlayerPrefs };

export const DEFAULT_LOCAL_PREFS: LocalPrefs = {
  player1: { name: "Player 1", symbol: DEFAULT_SYMBOLS.player1 },
  player2: { name: "Player 2", symbol: DEFAULT_SYMBOLS.player2 },
};

export function parseLocalPrefs(stored: unknown): LocalPrefs {
  const s = asRecord(stored);
  const p1 = asRecord(s.player1);
  const p2 = asRecord(s.player2);
  const player1 = {
    name: storedName(p1.name, DEFAULT_LOCAL_PREFS.player1.name),
    symbol: cleanSymbol(p1.symbol, DEFAULT_LOCAL_PREFS.player1.symbol),
  };
  let player2 = {
    name: storedName(p2.name, DEFAULT_LOCAL_PREFS.player2.name),
    symbol: cleanSymbol(p2.symbol, DEFAULT_LOCAL_PREFS.player2.symbol),
  };
  if (player2.symbol === player1.symbol) {
    player2 = { ...player2, symbol: player1.symbol === "o" ? "x" : "o" };
  }
  return { player1, player2 };
}

// ---- Online -----------------------------------------------------------------

export const DEFAULT_ONLINE_PREFS: PlayerPrefs = { name: "", symbol: "star" };

export function parseOnlinePrefs(stored: unknown): PlayerPrefs {
  const s = asRecord(stored);
  return {
    name: storedName(s.name, ""),
    symbol: cleanSymbol(s.symbol, DEFAULT_ONLINE_PREFS.symbol),
  };
}
