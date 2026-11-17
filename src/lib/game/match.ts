import { createGame, makeMove, nextRound } from "./engine";
import type { GameState, Outcome, Players, Score } from "./types";

/**
 * A match is a series of rounds between the same two players.
 * This reducer powers both the local and the vs-computer modes;
 * online games keep the authoritative copy of this data in Postgres.
 */
export type MatchState = {
  readonly players: Players;
  readonly game: GameState;
  readonly score: Score;
};

export type MatchAction =
  | { type: "move"; index: number }
  | { type: "next-round" }
  | { type: "restart-round" }
  | { type: "reset-scores" };

export const EMPTY_SCORE: Score = { player1: 0, player2: 0, draws: 0 };

export function createMatch(
  players: Players,
  startingPlayer: GameState["startingPlayer"] = "player1",
): MatchState {
  return { players, game: createGame(startingPlayer), score: EMPTY_SCORE };
}

export function addResult(score: Score, outcome: Outcome): Score {
  if (outcome === "draw") return { ...score, draws: score.draws + 1 };
  return { ...score, [outcome]: score[outcome] + 1 };
}

export function totalGames(score: Score): number {
  return score.player1 + score.player2 + score.draws;
}

/** Win rate as a whole percentage, or `null` before any game is played. */
export function winRate(score: Score, player: keyof Omit<Score, "draws">): number | null {
  const total = totalGames(score);
  return total === 0 ? null : Math.round((score[player] / total) * 100);
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case "move": {
      const game = makeMove(state.game, action.index);
      if (game === state.game) return state; // illegal move: ignore
      const score = game.outcome ? addResult(state.score, game.outcome) : state.score;
      return { ...state, game, score };
    }
    case "next-round":
      return { ...state, game: nextRound(state.game) };
    case "restart-round":
      // Abandon the current board without scoring it; same player starts.
      return { ...state, game: createGame(state.game.startingPlayer) };
    case "reset-scores":
      return { ...state, score: EMPTY_SCORE, game: createGame(state.game.startingPlayer) };
  }
}
