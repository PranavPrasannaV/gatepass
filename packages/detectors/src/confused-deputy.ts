import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";
import { lineAtIndex } from "@gatepass/engine";

/**
 * Research-tier detector: confused-deputy. An MCP/agent handler that forwards an INBOUND
 * credential (the caller's authorization / token) to an OUTBOUND request — or uses an
 * ambient privileged token to act on a caller-supplied target — lets the caller borrow the
 * server's authority. Semantic inference → research-tier with confidence.
 */

const OUTBOUND = /(fetch\s*\(|axios\.(get|post|put|delete|request)\s*\(|https?\.request\s*\(|got\s*\()/i;
const INBOUND_AUTH =
  /(req\.headers?\.authorization|headers?\[["']authorization["']\]|ctx\.(auth|token)|incoming(Auth|Token)|request\.headers?\.authorization)/i;
const FORWARDS_AUTH =
  /(authorization\s*[:=][^,\n}]*(req|ctx|incoming|request|caller))|(headers?\s*[:=][^)]*authorization[^)]*(req|ctx|incoming))|forward\w*\s*\(?\s*(auth|token)/i;
const AMBIENT_PRIVILEGE = /(service_role|admin[_-]?token|root[_-]?token|process\.env\.\w*(ADMIN|SERVICE|ROOT)\w*)/i;
const CALLER_TARGET = /(params?\.(url|endpoint|target|host|uri)|args?\.(url|endpoint|target|host|uri))/i;

export const confusedDeputyDetector: Detector = {
  classIds: ["confused-deputy"],
  tier: "research",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      if (!(file.surfaces.includes("mcp_server") || file.surfaces.includes("agent_code"))) continue;
      const content = file.content;
      const hasOutbound = OUTBOUND.test(content);
      if (!hasOutbound) continue;

      // Forwarding signal: the handler reads the caller's inbound authorization AND the
      // outbound call carries an authorization header. A legitimate own-token call reads
      // process.env (no inbound auth), so this discriminates without tracking variable names.
      const outboundAuthHeader = /headers?\s*[:=]\s*\{[^}]*authorization/i.test(content);
      const forwardsInboundAuth = INBOUND_AUTH.test(content) && (FORWARDS_AUTH.test(content) || outboundAuthHeader);
      const ambientOnCallerTarget = AMBIENT_PRIVILEGE.test(content) && CALLER_TARGET.test(content);
      if (!forwardsInboundAuth && !ambientOnCallerTarget) continue;

      // Anchor the finding at the outbound call line.
      const m = OUTBOUND.exec(content);
      const line = m ? lineAtIndex(content, m.index) : 1;
      const reason = ambientOnCallerTarget
        ? "uses an ambient privileged credential to call a caller-supplied target"
        : "forwards the caller's inbound authorization to an outbound request";
      findings.push({
        tier: "research",
        classId: "confused-deputy",
        severity: "high",
        surfaces: file.surfaces,
        locations: [
          {
            path: file.relPath,
            startLine: line,
            endLine: line,
            surface: file.surfaces.includes("mcp_server") ? "mcp_server" : "agent_code",
          },
        ],
        explanation:
          `${file.relPath}:${line} ${reason}. The server acts as a confused deputy — the caller borrows ` +
          `its authority to reach resources they should not. Scope outbound calls to the caller's own ` +
          `permissions and validate targets against an allow-list.`,
        confidence: ambientOnCallerTarget ? 0.66 : 0.6,
      });
    }
    return findings;
  },
};
