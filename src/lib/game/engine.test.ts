import { describe, expect, it } from "vitest";
import {
  createGame,
  evaluateBoard,
  getMoveError,
  makeMove,
  nextRound,
  WINNING_LINES,
} from "./engine";
import type { Board, Cell, GameState } from "./types";

/** Builds a board from a 9-char string: "1", "2" or "." per cell. */
function board(layout: string): Board {
  return layout
    .replace(/\s/g, "")
    .split("")
    .map<Cell>((c) => (c === "1" ? "player1" : c === "2" ? "player2" : null));
}

function play(moves: number[], start: GameState = createGame()): GameState {
  return moves.reduce((state, index) => makeMove(state, index), start);
}

describe("evaluateBoard", () => {
  it.each(WINNING_LINES.map((line) => [line.join("-"), line]))(
    "detects a win on line %s",
    (_name, line) => {
      const cells: Cell[] = Array(9).fill(null);
      line.forEach((i) => (cells[i] = "player2"));
      expect(evaluateBoard(cells)).toEqual({ outcome: "player2", winningLine: line });
    },
  );

  it("covers exactly 3 rows, 3 columns and 2 diagonals", () => {
    expect(WINNING_LINES).toHaveLength(8);
    const keys = new Set(WINNING_LINES.map((l) => l.join(",")));
    ["0,1,2", "3,4,5", "6,7,8", "0,3,6", "1,4,7", "2,5,8", "0,4,8", "2,4,6"].forEach((k) =>
      expect(keys.has(k)).toBe(true),
    );
  });

  it("detects a draw on a full board with no line", () => {
    expect(evaluateBoard(board("121 112 212"))).toEqual({ outcome: "draw", winningLine: null });
  });

  it("reports an unfinished game", () => {
    expect(evaluateBoard(board("12. ... ...")).outcome).toBeNull();
  });

  it("prefers a win over a draw when the last move fills the board", () => {
    expect(evaluateBoard(board("121 212 111")).outcome).toBe("player1");
  });
});

describe("makeMove", () => {
  it("alternates turns starting with the chosen player", () => {
    let state = createGame("player2");
    expect(state.currentPlayer).toBe("player2");
    state = makeMove(state, 0);
    expect(state.board[0]).toBe("player2");
    expect(state.currentPlayer).toBe("player1");
    state = makeMove(state, 1);
    expect(state.board[1]).toBe("player1");
    expect(state.currentPlayer).toBe("player2");
  });

  it("does not mutate the previous state", () => {
    const before = createGame();
    makeMove(before, 4);
    expect(before.board[4]).toBeNull();
  });

  it("rejects occupied cells", () => {
    const state = makeMove(createGame(), 4);
    expect(getMoveError(state, 4)).toBe("occupied");
    expect(makeMove(state, 4)).toBe(state);
  });

  it("rejects out-of-range and non-integer indices", () => {
    const state = createGame();
    for (const index of [-1, 9, 1.5, Number.NaN]) {
      expect(getMoveError(state, index)).toBe("out-of-range");
      expect(makeMove(state, index)).toBe(state);
    }
  });

  it("rejects a move from the wrong player", () => {
    const state = createGame("player1");
    expect(getMoveError(state, 0, "player2")).toBe("not-your-turn");
    expect(makeMove(state, 0, "player2")).toBe(state);
    expect(makeMove(state, 0, "player1").board[0]).toBe("player1");
  });

  it("records the winner and the winning line", () => {
    // player1: 0, 1, 2 — player2: 3, 4
    const state = play([0, 3, 1, 4, 2]);
    expect(state.outcome).toBe("player1");
    expect(state.winningLine).toEqual([0, 1, 2]);
  });

  it("blocks all moves once the game is over", () => {
    const won = play([0, 3, 1, 4, 2]);
    expect(getMoveError(won, 8)).toBe("game-over");
    expect(makeMove(won, 8)).toBe(won);
  });

  it("detects a draw after nine moves", () => {
    const state = play([0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(state.outcome).toBe("draw");
    expect(state.board.every((c) => c !== null)).toBe(true);
  });
});

describe("nextRound", () => {
  it("clears the board and alternates the starting player", () => {
    const finished = play([0, 3, 1, 4, 2]);
    const fresh = nextRound(finished);
    expect(fresh.board.every((c) => c === null)).toBe(true);
    expect(fresh.outcome).toBeNull();
    expect(fresh.startingPlayer).toBe("player2");
    expect(fresh.currentPlayer).toBe("player2");
    expect(nextRound(fresh).startingPlayer).toBe("player1");
  });
});
