"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "./auth";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

export type FormState = { error?: string };

function readCredentials(form: FormData) {
  return {
    username: String(form.get("username") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  };
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const { username, password } = readCredentials(form);
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "Username must be 3-20 characters: letters, numbers, underscore." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== String(form.get("confirmPassword") ?? "")) return { error: "Passwords do not match." };

  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(users)
    .values({ username, passwordHash })
    .onConflictDoNothing({ target: users.username })
    .returning({ id: users.id });
  if (!created) return { error: "That username is taken." };

  await createSession(created.id);
  redirect("/game");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const { username, password } = readCredentials(form);
  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid username or password." };
  }
  await createSession(user.id);
  redirect("/game");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
