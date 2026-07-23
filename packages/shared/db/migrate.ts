import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { loadDotEnv } from "../src/index.js";

/**
 * Apply generated migrations (db/drizzle) to DATABASE_URL. Drizzle tracks applied
 * migrations in __drizzle_migrations, so re-running is a no-op.
 *
 *   pnpm db:migrate
 */

const HERE = dirname(fileURLToPath(import.meta.url));
loadDotEnv(".env");
loadDotEnv(resolve(HERE, "..", "..", "..", ".env"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (env or .env). Aborting.");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: resolve(HERE, "drizzle") });
  console.log("Migrations applied.");
} finally {
  await client.end();
}
