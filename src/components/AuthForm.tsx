"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/actions";

type Props = {
  title: string;
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  altHref: string;
  altLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
};

export default function AuthForm({ title, action, submitLabel, altHref, altLabel, passwordAutoComplete }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <main>
      <h1>{title}</h1>
      <form action={formAction}>
        <label>
          Username
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete={passwordAutoComplete} required />
        </label>
        {state.error && <p role="alert" className="error">{state.error}</p>}
        <button disabled={pending}>{submitLabel}</button>
      </form>
      <p><Link href={altHref}>{altLabel}</Link></p>
    </main>
  );
}
