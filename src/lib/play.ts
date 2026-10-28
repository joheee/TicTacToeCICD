"use server";

import { eq, sql } from "drizzle-orm";
import { getUser } from "./auth";
import { db } from "./db";
import { botMove, emptyCells, isDraw, winner, type Cell } from "./game";
import { users } from "./schema";

export type Score = { wins: number; losses: number; draws: number };
export type PlayResult = {
  board: Cell[];
  outcome: "win" | "loss" | "draw" | null;
  score?: Score;
  error?: string;
};

// The human is X and moves first; the bot is O. The client sends the board it
// believes it has, the server checks it is a legal position and replies with the
// next one. Scores are only written here, never by the client.
export async function playMove(board: Cell[], index: number): Promise<PlayResult> {
  const user = await getUser();
  if (!user) return { board, outcome: null, error: "Not signed in." };

  const valid =
    Array.isArray(board) &&
    board.length === 9 &&
    board.every((c) => c === null || c === "X" || c === "O") &&
    board.filter((c) => c === "X").length === board.filter((c) => c === "O").length &&
    !winner(board) &&
    emptyCells(board).includes(index);
  if (!valid) return { board, outcome: null, error: "Invalid move." };

  const next = board.slice();
  next[index] = "X";
  if (!winner(next) && !isDraw(next)) next[botMove(next)] = "O";

  const w = winner(next);
  const outcome = w === "X" ? "win" : w === "O" ? "loss" : isDraw(next) ? "draw" : null;
  if (!outcome) return { board: next, outcome };

  const field = { win: "wins", loss: "losses", draw: "draws" }[outcome] as keyof Score;
  const [score] = await db
    .update(users)
    .set({ [field]: sql`${users[field]} + 1` })
    .where(eq(users.id, user.id))
    .returning({ wins: users.wins, losses: users.losses, draws: users.draws });
  return { board: next, outcome, score };
}
