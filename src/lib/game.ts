export type Cell = "X" | "O" | null;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function winningLine(board: Cell[]): number[] | null {
  return LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]) ?? null;
}

export function winner(board: Cell[]): "X" | "O" | null {
  const line = winningLine(board);
  return line ? board[line[0]] : null;
}

export function isDraw(board: Cell[]): boolean {
  return !winner(board) && board.every(Boolean);
}

// Minimax score from O's (the bot's) point of view: +1 O wins, -1 X wins, 0 draw.
// Depth is subtracted so the bot prefers quick wins and slow losses.
function minimax(board: Cell[], turn: "X" | "O", depth: number): number {
  const w = winner(board);
  if (w) return w === "O" ? 10 - depth : depth - 10;
  if (board.every(Boolean)) return 0;

  const scores = emptyCells(board).map((i) => {
    const next = board.slice();
    next[i] = turn;
    return minimax(next, turn === "X" ? "O" : "X", depth + 1);
  });
  return turn === "O" ? Math.max(...scores) : Math.min(...scores);
}

export function emptyCells(board: Cell[]): number[] {
  return board.flatMap((c, i) => (c ? [] : [i]));
}

export function bestMove(board: Cell[]): number {
  let best = -Infinity;
  let move = -1;
  for (const i of emptyCells(board)) {
    const next = board.slice();
    next[i] = "O";
    const score = minimax(next, "X", 1);
    if (score > best) {
      best = score;
      move = i;
    }
  }
  return move;
}

// The deliberate flaw: with probability `mistakeRate` the bot ignores minimax and
// plays a random empty cell, so a human can win. `rng` is injectable for tests.
export const MISTAKE_RATE = 0.3;

export function botMove(
  board: Cell[],
  rng: () => number = Math.random,
  mistakeRate: number = MISTAKE_RATE,
): number {
  const open = emptyCells(board);
  if (rng() < mistakeRate) return open[Math.floor(rng() * open.length)];
  return bestMove(board);
}
