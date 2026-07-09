import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";
import { lineAtIndex } from "@gatepass/engine";

/**
 * Research-tier detector: hallucination-based vulnerability (HBV). A tool whose definition is
 * VAGUE about scope while granting a BROAD/dangerous capability leads the model itself to
 * over-privilege — it fills the ambiguity with the most capable interpretation. Semantic, so
 * research-tier with a confidence score (Principle II).
 */

const VAGUE_DESC =
  /^(.{0,24}|.*\b(manage|handle|process|do|perform|access|interact|work with|deal with|stuff|things|anything|various)\b.*)$/i;
const BROAD_NAME =
  /(exec|shell|run|command|cmd|query|sql|delete|drop|admin|root|file|write|fetch|http|eval|proxy|forward|all|any)/i;
const CONSTRAINED = /(enum|maxLength|pattern|maximum|maxItems|format)/;

interface ToolDef {
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export const hbvDetector: Detector = {
  classIds: ["hbv"],
  tier: "research",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      if (!file.surfaces.includes("tool_defs")) continue;
      let parsed: { tools?: ToolDef[] };
      try {
        parsed = JSON.parse(file.content);
      } catch {
        continue;
      }
      for (const tool of parsed.tools ?? []) {
        const desc = (tool.description ?? "").trim();
        const paramsRaw = JSON.stringify(tool.parameters ?? {});
        const wordCount = desc ? desc.split(/\s+/).length : 0;

        const isVague = desc === "" || wordCount < 6 || VAGUE_DESC.test(desc);
        const isBroad = BROAD_NAME.test(tool.name ?? "") || BROAD_NAME.test(paramsRaw);
        const unconstrained = !CONSTRAINED.test(paramsRaw);
        if (!(isVague && isBroad)) continue;

        // Confidence: vague + broad is the base signal; unconstrained params raise it.
        let confidence = 0.55;
        if (wordCount < 3 || desc === "") confidence += 0.15;
        if (unconstrained) confidence += 0.1;
        confidence = Math.min(0.9, confidence);

        const idx = tool.name ? file.content.indexOf(`"${tool.name}"`) : -1;
        const line = idx >= 0 ? lineAtIndex(file.content, idx) : 1;
        findings.push({
          tier: "research",
          classId: "hbv",
          severity: "high",
          surfaces: file.surfaces,
          locations: [{ path: file.relPath, startLine: line, endLine: line, surface: "tool_defs" }],
          explanation:
            `Tool "${tool.name}" in ${file.relPath}:${line} pairs a broad/dangerous capability with a ` +
            `vague, under-specified description. The model must guess the intended scope and tends to ` +
            `over-privilege — a hallucination-based vulnerability. Tighten the description and constrain parameters.`,
          confidence,
        });
      }
    }
    return findings;
  },
};
