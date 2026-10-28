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

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function AuthForm({ title, action, submitLabel, altHref, altLabel, passwordAutoComplete }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <p className="mb-6 text-center font-mono text-sm text-accent">tic-tac-toe</p>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20 sm:p-8">
        <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
        <form action={formAction} className="grid gap-5">
          <label className="grid gap-1.5 text-sm text-muted">
            Username
            <input className={input} name="username" autoComplete="username" required />
          </label>
          <label className="grid gap-1.5 text-sm text-muted">
            Password
            <input className={input} name="password" type="password" autoComplete={passwordAutoComplete} required />
          </label>
          {state.error && (
            <p role="alert" className="rounded-lg border border-err/30 bg-err/10 px-3 py-2 text-sm text-err">
              {state.error}
            </p>
          )}
          <button
            disabled={pending}
            className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Please wait…" : submitLabel}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href={altHref} className="text-accent underline-offset-4 hover:underline">
          {altLabel}
        </Link>
      </p>
    </main>
  );
}
