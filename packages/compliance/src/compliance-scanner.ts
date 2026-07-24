import type { ScanContext } from "@gatepass/engine";
import { COMPLIANCE_RULES } from "./compliance-rules.js";
import type { ComplianceCheck, ComplianceDomain, ComplianceResult, ComplianceStatus } from "./compliance-schema.js";
import { detectApplicability } from "./applicability.js";

/**
 * Compliance scanner — runs all compliance checks against a scan context.
 * Each domain has a dedicated scanner that produces ComplianceCheck results.
 * The scanner engine aggregates them into a ComplianceResult with a score.
 */

/** Interface each domain scanner must implement */
export interface DomainScanner {
  domain: ComplianceDomain;
  scan(ctx: ScanContext): ComplianceCheck[];
}

/**
 * Registry of domain scanners, keyed by domain so registration is IDEMPOTENT. Re-importing a
 * scanner module (test reloads, HMR, duplicate package instances) previously pushed a second
 * copy and silently double-counted every check, corrupting the score.
 */
const scanners = new Map<ComplianceDomain, DomainScanner>();

/** Register a domain scanner. Re-registering the same domain replaces it rather than duplicating. */
export function registerScanner(scanner: DomainScanner): void {
  scanners.set(scanner.domain, scanner);
}

/** Get all registered scanners, in stable domain order so results are deterministic. */
export function getScanners(): DomainScanner[] {
  const order: ComplianceDomain[] = ["wcag", "ccpa", "app_store", "google_play", "eu_ai_act"];
  return order.filter((d) => scanners.has(d)).map((d) => scanners.get(d)!);
}

/** Test/reset hook — clears the registry. */
export function clearScanners(): void {
  scanners.clear();
}

/**
 * Score over APPLICABLE checks only: fails / (pass + fail). Not-applicable and manual-review
 * checks are excluded from the denominator — a web app with no iOS target must not be docked
 * for Apple rules that do not apply to it, and an unresolved manual check is not a failure.
 */
function computeScore(checks: ComplianceCheck[]): number {
  const applicable = checks.filter((c) => c.status === "pass" || c.status === "fail");
  if (applicable.length === 0) return 100;
  const fails = applicable.filter((c) => c.status === "fail").length;
  return Math.round(Math.max(0, 100 - (fails / applicable.length) * 100));
}

/**
 * Run the full compliance scan. Returns an aggregated ComplianceResult.
 * Each domain gets its own sub-score; domains without checks contribute 100.
 */
export function runComplianceScan(ctx: ScanContext, scanId: string): ComplianceResult {
  const allChecks: ComplianceCheck[] = [];

  const active = getScanners();
  if (active.length === 0) {
    // Fail loudly rather than returning a perfect 100 from an empty registry. An empty
    // registry means the scanner modules were tree-shaken or not imported — reporting
    // "fully compliant" in that state would be the worst possible failure mode.
    throw new Error(
      "No compliance scanners registered. Import '@gatepass/compliance' (which registers all domain scanners) before calling runComplianceScan.",
    );
  }

  // Determine which domains actually apply to this repo. Checks in a non-applicable domain
  // are coerced to `not_applicable` (kept for visibility, excluded from the score) rather than
  // reported as failures — the largest source of false positives in the first implementation.
  const applicability = detectApplicability(ctx);
  for (const scanner of active) {
    const results = scanner.scan(ctx);
    if (!applicability[scanner.domain]) {
      const reason = applicability.reasons[scanner.domain] ?? "Not applicable to this project.";
      for (const r of results) {
        r.status = "not_applicable";
        r.fix = undefined;
        r.locations = [];
        r.description = `${reason} (${r.description})`;
      }
    }
    allChecks.push(...results);
  }

  const totalChecks = allChecks.length;
  const passCount = allChecks.filter((c) => c.status === "pass").length;
  const failCount = allChecks.filter((c) => c.status === "fail").length;
  const naCount = allChecks.filter((c) => c.status === "not_applicable").length;
  const manualCount = allChecks.filter((c) => c.status === "manual_review").length;

  // Compute per-domain scores
  const byDomain = {} as Record<ComplianceDomain, { total: number; pass: number; fail: number; score: number }>;
  for (const domain of ["wcag", "ccpa", "app_store", "google_play", "eu_ai_act"] as const) {
    const domainChecks = allChecks.filter((c) => c.domain === domain);
    byDomain[domain] = {
      total: domainChecks.length,
      pass: domainChecks.filter((c) => c.status === "pass").length,
      fail: domainChecks.filter((c) => c.status === "fail").length,
      score: computeScore(domainChecks),
    };
  }

  return {
    scanId,
    timestamp: new Date().toISOString(),
    totalChecks,
    passCount,
    failCount,
    naCount,
    manualCount,
    score: computeScore(allChecks),
    byDomain,
    checks: allChecks,
  };
}

/**
 * Convenience: run a single rule check given the rule ID, locations, and status.
 * Returns a properly-structured ComplianceCheck.
 */
export function makeCheck(
  ruleId: string,
  status: ComplianceStatus,
  locations: ComplianceCheck["locations"] = [],
  fix?: ComplianceCheck["fix"],
): ComplianceCheck {
  const rule = COMPLIANCE_RULES.find((r) => r.id === ruleId);
  if (!rule) {
    throw new Error(`Unknown compliance rule: ${ruleId}`);
  }

  return {
    ruleId,
    domain: rule.domain,
    status,
    severity: rule.severity,
    title: rule.title,
    description: rule.description,
    locations,
    fix,
  };
}
