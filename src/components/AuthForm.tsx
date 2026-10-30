"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions";
import Logo from "./Logo";

type Props = {
  title: string;
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  altHref: string;
  altLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  confirmPassword?: boolean;
};

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function PasswordField({
  label,
  name,
  autoComplete,
  visible,
  onToggle,
}: {
  label: string;
  name: string;
  autoComplete: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-muted">
      {label}
      <span className="relative block">
        <input
          className={`${input} pr-11`}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-muted transition hover:text-foreground"
        >
          <EyeIcon off={visible} />
        </button>
      </span>
    </label>
  );
}

export default function AuthForm({
  title,
  action,
  submitLabel,
  altHref,
  altLabel,
  passwordAutoComplete,
  confirmPassword = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [visible, setVisible] = useState(false);
  const toggle = () => setVisible((v) => !v);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-6 flex justify-center">
        <Logo className="text-lg" />
      </div>
      <div className="rounded-3xl border border-border bg-card/90 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
        <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
        <form action={formAction} className="grid gap-5">
          <label className="grid gap-1.5 text-sm text-muted">
            Username
            <input className={input} name="username" autoComplete="username" required />
          </label>
          <PasswordField
            label="Password"
            name="password"
            autoComplete={passwordAutoComplete}
            visible={visible}
            onToggle={toggle}
          />
          {confirmPassword && (
            <PasswordField
              label="Confirm password"
              name="confirmPassword"
              autoComplete="new-password"
              visible={visible}
              onToggle={toggle}
            />
          )}
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
