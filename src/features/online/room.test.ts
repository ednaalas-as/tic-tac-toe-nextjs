import { describe, expect, it } from "vitest";
import { getRematchState, REMATCH_TIMEOUT_MS } from "./rematch";
import { boardFromString, roomToGame, roomToPlayers, roomToScore, seatOf } from "./room";

const baseRoom = {
  board: "11122----",
  current_turn: "player1",
  starting_player: "player1",
  outcome: "player1",
  winning_line: [0, 1, 2],
  player1_name: "Ana",
  player1_symbol: "heart",
  player2_name: "Ben",
  player2_symbol: "star",
  player1_score: 3,
  player2_score: 1,
  draws: 2,
};

describe("room → engine mapping", () => {
  it("decodes the board string into player ids", () => {
    expect(boardFromString("12-------")).toEqual(["player1", "player2", null, null, null, null, null, null, null]);
  });

  it("maps game state, players and score from a room row", () => {
    const game = roomToGame(baseRoom);
    expect(game.outcome).toBe("player1");
    expect(game.winningLine).toEqual([0, 1, 2]);
    expect(roomToPlayers(baseRoom).player2).toMatchObject({ name: "Ben", symbol: "star" });
    expect(roomToScore(baseRoom)).toEqual({ player1: 3, player2: 1, draws: 2 });
  });

  it("finds the caller's seat", () => {
    const room = { player1_id: "u1", player2_id: "u2" };
    expect(seatOf(room, "u1")).toBe("player1");
    expect(seatOf(room, "u2")).toBe("player2");
    expect(seatOf(room, "intruder")).toBeNull();
  });
});

describe("rematch state", () => {
  const now = Date.parse("2026-01-01T00:01:00Z");
  const at = (msAgo: number) => new Date(now - msAgo).toISOString();

  it("shows nothing pending by default", () => {
    expect(getRematchState({ rematch_requested_by: null, rematch_requested_at: null, rematch_declined: false }, "player1", now)).toBe("none");
  });

  it("distinguishes sent and received requests", () => {
    const room = { rematch_requested_by: "player1", rematch_requested_at: at(5000), rematch_declined: false };
    expect(getRematchState(room, "player1", now)).toBe("sent");
    expect(getRematchState(room, "player2", now)).toBe("received");
  });

  it("reports declines to both sides", () => {
    const room = { rematch_requested_by: "player1", rematch_requested_at: at(5000), rematch_declined: true };
    expect(getRematchState(room, "player1", now)).toBe("declined-by-them");
    expect(getRematchState(room, "player2", now)).toBe("declined-by-me");
  });

  it("expires after the timeout", () => {
    const room = { rematch_requested_by: "player2", rematch_requested_at: at(REMATCH_TIMEOUT_MS + 1), rematch_declined: false };
    expect(getRematchState(room, "player1", now)).toBe("expired");
  });
});
