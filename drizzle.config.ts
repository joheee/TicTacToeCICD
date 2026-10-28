import { defineConfig } from "drizzle-kit";

// Only used by `npx drizzle-kit generate` to turn schema changes into SQL files in migrations/.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./migrations",
});
