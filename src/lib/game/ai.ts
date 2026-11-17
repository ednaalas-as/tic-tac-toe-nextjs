import {
  evaluateBoard,
  getAvailableMoves,
  otherPlayer,
  WINNING_LINES,
} from "./engine";
import type { Board, Cell, Difficulty, PlayerId } from "./types";

export type Random = () => number;

const CENTER = 4;
const CORNERS = [0, 2, 6, 8];

function pickRandom<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)];
}

/** A cell that completes three in a row for `player`, if one exists. */
export function findWinningMove(board: Board, player: PlayerId): number | null {
  for (const line of WINNING_LINES) {
    const owned = line.filter((i) => board[i] === player).length;
    const empty = line.filter((i) => board[i] === null);
    if (owned === 2 && empty.length === 1) return empty[0];
  }
  return null;
}

/**
 * EASY — mostly random. One time in four it will notice a move that wins
 * on the spot, so it is not completely brainless, but it never defends.
 */
function chooseEasyMove(board: Board, me: PlayerId, random: Random): number {
  const win = findWinningMove(board, me);
  if (win !== null && random() < 0.25) return win;
  return pickRandom(getAvailableMoves(board), random);
}

/**
 * MEDIUM — plays the obvious things: win if possible, otherwise block,
 * otherwise prefer center, then corners. It "blunders" 20% of the time by
 * skipping the heuristics entirely, which keeps it beatable.
 */
function chooseMediumMove(board: Board, me: PlayerId, random: Random): number {
  const available = getAvailableMoves(board);
  const win = findWinningMove(board, me);
  if (win !== null) return win;

  const block = findWinningMove(board, otherPlayer(me));
  if (block !== null && random() < 0.9) return block;

  if (random() < 0.2) return pickRandom(available, random);

  if (board[CENTER] === null) return CENTER;
  const openCorners = CORNERS.filter((i) => board[i] === null);
  if (openCorners.length > 0) return pickRandom(openCorners, random);
  return pickRandom(available, random);
}

/**
 * Minimax with alpha-beta pruning. Scores are from `me`'s perspective;
 * `depth` makes the AI prefer faster wins and slower losses.
 */
function minimax(
  board: Cell[],
  toMove: PlayerId,
  me: PlayerId,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const { outcome } = evaluateBoard(board);
  if (outcome === me) return 10 - depth;
  if (outcome === "draw") return 0;
  if (outcome !== null) return depth - 10;

  const maximizing = toMove === me;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of getAvailableMoves(board)) {
    board[move] = toMove;
    const score = minimax(board, otherPlayer(toMove), me, depth + 1, alpha, beta);
    board[move] = null;

    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

/** HARD — perfect play. Among equally good moves, picks one at random. */
export function chooseHardMove(
  board: Board,
  me: PlayerId,
  random: Random = Math.random,
): number {
  const scratch = board.slice();
  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  for (const move of getAvailableMoves(board)) {
    scratch[move] = me;
    const score = minimax(scratch, otherPlayer(me), me, 1, -Infinity, Infinity);
    scratch[move] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  return pickRandom(bestMoves, random);
}

/**
 * Picks the computer's next move. Always returns an empty cell index.
 * Throws if the board has no legal moves or the game is already over.
 */
export function chooseComputerMove(
  board: Board,
  me: PlayerId,
  difficulty: Difficulty,
  random: Random = Math.random,
): number {
  if (evaluateBoard(board).outcome !== null) {
    throw new Error("Cannot choose a move: the game is already over.");
  }
  switch (difficulty) {
    case "easy":
      return chooseEasyMove(board, me, random);
    case "medium":
      return chooseMediumMove(board, me, random);
    case "hard":
      return chooseHardMove(board, me, random);
  }
}

export const DIFFICULTY_INFO: Record<
  Difficulty,
  { label: string; description: string }
> = {
  easy: {
    label: "Easy",
    description: "Plays mostly at random. A relaxed warm-up.",
  },
  medium: {
    label: "Medium",
    description: "Takes wins, blocks threats, but slips up now and then.",
  },
  hard: {
    label: "Hard",
    description: "Perfect play with Minimax. The best you can do is draw.",
  },
};
