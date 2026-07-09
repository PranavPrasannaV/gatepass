import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";
import { lineAtIndex } from "@gatepass/engine";

/**
 * Verified detector: unpinned dependencies (`*`, `latest`, or `x`-ranges) in package.json.
 * An unpinned dependency lets an unreviewed version — potentially a hallucinated or
 * typosquatted package published after the fact — enter the build. Deterministically
 * checkable from the manifest. (Live registry existence checks — the "hallucinated" half —
 * require network access and are handled by a separate online enrichment pass.)
 */

const UNPINNED = /^(\*|latest|x|\d+\.x|\d+\.\d+\.x)$/i;

export const dependenciesDetector: Detector = {
  classIds: ["unpinned-dependency"],
  tier: "verified",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      if (!/(^|\/)package\.json$/.test(file.relPath)) continue;
      let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      try {
        pkg = JSON.parse(file.content);
      } catch {
        continue;
      }
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      for (const [name, range] of Object.entries(deps)) {
        if (!UNPINNED.test(range.trim())) continue;
        const idx = file.content.indexOf(`"${name}"`);
        const line = idx >= 0 ? lineAtIndex(file.content, idx) : 1;
        findings.push({
          tier: "verified",
          classId: "unpinned-dependency",
          severity: range.trim() === "*" || /latest/i.test(range) ? "high" : "medium",
          surfaces: file.surfaces,
          locations: [{ path: file.relPath, startLine: line, endLine: line, surface: file.surfaces[0]! }],
          explanation:
            `Dependency "${name}" is unpinned ("${range}") in ${file.relPath}:${line}. An ` +
            `unreviewed or malicious version can enter the build without a code change.`,
          reproduction: {
            kind: "inspection",
            steps: [
              `Open ${file.relPath} at line ${line}.`,
              `Observe "${name}": "${range}" — the version is not pinned to an exact release.`,
            ],
            expected: `A fresh install may resolve "${name}" to an arbitrary newer version.`,
          },
        });
      }
    }
    return findings;
  },
};
