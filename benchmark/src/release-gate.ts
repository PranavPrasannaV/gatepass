import { isPrecisionRegression, type ToolBenchmark } from "./score.js";

/**
 * Release precision gate (FR-019). Compares a candidate measurement against the last
 * published benchmark run for the same corpus version and blocks the release on any
 * regression unless the affected rules have been demoted from the default ruleset.
 */

export interface ReleaseGateResult {
  pass: boolean;
  reason: string;
  regressedClasses: string[];
}

export function releaseGate(
  published: ToolBenchmark,
  candidate: ToolBenchmark,
  demotedClasses: readonly string[] = [],
): ReleaseGateResult {
  if (published.corpusVersion !== candidate.corpusVersion) {
    return {
      pass: false,
      reason: `corpus version mismatch (${published.corpusVersion} vs ${candidate.corpusVersion})`,
      regressedClasses: [],
    };
  }
  const demoted = new Set(demotedClasses);
  const publishedByClass = new Map(published.perClass.map((c) => [c.classId, c]));
  const regressed: string[] = [];
  for (const cand of candidate.perClass) {
    const prev = publishedByClass.get(cand.classId);
    if (!prev) continue;
    if (demoted.has(cand.classId)) continue; // demoted rules are exempt (FR-019)
    if (cand.fpRate > prev.fpRate + 1e-9 || cand.tpRate < prev.tpRate - 1e-9) {
      regressed.push(cand.classId);
    }
  }
  if (regressed.length > 0) {
    return { pass: false, reason: `precision regressed for: ${regressed.join(", ")}`, regressedClasses: regressed };
  }
  // Also cover the overall isPrecisionRegression signal as a safety net.
  if (isPrecisionRegression(published, candidate) && demoted.size === 0) {
    return { pass: false, reason: "overall precision regression", regressedClasses: [] };
  }
  return { pass: true, reason: "no precision regression", regressedClasses: [] };
}
