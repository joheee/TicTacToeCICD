import { describe, expect, it } from "vitest";
import { bestMove, botMove, isDraw, outcomeOf, winner, type Cell } from "./game";

const empty = (): Cell[] => Array(9).fill(null);

describe("game", () => {
  it("has no winner on an empty board", () => {
    expect(winner(empty())).toBeNull();
  });

  it("detects a row win", () => {
    const b = empty();
    b[0] = b[1] = b[2] = "X";
    expect(winner(b)).toBe("X");
  });

  it("detects a diagonal win", () => {
    const b = empty();
    b[2] = b[4] = b[6] = "O";
    expect(winner(b)).toBe("O");
  });

  it("detects a draw", () => {
    const b: Cell[] = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
    expect(winner(b)).toBeNull();
    expect(isDraw(b)).toBe(true);
  });

  it("bot takes a winning move", () => {
    const b = empty();
    b[0] = b[1] = "O";
    b[3] = b[4] = "X";
    expect(bestMove(b)).toBe(2);
  });

  it("bot blocks the human's win", () => {
    const b = empty();
    b[0] = b[1] = "X";
    b[4] = "O";
    expect(bestMove(b)).toBe(2);
  });

  it("perfect bot never loses against any human line of play", () => {
    const explore = (board: Cell[]): void => {
      expect(winner(board)).not.toBe("X");
      if (winner(board) || isDraw(board)) return;
      for (let i = 0; i < 9; i++) {
        if (board[i]) continue;
        const afterHuman = board.slice();
        afterHuman[i] = "X";
        if (winner(afterHuman) || isDraw(afterHuman)) return explore(afterHuman);
        const afterBot = afterHuman.slice();
        afterBot[bestMove(afterHuman)] = "O";
        explore(afterBot);
      }
    };
    explore(empty());
  });

  it("bot plays a random open cell when the rng triggers a mistake", () => {
    const b = empty();
    b[0] = b[1] = "X";
    b[4] = "O";
    const rolls = [0, 0.99]; // 0 < mistakeRate -> mistake; 0.99 -> last open cell (8), not the block at 2
    expect(botMove(b, () => rolls.shift()!, 0.3)).toBe(8);
  });

  it("bot plays the best move when the rng does not trigger a mistake", () => {
    const b = empty();
    b[0] = b[1] = "X";
    b[4] = "O";
    expect(botMove(b, () => 0.99, 0.3)).toBe(2);
  });

  it("reports the outcome from the human's side, or null mid-game", () => {
    const x: Cell[] = ["X", "X", "X", "O", "O", null, null, null, null];
    const o: Cell[] = ["O", "O", "O", "X", "X", null, "X", null, null];
    const d: Cell[] = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
    expect(outcomeOf(x)).toBe("win");
    expect(outcomeOf(o)).toBe("loss");
    expect(outcomeOf(d)).toBe("draw");
    expect(outcomeOf(empty())).toBeNull();
  });
});
