import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = process.env.APP_VERSION ?? "dev";
  // Demo switch for the rollback recording (deploy.yml "break_health"); never set in normal builds.
  if (process.env.FORCE_UNHEALTHY === "1") {
    return NextResponse.json({ status: "error", reason: "forced", version }, { status: 503 });
  }
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "up", version });
  } catch {
    return NextResponse.json({ status: "error", db: "down", version }, { status: 503 });
  }
}
