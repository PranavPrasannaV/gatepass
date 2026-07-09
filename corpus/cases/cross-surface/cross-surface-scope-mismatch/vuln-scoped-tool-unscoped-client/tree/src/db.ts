import { Pool } from "pg";

// Unscoped admin pool: no row-level security, full table access across tenants.
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  application_name: "reports-admin",
});
