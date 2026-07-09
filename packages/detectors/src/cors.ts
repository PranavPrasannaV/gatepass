import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";
import { lineAtIndex } from "@gatepass/engine";

/**
 * Verified detector: a wildcard CORS origin, especially when combined with credentials —
 * `Access-Control-Allow-Origin: *` with `Allow-Credentials: true` is spec-invalid and a
 * data-exposure risk. Deterministically checkable.
 */

interface Match {
  index: number;
  withCredentials: boolean;
}

function findWildcardCors(content: string): Match[] {
  const out: Match[] = [];
  const patterns = [
    /access-control-allow-origin["'\s:=,()]+\*/gi,
    /origin\s*:\s*["'`]\*["'`]/gi,
    /cors\(\s*\{[^}]*origin\s*:\s*true/gi,
    /origin\s*:\s*true\b/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const window = content.slice(Math.max(0, m.index - 200), m.index + 200);
      const withCredentials = /(allow-credentials["'\s:=,()]+true)|(credentials\s*:\s*true)/i.test(window);
      out.push({ index: m.index, withCredentials });
    }
  }
  return out;
}

export const corsDetector: Detector = {
  classIds: ["cors-misconfig"],
  tier: "verified",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      if (!file.surfaces.includes("app_code")) continue;
      if (!/\.(ts|tsx|js|jsx|mjs|cjs|py|go|json|ya?ml)$/i.test(file.relPath)) continue;
      const srcLines = file.content.split(/\r?\n/);
      const seen = new Set<number>();
      for (const match of findWildcardCors(file.content)) {
        const line = lineAtIndex(file.content, match.index);
        if (seen.has(line)) continue;
        // A comment describing CORS is not a misconfiguration — skip comment lines.
        const t = (srcLines[line - 1] ?? "").trim();
        if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("#")) continue;
        seen.add(line);
        findings.push({
          tier: "verified",
          classId: "cors-misconfig",
          severity: match.withCredentials ? "high" : "medium",
          surfaces: file.surfaces,
          locations: [{ path: file.relPath, startLine: line, endLine: line, surface: "app_code" }],
          explanation:
            `Wildcard CORS origin in ${file.relPath}:${line}` +
            (match.withCredentials
              ? " combined with credentials — this exposes authenticated responses to any origin."
              : " allows any origin to read responses."),
          reproduction: {
            kind: "inspection",
            steps: [
              `Open ${file.relPath} at line ${line}.`,
              `Observe a wildcard/permissive CORS origin${match.withCredentials ? " together with credentials enabled" : ""}.`,
            ],
            expected: `Cross-origin requests from any site can read${match.withCredentials ? " authenticated" : ""} responses.`,
          },
        });
      }
    }
    return findings;
  },
};
