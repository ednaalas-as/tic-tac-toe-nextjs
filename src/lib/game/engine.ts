import type { Board, Cell, GameState, Outcome, PlayerId } from "./types";

export const BOARD_SIZE = 9;

/** All eight ways to get three in a row. */
export const WINNING_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createEmptyBoard(): Board {
  return Array<Cell>(BOARD_SIZE).fill(null);
}

export function createGame(startingPlayer: PlayerId = "player1"): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: startingPlayer,
    startingPlayer,
    outcome: null,
    winningLine: null,
  };
}

export function otherPlayer(player: PlayerId): PlayerId {
  return player === "player1" ? "player2" : "player1";
}

export function getAvailableMoves(board: Board): number[] {
  const moves: number[] = [];
  board.forEach((cell, index) => {
    if (cell === null) moves.push(index);
  });
  return moves;
}

export type BoardResult = {
  outcome: Outcome | null;
  winningLine: readonly number[] | null;
};

/** Evaluates a board: who has won, whether it's a draw, or still in play. */
export function evaluateBoard(board: Board): BoardResult {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const owner = board[a];
    if (owner && owner === board[b] && owner === board[c]) {
      return { outcome: owner, winningLine: line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { outcome: "draw", winningLine: null };
  }
  return { outcome: null, winningLine: null };
}

export type MoveError =
  | "game-over"
  | "out-of-range"
  | "occupied"
  | "not-your-turn";

/**
 * Returns why a move is not allowed, or `null` if it is legal.
 * `player` is optional; when given, it must be the player whose turn it is.
 */
export function getMoveError(
  state: GameState,
  index: number,
  player?: PlayerId,
): MoveError | null {
  if (state.outcome !== null) return "game-over";
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_SIZE) {
    return "out-of-range";
  }
  if (state.board[index] !== null) return "occupied";
  if (player && player !== state.currentPlayer) return "not-your-turn";
  return null;
}

/**
 * Plays a move for the current player. Invalid moves return the *same*
 * state object, so callers (e.g. reducers) can cheaply detect a no-op.
 */
export function makeMove(
  state: GameState,
  index: number,
  player?: PlayerId,
): GameState {
  if (getMoveError(state, index, player) !== null) return state;

  const board = state.board.slice();
  board[index] = state.currentPlayer;
  const { outcome, winningLine } = evaluateBoard(board);

  return {
    ...state,
    board,
    outcome,
    winningLine,
    currentPlayer:
      outcome === null ? otherPlayer(state.currentPlayer) : state.currentPlayer,
  };
}

/** Starts the next round; the previous round's second player goes first. */
export function nextRound(state: GameState): GameState {
  return createGame(otherPlayer(state.startingPlayer));
}
