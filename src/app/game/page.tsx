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
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tic-Tac-Toe</h1>
          <p className="text-sm text-muted">
            Signed in as <span className="font-mono text-accent">{user.username}</span>
          </p>
        </div>
        <form action={logout}>
          <button className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground">
            Log out
          </button>
        </form>
      </header>

      <div className="grid items-start gap-6 md:grid-cols-[auto_1fr]">
        <Board initialScore={score} />
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/20 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">Top 10</h2>
          {top.length === 0 ? (
            <p className="text-sm text-muted">No wins yet. Be the first!</p>
          ) : (
            <ol className="grid gap-1.5">
              {top.map((u, i) => (
                <li
                  key={u.username}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    u.username === user.username ? "bg-accent/15 ring-1 ring-accent/40" : "bg-background"
                  }`}
                >
                  <span className="w-5 font-mono text-muted">{i + 1}</span>
                  <span className="flex-1 truncate">{u.username}</span>
                  <span className="font-mono text-ok">{u.wins}W</span>
                  <span className="font-mono text-muted">{u.losses}L</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </main>
  );
}
