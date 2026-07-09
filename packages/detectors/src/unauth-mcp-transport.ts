import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";

/**
 * Verified detector: an MCP server transport bound to a network interface with no
 * authentication configured anywhere in the server file. Deterministically checkable from
 * the config/impl surface.
 *
 * Auth is detected at file scope (not in a window around the bind) because MCP auth
 * middleware is typically registered once at server setup, often far from `listen()`.
 * Comment lines are excluded — a comment mentioning "auth" does not implement it.
 */

const NETWORK_BIND =
  /(host\s*[:=]\s*['"]?0\.0\.0\.0)|(\.listen\(|createServer\()|(transport\s*[:=]\s*['"]?(sse|http|streamable))/i;

const AUTH_CONSTRUCT =
  /(authorization|bearer|apikey|api_key|requireauth|require_auth|requirebearer|verifytoken|verify_token|\.use\([^)]*auth|middleware.*auth|getToken|\btoken\s*[:(])/i;

function stripComments(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("#"));
    })
    .join("\n");
}

export const unauthMcpTransportDetector: Detector = {
  classIds: ["unauth-mcp-transport"],
  tier: "verified",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      if (!file.surfaces.includes("mcp_server")) continue;

      const codeOnly = stripComments(file.content);
      if (AUTH_CONSTRUCT.test(codeOnly)) continue; // server registers auth somewhere

      const lines = file.content.split(/\r?\n/);
      lines.forEach((text, i) => {
        const trimmed = text.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        if (!NETWORK_BIND.test(text)) return;
        const line = i + 1;
        findings.push({
          tier: "verified",
          classId: "unauth-mcp-transport",
          severity: "high",
          surfaces: file.surfaces,
          locations: [{ path: file.relPath, startLine: line, endLine: line, surface: "mcp_server" }],
          explanation:
            `MCP server transport in ${file.relPath}:${line} is exposed on the network, and no ` +
            `authentication construct is registered anywhere in this server file.`,
          reproduction: {
            kind: "inspection",
            steps: [
              `Open ${file.relPath} at line ${line}.`,
              `Note the network transport binding.`,
              `Search the file for auth/bearer/token middleware — none is present.`,
            ],
            expected: `The MCP transport accepts unauthenticated connections.`,
          },
        });
      });
    }
    return findings;
  },
};
