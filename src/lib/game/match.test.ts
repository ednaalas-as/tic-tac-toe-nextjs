import { describe, expect, it } from "vitest";
import { appendHistory, describeOutcome, MAX_HISTORY, type HistoryEntry } from "./history";
import { createMatch, matchReducer, totalGames, winRate, type MatchState } from "./match";
import type { Players } from "./types";

const players: Players = {
  player1: { id: "player1", name: "Ana", symbol: "heart", kind: "human" },
  player2: { id: "player2", name: "Ben", symbol: "star", kind: "human" },
};

function moves(state: MatchState, indices: number[]) {
  return indices.reduce((s, index) => matchReducer(s, { type: "move", index }), state);
}

describe("matchReducer", () => {
  it("credits the win to the player id, not the symbol", () => {
    const state = moves(createMatch(players), [0, 3, 1, 4, 2]);
    expect(state.game.outcome).toBe("player1");
    expect(state.score).toEqual({ player1: 1, player2: 0, draws: 0 });
  });

  it("keeps names and symbols across rounds", () => {
    let state = moves(createMatch(players), [0, 3, 1, 4, 2]);
    state = matchReducer(state, { type: "next-round" });
    expect(state.players).toBe(players);
    expect(state.game.board.every((c) => c === null)).toBe(true);
    expect(state.score.player1).toBe(1);
  });

  it("alternates who starts each round and scores the second round correctly", () => {
    let state = moves(createMatch(players), [0, 3, 1, 4, 2]); // Ana wins
    state = matchReducer(state, { type: "next-round" });
    expect(state.game.currentPlayer).toBe("player2");
    state = moves(state, [0, 3, 1, 4, 2]); // Ben starts and wins
    expect(state.score).toEqual({ player1: 1, player2: 1, draws: 0 });
  });

  it("counts draws", () => {
    const state = moves(createMatch(players), [0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(state.score.draws).toBe(1);
    expect(totalGames(state.score)).toBe(1);
  });

  it("ignores illegal moves without changing state", () => {
    const state = moves(createMatch(players), [4]);
    expect(matchReducer(state, { type: "move", index: 4 })).toBe(state);
    const won = moves(createMatch(players), [0, 3, 1, 4, 2]);
    expect(matchReducer(won, { type: "move", index: 8 })).toBe(won);
  });

  it("restarts an unfinished round without touching the score", () => {
    let state = moves(createMatch(players), [0, 3, 1, 4, 2]);
    state = matchReducer(state, { type: "next-round" });
    state = moves(state, [4, 0]);
    state = matchReducer(state, { type: "restart-round" });
    expect(state.game.board.every((c) => c === null)).toBe(true);
    expect(state.game.currentPlayer).toBe("player2");
    expect(state.score.player1).toBe(1);
  });

  it("resets scores and starts a clean board", () => {
    let state = moves(createMatch(players), [0, 3, 1, 4, 2]);
    state = matchReducer(state, { type: "reset-scores" });
    expect(state.score).toEqual({ player1: 0, player2: 0, draws: 0 });
    expect(state.game.outcome).toBeNull();
  });
});

describe("winRate", () => {
  it("is null before any game and a rounded percentage after", () => {
    expect(winRate({ player1: 0, player2: 0, draws: 0 }, "player1")).toBeNull();
    expect(winRate({ player1: 1, player2: 1, draws: 1 }, "player1")).toBe(33);
  });
});

describe("history", () => {
  const entry = (id: string): HistoryEntry => ({
    id,
    mode: "local",
    finishedAt: 0,
    outcome: "player2",
    players: { player1: { name: "Ana", symbol: "heart" }, player2: { name: "Ben", symbol: "star" } },
  });

  it("adds newest first, de-duplicates and caps the length", () => {
    let history = appendHistory([], entry("a"));
    history = appendHistory(history, entry("b"));
    history = appendHistory(history, entry("b"));
    expect(history.map((e) => e.id)).toEqual(["b", "a"]);
    for (let i = 0; i < 60; i++) history = appendHistory(history, entry(`x${i}`));
    expect(history).toHaveLength(MAX_HISTORY);
  });

  it("describes the outcome with the winner's name", () => {
    expect(describeOutcome(entry("a"))).toBe("Ben won");
    expect(describeOutcome({ ...entry("a"), outcome: "draw" })).toBe("Draw");
  });
});
