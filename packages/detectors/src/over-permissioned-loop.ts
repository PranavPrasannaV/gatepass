import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";

/**
 * Research-tier detector: over-permissioned autonomous loop. An agent loop that invokes tools
 * with no iteration bound and no scoping can run away with broad authority. Semantic →
 * research-tier with confidence.
 */

const UNBOUNDED_LOOP =
  /(while\s*\(\s*true\s*\))|(while\s*\(\s*!\s*\w*(done|finished|complete)\w*\s*\))|(for\s*\(\s*;\s*;\s*\))/i;
const TOOL_CALL =
  /(agent\.run|runtool|calltool|executetool|invoke(tool|agent)?|tools?\.\w+\s*\(|llm\.(run|call|complete))/i;
const BOUND = /(max[_-]?iter|max[_-]?steps?|iteration\s*[<>]=?|step\s*[<>]=?|budget|\bbreak\b|\breturn\b|maxturns)/i;

export const overPermissionedLoopDetector: Detector = {
  classIds: ["over-permissioned-loop"],
  tier: "research",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      if (!(file.surfaces.includes("agent_code") || file.surfaces.includes("mcp_server"))) continue;
      const lines = file.content.split(/\r?\n/);
      lines.forEach((text, i) => {
        if (!UNBOUNDED_LOOP.test(text)) return;
        // Inspect the loop body window for a tool invocation with no bound/break.
        const body = lines.slice(i, Math.min(lines.length, i + 25)).join("\n");
        if (!TOOL_CALL.test(body)) return;
        if (BOUND.test(body)) return; // has a break / max-iteration / budget guard
        const line = i + 1;
        findings.push({
          tier: "research",
          classId: "over-permissioned-loop",
          severity: "high",
          surfaces: file.surfaces,
          locations: [
            {
              path: file.relPath,
              startLine: line,
              endLine: line,
              surface: file.surfaces.includes("agent_code") ? "agent_code" : "mcp_server",
            },
          ],
          explanation:
            `${file.relPath}:${line} runs an unbounded agent loop that invokes tools with no iteration ` +
            `limit or break condition. An autonomous loop with broad tool access and no budget can take ` +
            `unintended actions at scale. Add a max-iteration/step budget and scope the available tools.`,
          confidence: 0.62,
        });
      });
    }
    return findings;
  },
};
