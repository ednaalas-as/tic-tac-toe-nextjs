/**
 * Core game types.
 *
 * The engine only knows about two stable seats: `player1` and `player2`.
 * Names, symbols and whether a seat is controlled by a human or the computer
 * are presentation concerns layered on top (see `PlayerProfile`).
 */

export type PlayerId = "player1" | "player2";

export type Cell = PlayerId | null;

/** Nine cells, indexed 0–8 left-to-right, top-to-bottom. */
export type Board = readonly Cell[];

export type Outcome = PlayerId | "draw";

export type GameState = {
  readonly board: Board;
  readonly currentPlayer: PlayerId;
  readonly startingPlayer: PlayerId;
  /** `null` while the round is still in progress. */
  readonly outcome: Outcome | null;
  /** Indices of the three winning cells, when there is a winner. */
  readonly winningLine: readonly number[] | null;
};

export type Difficulty = "easy" | "medium" | "hard";

export type PlayerKind = "human" | "computer";

export type PlayerProfile = {
  readonly id: PlayerId;
  readonly name: string;
  /** A symbol id from the symbol library, e.g. "heart". */
  readonly symbol: string;
  readonly kind: PlayerKind;
};

export type Players = Readonly<Record<PlayerId, PlayerProfile>>;

export type Score = {
  readonly player1: number;
  readonly player2: number;
  readonly draws: number;
};

export type GameMode = "computer" | "local" | "online";
