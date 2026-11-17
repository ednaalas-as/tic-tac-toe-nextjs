import { describe, expect, it } from "vitest";
import { chooseComputerMove, chooseHardMove, findWinningMove } from "./ai";
import { createGame, evaluateBoard, getAvailableMoves, makeMove, otherPlayer } from "./engine";
import type { Board, Cell, Difficulty, GameState, PlayerId } from "./types";

function board(layout: string): Board {
  return layout
    .replace(/\s/g, "")
    .split("")
    .map<Cell>((c) => (c === "1" ? "player1" : c === "2" ? "player2" : null));
}

/** Deterministic pseudo-random generator so tests are reproducible. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const always = (value: number) => () => value;

describe("all difficulties", () => {
  const difficulties: Difficulty[] = ["easy", "medium", "hard"];

  it.each(difficulties)("%s only ever picks empty cells", (difficulty) => {
    const random = seeded(42);
    for (let game = 0; game < 200; game++) {
      let state: GameState = createGame(game % 2 ? "player1" : "player2");
      while (state.outcome === null) {
        const move = chooseComputerMove(state.board, state.currentPlayer, difficulty, random);
        expect(state.board[move]).toBeNull();
        state = makeMove(state, move);
      }
    }
  });

  it.each(difficulties)("%s refuses to move after the game is over", (difficulty) => {
    const finished = board("111 22. ...");
    expect(() => chooseComputerMove(finished, "player2", difficulty)).toThrow(/over/);
  });
});

describe("easy", () => {
  it("is random: it does not always block an obvious threat", () => {
    // player1 threatens 0-1-2; easy (player2) should often ignore it.
    const threat = board("11. 2.. ...");
    const picks = new Set<number>();
    const random = seeded(7);
    for (let i = 0; i < 100; i++) picks.add(chooseComputerMove(threat, "player2", "easy", random));
    expect(picks.size).toBeGreaterThan(3);
  });

  it("sometimes takes an immediate win", () => {
    const winnable = board("22. 11. ...");
    expect(chooseComputerMove(winnable, "player2", "easy", always(0.1))).toBe(2);
  });
});

describe("medium", () => {
  it("takes an immediate win", () => {
    expect(chooseComputerMove(board("22. 11. ...") , "player2", "medium", always(0.5))).toBe(2);
  });

  it("blocks the opponent's winning line", () => {
    expect(chooseComputerMove(board("11. 2.. ...") , "player2", "medium", always(0.5))).toBe(2);
    expect(chooseComputerMove(board("1.. 12. ...") , "player2", "medium", always(0.5))).toBe(6);
  });

  it("prefers the center on an open board", () => {
    expect(chooseComputerMove(board("1.. ... ..."), "player2", "medium", always(0.5))).toBe(4);
  });

  it("occasionally makes an imperfect choice", () => {
    // With a low random roll it skips the center heuristic.
    const move = chooseComputerMove(board("1.. ... ..."), "player2", "medium", always(0.05));
    expect(move).not.toBe(4);
  });
});

describe("hard (minimax)", () => {
  it("wins when it can", () => {
    expect(chooseHardMove(board("22. 11. 1..") , "player2")).toBe(2);
  });

  it("blocks when it must", () => {
    expect(chooseHardMove(board("1.. .1. 2..") , "player2")).toBe(8);
  });

  it("answers a corner opening with the center", () => {
    for (const corner of [0, 2, 6, 8]) {
      const b: Cell[] = Array(9).fill(null);
      b[corner] = "player1";
      expect(chooseHardMove(b, "player2", seeded(corner))).toBe(4);
    }
  });

  it("finds a fork-defending move (not a corner) against the double-corner setup", () => {
    // player1 has opposite corners; player2 holds the center. A corner reply loses.
    const move = chooseHardMove(board("1.. .2. ..1"), "player2", seeded(1));
    expect([1, 3, 5, 7]).toContain(move);
  });

  /**
   * Exhaustive proof: explore every possible sequence of human moves against
   * the hard AI, with either side starting. The human must never win.
   */
  it.each<PlayerId>(["player1", "player2"])(
    "never loses against any line of play (%s starts)",
    (starter) => {
      const ai: PlayerId = "player2";
      let gamesExplored = 0;

      function explore(state: GameState) {
        if (state.outcome !== null) {
          gamesExplored++;
          expect(state.outcome).not.toBe(otherPlayer(ai));
          return;
        }
        if (state.currentPlayer === ai) {
          explore(makeMove(state, chooseHardMove(state.board, ai, () => 0)));
        } else {
          for (const move of getAvailableMoves(state.board)) explore(makeMove(state, move));
        }
      }

      explore(createGame(starter));
      expect(gamesExplored).toBeGreaterThan(50);
    },
  );
});

describe("findWinningMove", () => {
  it("returns null when there is no immediate win", () => {
    expect(findWinningMove(board("1.. .2. ..."), "player1")).toBeNull();
  });

  it("works for every line", () => {
    expect(findWinningMove(board("1.. 1.. ..."), "player1")).toBe(6);
    expect(findWinningMove(board("2.. ... ..2"), "player2")).toBe(4);
    expect(evaluateBoard(board("1.. 1.. 1..")).outcome).toBe("player1");
  });
});
