import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";
import { redactSecrets } from "@gatepass/findings";

/**
 * Verified detector: exposed secrets in source and, especially, in built/bundled
 * artifacts that ship to clients. Each finding carries a concrete reproduction
 * (Constitution FR-008) with the secret value redacted (contract rule 5).
 */

interface SecretPattern {
  name: string;
  regex: RegExp;
  severity: "critical" | "high";
}

const PATTERNS: SecretPattern[] = [
  { name: "AWS access key id", regex: /\bAKIA[0-9A-Z]{16}\b/g, severity: "critical" },
  { name: "Anthropic API key", regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, severity: "critical" },
  { name: "OpenAI API key", regex: /\bsk-[A-Za-z0-9]{32,}\b/g, severity: "critical" },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g, severity: "high" },
  { name: "Slack token", regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g, severity: "high" },
  { name: "Generic private key block", regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, severity: "critical" },
];

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

export const exposedSecretDetector: Detector = {
  classIds: ["exposed-secret"],
  tier: "verified",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      const isBundle = /\.(js|map)$/.test(file.relPath) &&
        /(dist|build|\.next)\//.test(file.relPath);
      for (const pattern of PATTERNS) {
        pattern.regex.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.regex.exec(file.content)) !== null) {
          const secret = m[0];
          const line = lineOf(file.content, m.index);
          const severity = isBundle ? "critical" : pattern.severity;
          findings.push({
            tier: "verified",
            classId: "exposed-secret",
            severity,
            surfaces: file.surfaces,
            locations: [{ path: file.relPath, startLine: line, endLine: line, surface: file.surfaces[0]! }],
            explanation:
              `${pattern.name} found in ${isBundle ? "a shipped client bundle" : "source"} ` +
              `(${file.relPath}:${line}). ${isBundle ? "This value is served to end users." : "This value is committed to the repository."}`,
            reproduction: {
              kind: "inspection",
              steps: [
                `Open ${file.relPath} and go to line ${line}.`,
                `Observe a ${pattern.name} matching the pattern ${pattern.regex.source}.`,
                `Value (redacted): ${redactSecrets(secret, [secret])}`,
              ],
              expected: `A live ${pattern.name} is present and ${isBundle ? "reachable by any client that loads the bundle" : "readable by anyone with repo access"}.`,
            },
            rawSecrets: [secret],
          });
        }
      }
    }
    return findings;
  },
};
