import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Tenant-scoped access: every query runs with the caller's tenant set, enforced by RLS.
export function forUser(userId: string) {
  return {
    query: async (sql: string, params: unknown[]) => {
      const client = await pool.connect();
      try {
        await client.query('set local "app.tenant_id" = $1', [userId]);
        return await client.query(sql, params);
      } finally {
        client.release();
      }
    },
  };
}
