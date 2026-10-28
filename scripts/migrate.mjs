// Applies the Drizzle migrations in migrations/ before the app starts.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  // Advisory lock so two deploys can never migrate at the same time.
  await client.query("SELECT pg_advisory_lock(727274)");
  await migrate(drizzle(client), { migrationsFolder });
  console.log("migrations up to date");
} finally {
  await client.end();
}
