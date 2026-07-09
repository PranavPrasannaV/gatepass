import { McpServer } from "@modelcontextprotocol/sdk";

const server = new McpServer({ name: "reports", version: "1.0.0" });

server.tool("get_report", async ({ id }) => {
  return await db.reports.find(id);
});

// Exposed on all interfaces, streamable HTTP transport, no auth configured.
server.listen({ host: "0.0.0.0", port: 8080, transport: "sse" });
