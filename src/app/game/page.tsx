import { redirect } from "next/navigation";
import Board from "@/components/Board";
import { logout } from "@/lib/actions";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { asc, desc, eq, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [score] = await db
    .select({ wins: users.wins, losses: users.losses, draws: users.draws })
    .from(users)
    .where(eq(users.id, user.id));

  const top = await db
    .select({ username: users.username, wins: users.wins, losses: users.losses })
    .from(users)
    .where(gt(users.wins, 0))
    .orderBy(desc(users.wins), asc(users.losses), asc(users.username))
    .limit(10);

  return (
    <main>
      <h1>Tic-Tac-Toe</h1>
      <p>Signed in as {user.username}</p>
      <div className="game">
        <Board initialScore={score} />
        <aside>
          <h2>Top 10</h2>
          {top.length === 0 ? (
            <p>No wins yet.</p>
          ) : (
            <ol>
              {top.map((u) => (
                <li key={u.username}>
                  {u.username} — {u.wins}W / {u.losses}L
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
      <form action={logout}>
        <button>Log out</button>
      </form>
    </main>
  );
}
