import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { login } from "@/lib/actions";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getUser()) redirect("/game");
  return (
    <AuthForm
      title="Log in"
      action={login}
      submitLabel="Log in"
      altHref="/register"
      altLabel="Need an account? Register"
      passwordAutoComplete="current-password"
    />
  );
}
