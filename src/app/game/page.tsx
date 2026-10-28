import { redirect } from "next/navigation";
import Board from "@/components/Board";
import { logout } from "@/lib/actions";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [score] = await db
    .select({ wins: users.wins, losses: users.losses, draws: users.draws })
    .from(users)
    .where(eq(users.id, user.id));

  return (
    <main>
      <h1>Tic-Tac-Toe</h1>
      <p>Signed in as {user.username}</p>
      <Board initialScore={score} />
      <form action={logout}>
        <button>Log out</button>
      </form>
    </main>
  );
}
