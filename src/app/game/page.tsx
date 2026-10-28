import { redirect } from "next/navigation";
import Board from "@/components/Board";
import { logout } from "@/lib/actions";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <main>
      <h1>Tic-Tac-Toe</h1>
      <p>Signed in as {user.username}</p>
      <Board />
      <form action={logout}>
        <button>Log out</button>
      </form>
    </main>
  );
}
