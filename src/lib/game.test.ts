import { describe, expect, it } from "vitest";
import { isDraw, winner, type Cell } from "./game";

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
});
