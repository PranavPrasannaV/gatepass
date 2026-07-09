import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";
import { lineAtIndex } from "@gatepass/engine";

/**
 * Cross-surface correlation (Constitution Principle IV, FR-002).
 *
 * The signature finding that single-surface tools cannot see: a tool that PRESENTS as
 * scoped to one tenant/user (its parameters name a userId/tenantId, or its description
 * says "the user's ...") but is backed by an UNSCOPED data client (an admin/service-role
 * pool with no row-level scoping). Neither the tool-definition surface nor the app-code
 * surface alone is a finding — the risk only appears when you read them together.
 *
 * This is a semantic inference, so it is research-tier with a confidence score, and its
 * locations span both surfaces (so `isCrossSurface` legitimately reports true).
 */

interface ScopedTool {
  name: string;
  path: string;
  line: number;
  reason: string;
}

interface UnscopedClient {
  path: string;
  line: number;
  reason: string;
}

const SCOPE_PARAM = /"(user_?id|tenant_?id|org_?id|account_?id|customer_?id)"/i;
const SCOPE_DESC = /(the user'?s|per-user|per-tenant|their own|for a (single )?(user|tenant|customer))/i;
const UNSCOPED_CLIENT =
  /(new\s+Pool\s*\()|(new\s+Client\s*\()|(createClient\s*\([^)]*service_role)|(application_name\s*[:=]\s*["'`][^"'`]*admin)/i;
const SCOPING_GUARD = /(withTenant|forUser|rls|row.?level|set\s+local\s+"?app\.|auth\.uid\(\)|tenant_id\s*=)/i;

function collectScopedTools(ctx: ScanContext): ScopedTool[] {
  const tools: ScopedTool[] = [];
  for (const file of ctx.files) {
    if (!file.surfaces.includes("tool_defs")) continue;
    let parsed: { tools?: { name?: string; description?: string; parameters?: Record<string, unknown> }[] };
    try {
      parsed = JSON.parse(file.content);
    } catch {
      continue;
    }
    for (const tool of parsed.tools ?? []) {
      const raw = JSON.stringify(tool);
      const byParam = SCOPE_PARAM.test(raw);
      const byDesc = tool.description ? SCOPE_DESC.test(tool.description) : false;
      if (!byParam && !byDesc) continue;
      const idx = tool.name ? file.content.indexOf(`"${tool.name}"`) : -1;
      tools.push({
        name: tool.name ?? "(anonymous)",
        path: file.relPath,
        line: idx >= 0 ? lineAtIndex(file.content, idx) : 1,
        reason: byParam ? "takes a tenant-scoped parameter" : "description claims per-user scope",
      });
    }
  }
  return tools;
}

function stripComments(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("#") || t.startsWith("--"));
    })
    .join("\n");
}

function collectUnscopedClients(ctx: ScanContext): UnscopedClient[] {
  const clients: UnscopedClient[] = [];
  for (const file of ctx.files) {
    if (!file.surfaces.includes("app_code")) continue;
    // Check for tenant-scoping constructs in CODE only — a comment mentioning "row-level
    // security" does not implement it.
    if (SCOPING_GUARD.test(stripComments(file.content))) continue;
    const lines = file.content.split(/\r?\n/);
    lines.forEach((text, i) => {
      if (UNSCOPED_CLIENT.test(text)) {
        clients.push({ path: file.relPath, line: i + 1, reason: text.trim().slice(0, 80) });
      }
    });
  }
  return clients;
}

export const crossSurfaceScopeDetector: Detector = {
  classIds: ["cross-surface-scope-mismatch"],
  tier: "research",
  run(ctx: ScanContext): DetectorFinding[] {
    const scopedTools = collectScopedTools(ctx);
    const unscopedClients = collectUnscopedClients(ctx);
    if (scopedTools.length === 0 || unscopedClients.length === 0) return [];

    const findings: DetectorFinding[] = [];
    // Correlate each scoped tool with each unscoped client in the same scan.
    for (const tool of scopedTools) {
      for (const client of unscopedClients) {
        // Confidence: param-based scope signal is stronger than description-based.
        const confidence = tool.reason.startsWith("takes") ? 0.68 : 0.55;
        findings.push({
          tier: "research",
          classId: "cross-surface-scope-mismatch",
          severity: "high",
          surfaces: ["tool_defs", "app_code"],
          locations: [
            { path: tool.path, startLine: tool.line, endLine: tool.line, surface: "tool_defs" },
            { path: client.path, startLine: client.line, endLine: client.line, surface: "app_code" },
          ],
          explanation:
            `Tool "${tool.name}" (${tool.path}:${tool.line}) ${tool.reason}, but it is backed by an ` +
            `unscoped data client (${client.path}:${client.line}). The tool looks tenant-safe while the ` +
            `client can read across all tenants — a mismatch only visible across both surfaces.`,
          confidence,
        });
      }
    }
    return findings;
  },
};
