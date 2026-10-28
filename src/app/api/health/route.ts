import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = process.env.APP_VERSION ?? "dev";
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "up", version });
  } catch {
    return NextResponse.json({ status: "error", db: "down", version }, { status: 503 });
  }
}
