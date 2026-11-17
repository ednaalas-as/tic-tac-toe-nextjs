import type { Cell, GameState, Outcome, PlayerId, Players, Score } from "@/lib/game/types";

/**
 * Pure helpers that translate a database room row into the same shapes the
 * shared engine/UI use. Kept free of Supabase imports so they're easy to test.
 */

export type RoomLike = {
  board: string;
  current_turn: string;
  starting_player: string;
  outcome: string | null;
  winning_line: number[] | null;
  player1_name: string;
  player1_symbol: string;
  player2_name: string | null;
  player2_symbol: string | null;
  player1_score: number;
  player2_score: number;
  draws: number;
};

const asPlayer = (value: string): PlayerId => (value === "player2" ? "player2" : "player1");

export function boardFromString(board: string): Cell[] {
  return board.split("").map((c) => (c === "1" ? "player1" : c === "2" ? "player2" : null));
}

export function roomToGame(room: RoomLike): GameState {
  return {
    board: boardFromString(room.board),
    currentPlayer: asPlayer(room.current_turn),
    startingPlayer: asPlayer(room.starting_player),
    outcome: (room.outcome as Outcome | null) ?? null,
    winningLine: room.winning_line,
  };
}

export function roomToPlayers(room: RoomLike): Players {
  return {
    player1: { id: "player1", name: room.player1_name, symbol: room.player1_symbol, kind: "human" },
    player2: {
      id: "player2",
      name: room.player2_name ?? "Waiting…",
      symbol: room.player2_symbol ?? (room.player1_symbol === "o" ? "x" : "o"),
      kind: "human",
    },
  };
}

export function roomToScore(room: RoomLike): Score {
  return { player1: room.player1_score, player2: room.player2_score, draws: room.draws };
}

/** Which seat the given user occupies, if any. */
export function seatOf(
  room: { player1_id: string; player2_id: string | null },
  userId: string,
): PlayerId | null {
  if (room.player1_id === userId) return "player1";
  if (room.player2_id === userId) return "player2";
  return null;
}
