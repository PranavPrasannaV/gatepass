import type { Finding, Severity } from "@gatepass/findings";

/**
 * CI gate decision (FR-016, FR-016a). This is the pure decision function; the caller maps
 * the result onto a GitHub Check Run. The gate BLOCKS or passes — it never rewrites code
 * (Constitution Principle III). On scan failure it fails open by default.
 */

export type GateMode = "off" | "block_verified" | "block_threshold";
export type GateFailureMode = "fail_open" | "fail_closed";
export type CheckConclusion = "success" | "failure" | "neutral";

export interface ThresholdConfig {
  /** For block_threshold: minimum severity that counts, and the max allowed count. */
  minSeverity: Severity;
  maxAllowed: number;
}

export interface GateConfig {
  mode: GateMode;
  failureMode: GateFailureMode;
  threshold?: ThresholdConfig;
}

export interface GateInput {
  /** Findings from the scan; undefined signals the scan did not complete. */
  findings?: Finding[];
  scanCompleted: boolean;
}

export interface GateResult {
  conclusion: CheckConclusion;
  summary: string;
  /** Findings that caused a block (empty when passing). */
  blocking: Finding[];
}

const SEVERITY_ORDER: Severity[] = ["low", "medium", "high", "critical"];

function atOrAbove(sev: Severity, min: Severity): boolean {
  return SEVERITY_ORDER.indexOf(sev) >= SEVERITY_ORDER.indexOf(min);
}

export function evaluateGate(config: GateConfig, input: GateInput): GateResult {
  // Scan didn't finish → fail-open (neutral) by default, fail-closed only if configured.
  if (!input.scanCompleted) {
    if (config.failureMode === "fail_closed") {
      return { conclusion: "failure", summary: "Scan unavailable and repo is fail-closed — blocking.", blocking: [] };
    }
    return { conclusion: "neutral", summary: "Scan unavailable — gate skipped (fail-open).", blocking: [] };
  }

  const findings = input.findings ?? [];

  if (config.mode === "off") {
    return { conclusion: "neutral", summary: `${findings.length} finding(s); gate disabled.`, blocking: [] };
  }

  let blocking: Finding[];
  if (config.mode === "block_verified") {
    blocking = findings.filter((f) => f.tier === "verified");
  } else {
    const t = config.threshold ?? { minSeverity: "high", maxAllowed: 0 };
    const counted = findings.filter((f) => atOrAbove(f.severity, t.minSeverity));
    blocking = counted.length > t.maxAllowed ? counted : [];
  }

  if (blocking.length > 0) {
    return {
      conclusion: "failure",
      summary: `Blocking merge: ${blocking.length} finding(s) exceed the gate.`,
      blocking,
    };
  }
  return { conclusion: "success", summary: `${findings.length} finding(s); none exceed the gate.`, blocking: [] };
}
