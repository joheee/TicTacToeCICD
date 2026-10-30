import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { register } from "@/lib/actions";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getUser()) redirect("/game");
  return (
    <AuthForm
      title="Register"
      action={register}
      submitLabel="Create account"
      altHref="/login"
      altLabel="Have an account? Log in"
      passwordAutoComplete="new-password"
      confirmPassword
    />
  );
}
