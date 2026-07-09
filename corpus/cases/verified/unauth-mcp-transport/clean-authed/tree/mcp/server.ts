import { McpServer } from "@modelcontextprotocol/sdk";
import { requireBearerToken } from "./auth.js";

const server = new McpServer({ name: "reports", version: "1.0.0" });

server.use(requireBearerToken(process.env.MCP_TOKEN));

server.tool("get_report", async ({ id }) => {
  return await db.reports.find(id);
});

// Network transport, but authorization middleware verifies a bearer token first.
server.listen({ host: "0.0.0.0", port: 8080, transport: "sse" });
