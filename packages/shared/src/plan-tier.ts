/**
 * Plan-tier feature gating (FR-025). Free / Team / Scale map to a fixed feature set from the
 * one-pager. Gating is enforced centrally so no route accidentally leaks a paid capability.
 */

export type PlanTier = "free" | "team" | "scale";

export type Feature =
  | "open_scanner"
  | "public_reports"
  | "private_repos"
  | "continuous_scanning"
  | "pr_remediation"
  | "ide_remediation"
  | "agent_loop"
  | "multi_repo"
  | "ci_gating"
  | "evidence_export"
  | "questionnaire_autofill"
  | "mcp_fleet"
  | "sso_scim";

const FREE: Feature[] = ["open_scanner", "public_reports"];
const TEAM: Feature[] = [
  ...FREE,
  "private_repos",
  "continuous_scanning",
  "pr_remediation",
  "ide_remediation",
  "agent_loop",
];
const SCALE: Feature[] = [
  ...TEAM,
  "multi_repo",
  "ci_gating",
  "evidence_export",
  "questionnaire_autofill",
  "mcp_fleet",
  "sso_scim",
];

const FEATURES: Record<PlanTier, ReadonlySet<Feature>> = {
  free: new Set(FREE),
  team: new Set(TEAM),
  scale: new Set(SCALE),
};

export function hasFeature(tier: PlanTier, feature: Feature): boolean {
  return FEATURES[tier].has(feature);
}

export class PlanTierError extends Error {
  constructor(
    public readonly tier: PlanTier,
    public readonly feature: Feature,
  ) {
    super(`Feature "${feature}" requires a higher plan than "${tier}"`);
    this.name = "PlanTierError";
  }
}

/** Throws PlanTierError if the tier lacks the feature — call at the top of gated handlers. */
export function requireFeature(tier: PlanTier, feature: Feature): void {
  if (!hasFeature(tier, feature)) throw new PlanTierError(tier, feature);
}
