import { Pool } from "pg";

// Unscoped admin connection — no row-level security, full table access.
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  application_name: "acme-admin",
});
