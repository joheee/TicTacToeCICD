import { redirect } from "next/navigation";
import Board from "@/components/Board";
import Logo from "@/components/Logo";
import { logout } from "@/lib/actions";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { asc, desc, eq, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function GamePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [{ currentBoard, ...score }] = await db
    .select({ wins: users.wins, losses: users.losses, draws: users.draws, currentBoard: users.currentBoard })
    .from(users)
    .where(eq(users.id, user.id));

  const top = await db
    .select({ username: users.username, wins: users.wins, losses: users.losses })
    .from(users)
    .where(gt(users.wins, 0))
    .orderBy(desc(users.wins), asc(users.losses), asc(users.username))
    .limit(10);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Logo />
          <h1 className="mt-1 text-2xl font-semibold leading-tight">Tic-Tac-Toe</h1>
          <p className="text-sm text-muted">
            Signed in as <span className="font-mono text-accent">{user.username}</span>
          </p>
        </div>
        <form action={logout}>
          <button className="cursor-pointer rounded-xl border border-border px-3.5 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground">
            Log out
          </button>
        </form>
      </header>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,26rem)_1fr] lg:grid-cols-[minmax(0,30rem)_1fr]">
        <Board initialScore={score} initialBoard={currentBoard} />
        <aside className="rounded-3xl border border-border bg-card/90 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden>🏆</span> Top 10
          </h2>
          {top.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              No wins yet. Be the first!
            </p>
          ) : (
            <ol className="grid gap-2">
              {top.map((u, i) => (
                <li
                  key={u.username}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
                    u.username === user.username
                      ? "bg-accent/15 ring-1 ring-accent/50"
                      : "bg-background/70 hover:bg-background"
                  }`}
                >
                  <span className="w-6 text-center font-mono text-muted">{MEDALS[i] ?? i + 1}</span>
                  <span className="flex-1 truncate font-medium">{u.username}</span>
                  <span className="font-mono tabular-nums text-ok">{u.wins}W</span>
                  <span className="font-mono tabular-nums text-muted">{u.losses}L</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </main>
  );
}
