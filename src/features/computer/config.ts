import { COMPUTER_SYMBOL, resolveSymbol } from "@/lib/game/symbols";
import type { Difficulty, Players } from "@/lib/game/types";
import { cleanName, type ComputerPrefs } from "@/lib/preferences";

/** Each difficulty has its own computer identity. */
export const COMPUTER_NAMES: Record<Difficulty, string> = {
  easy: "Pebble",
  medium: "Gizmo",
  hard: "Atlas",
};

export type ComputerConfig = {
  players: Players;
  difficulty: Difficulty;
  firstMove: ComputerPrefs["firstMove"];
};

/** The computer avoids the human's symbol automatically. */
export function computerSymbolFor(humanSymbol: string): string {
  return resolveSymbol(COMPUTER_SYMBOL, humanSymbol, ["o", "x"]);
}

export function buildComputerConfig(prefs: ComputerPrefs): ComputerConfig {
  return {
    difficulty: prefs.difficulty,
    firstMove: prefs.firstMove,
    players: {
      player1: { id: "player1", kind: "human", name: cleanName(prefs.name, "You"), symbol: prefs.symbol },
      player2: {
        id: "player2",
        kind: "computer",
        name: COMPUTER_NAMES[prefs.difficulty],
        symbol: computerSymbolFor(prefs.symbol),
      },
    },
  };
}
