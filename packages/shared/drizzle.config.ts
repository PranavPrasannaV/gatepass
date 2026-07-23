import { defineConfig } from "drizzle-kit";

/** Migrations are generated from db/schema.ts — the schema PgStore actually queries. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/drizzle",
});
