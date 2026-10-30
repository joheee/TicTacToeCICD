"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "./auth";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { minutes, recordHit, reset, retryAfter } from "./rateLimit";
import { users } from "./schema";

export type FormState = { error?: string };

// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected instead of silently cut.
const MAX_PASSWORD_BYTES = 72;

// A real hash of a random string. Login compares against it when the username does not exist, so a
// missing user costs the same time as a wrong password and response time does not reveal usernames.
const DUMMY_HASH = "$2a$10$.92R.g6RgF1FKus2vEuTPOX7tDMvXKVD0ye1pP9NJfEe/oribceoq";

const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_PER_IP = 10;
const LOGIN_MAX_PER_USER = 10;
const REGISTER_WINDOW_MS = 60 * 60_000;
const REGISTER_MAX_PER_IP = 10;

function readCredentials(form: FormData) {
  return {
    username: String(form.get("username") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  };
}

// Caddy puts the real client address first in X-Forwarded-For (it drops any value the client sent), and the
// app port is only published on 127.0.0.1, so nobody can reach the app without going through the proxy.
async function clientIp() {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || "unknown";
}

const tooMany = (seconds: number): FormState => ({
  error: `Too many attempts. Try again in ${minutes(seconds)}.`,
});

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const ipKey = `register:ip:${await clientIp()}`;
  const wait = retryAfter(ipKey, REGISTER_MAX_PER_IP);
  if (wait) return tooMany(wait);
  recordHit(ipKey, REGISTER_WINDOW_MS);

  const { username, password } = readCredentials(form);
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "Username must be 3-20 characters: letters, numbers, underscore." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    return { error: `Password must be at most ${MAX_PASSWORD_BYTES} bytes (about ${MAX_PASSWORD_BYTES} characters).` };
  }
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
  const ipKey = `login:ip:${await clientIp()}`;
  const userKey = `login:user:${username.slice(0, 64)}`;
  const wait = Math.max(retryAfter(ipKey, LOGIN_MAX_PER_IP), retryAfter(userKey, LOGIN_MAX_PER_USER));
  if (wait) return tooMany(wait);

  // Never hash more than bcrypt reads; an oversized password cannot be right.
  const [user] = await db.select().from(users).where(eq(users.username, username));
  const ok =
    Buffer.byteLength(password) <= MAX_PASSWORD_BYTES &&
    (await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)) &&
    !!user;
  if (!user || !ok) {
    recordHit(ipKey, LOGIN_WINDOW_MS);
    recordHit(userKey, LOGIN_WINDOW_MS);
    return { error: "Invalid username or password." };
  }

  reset(userKey);
  await createSession(user.id);
  redirect("/game");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
