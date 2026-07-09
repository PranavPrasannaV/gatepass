/**
 * Artifact retention (FR-026, T066). Scan artifacts are retained no longer than needed:
 * a default TTL, extended only for artifacts backing an active evidence export. This pure
 * function computes which artifacts a retention job should delete.
 */

export const DEFAULT_TTL_DAYS = 30;
export const EVIDENCE_TTL_DAYS = 365;

export interface Artifact {
  id: string;
  createdAt: string; // ISO
  /** True if this artifact backs a delivered evidence export (longer retention). */
  backsEvidence: boolean;
}

const MS_PER_DAY = 86_400_000;

export function ttlDaysFor(artifact: Artifact): number {
  return artifact.backsEvidence ? EVIDENCE_TTL_DAYS : DEFAULT_TTL_DAYS;
}

export function isExpired(artifact: Artifact, now: Date): boolean {
  const ageDays = (now.getTime() - new Date(artifact.createdAt).getTime()) / MS_PER_DAY;
  return ageDays > ttlDaysFor(artifact);
}

/** Artifacts a retention sweep should delete now. */
export function expiredArtifacts(artifacts: readonly Artifact[], now: Date): Artifact[] {
  return artifacts.filter((a) => isExpired(a, now));
}
