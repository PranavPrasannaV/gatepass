import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";

/**
 * Research-tier detector: tool-poisoning heuristic. A tool DEFINITION whose description
 * embeds imperative instructions aimed at the model (rather than describing the tool to a
 * human) is a candidate for poisoning. This is a semantic signal, so the finding is
 * research-tier with a confidence score — never presented as verified (Principle II).
 *
 * In production this pre-filter hands candidates to the LLM analyzer (packages/semantic);
 * here it emits a calibrated heuristic confidence so the pipeline is exercisable offline.
 */

const INJECTION_CUES = [
  /ignore (all |previous |the )?instructions/i,
  /do not (tell|inform|mention to) the user/i,
  /before (using|calling) (this|any other) tool/i,
  /you must (also |always )?(read|send|call|fetch)/i,
  /system prompt/i,
  /<important>|<secret>|<system>/i,
];

function extractToolDescriptions(content: string): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  const re = /"description"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const before = content.slice(0, m.index);
    const line = before.split(/\r?\n/).length;
    out.push({ text: m[1] ?? "", line });
  }
  return out;
}

export const toolPoisoningDetector: Detector = {
  classIds: ["tool-poisoning"],
  tier: "research",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      if (!file.surfaces.includes("tool_defs")) continue;
      for (const desc of extractToolDescriptions(file.content)) {
        const hits = INJECTION_CUES.filter((re) => re.test(desc.text));
        if (hits.length === 0) continue;
        // Calibrated: 1 cue → 0.55, 2 → 0.75, 3+ → 0.9 (bounded).
        const confidence = Math.min(0.9, 0.4 + hits.length * 0.17);
        findings.push({
          tier: "research",
          classId: "tool-poisoning",
          severity: hits.length >= 2 ? "high" : "medium",
          surfaces: file.surfaces,
          locations: [{ path: file.relPath, startLine: desc.line, endLine: desc.line, surface: "tool_defs" }],
          explanation:
            `Tool description in ${file.relPath}:${desc.line} contains ${hits.length} ` +
            `instruction-injection cue(s) directed at the model rather than a human reader, ` +
            `consistent with tool poisoning. Confidence reflects heuristic pre-filtering; ` +
            `an LLM analyzer would refine this.`,
          confidence,
        });
      }
    }
    return findings;
  },
};
