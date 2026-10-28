"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUser } from "./auth";
import { db } from "./db";
import { botMove, emptyCells, isDraw, outcomeOf, winner, type Cell } from "./game";
import { games, users } from "./schema";

export type Score = { wins: number; losses: number; draws: number };
export type PlayResult = {
  board: Cell[];
  outcome: "win" | "loss" | "draw" | null;
  score?: Score;
  error?: string;
};

// The human is X and moves first; the bot is O. The client sends the board it
// believes it has, the server checks it is a legal position and replies with the
// next one. Scores and finished games are only written here, never by the client.
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

  const outcome = outcomeOf(next);
  if (!outcome) {
    await db.update(users).set({ currentBoard: next }).where(eq(users.id, user.id));
    return { board: next, outcome };
  }

  const field = { win: "wins", loss: "losses", draw: "draws" }[outcome] as keyof Score;
  const score = await db.transaction(async (tx) => {
    await tx.insert(games).values({ userId: user.id, board: next, outcome });
    const [updated] = await tx
      .update(users)
      .set({ [field]: sql`${users[field]} + 1`, currentBoard: next })
      .where(eq(users.id, user.id))
      .returning({ wins: users.wins, losses: users.losses, draws: users.draws });
    return updated;
  });
  revalidatePath("/game"); // refresh the leaderboard
  return { board: next, outcome, score };
}

// The only place the saved board is cleared, so a refresh or re-login shows the
// last game (finished or not) until the player asks for a new one.
export async function newGame() {
  const user = await getUser();
  if (user) await db.update(users).set({ currentBoard: null }).where(eq(users.id, user.id));
}
