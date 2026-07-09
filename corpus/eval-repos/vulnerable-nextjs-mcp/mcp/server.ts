import { McpServer } from "@modelcontextprotocol/sdk";
import { db } from "../src/db.js";

const server = new McpServer({ name: "acme-reports", version: "1.0.0" });

server.tool("get_user_report", async ({ userId }) => {
  // Tool looks scoped to a single user, but db is an unscoped admin client.
  return await db.query("select * from reports where user_id = $1", [userId]);
});

// No auth middleware; streamable HTTP transport bound to all interfaces.
server.listen({ host: "0.0.0.0", port: 8787, transport: "sse" });
