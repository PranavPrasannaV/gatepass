import type { Finding } from "./schema.js";

/**
 * Findings diff (incremental / PR scanning, T035/T072). Compares a head scan against a base
 * scan by stable fingerprint to determine what a change actually introduced vs. fixed. A PR
 * gate should block only on findings the PR *added* — not pre-existing issues — which is what
 * makes incremental scanning fair and fast to act on.
 */

export interface FindingsDiff {
  /** In head but not base — introduced by the change. */
  added: Finding[];
  /** In base but not head — fixed by the change. */
  removed: Finding[];
  /** Present in both. */
  unchanged: Finding[];
}

export function diffFindings(base: readonly Finding[], head: readonly Finding[]): FindingsDiff {
  const baseFps = new Set(base.map((f) => f.fingerprint));
  const headFps = new Set(head.map((f) => f.fingerprint));
  return {
    added: head.filter((f) => !baseFps.has(f.fingerprint)),
    removed: base.filter((f) => !headFps.has(f.fingerprint)),
    unchanged: head.filter((f) => baseFps.has(f.fingerprint)),
  };
}

/** Restrict findings to those located in one of the given (changed) file paths. */
export function findingsInFiles(findings: readonly Finding[], changedPaths: readonly string[]): Finding[] {
  const changed = new Set(changedPaths.map((p) => p.replace(/\\/g, "/")));
  return findings.filter((f) => f.locations.some((l) => changed.has(l.path.replace(/\\/g, "/"))));
}
