import type { Finding } from "@gatepass/findings";

/**
 * Control map (contracts/evidence-export.md). Each posture check is derived from scan
 * findings and mapped to SOC 2 / ISO 27001 controls. Evidence is generated ONLY from scan
 * posture — never hand-authored (Constitution Principle VI, FR-021/023).
 */

export const CONTROL_MAP_VERSION = "controls-v1";

export interface ControlDef {
  id: string;
  description: string;
  soc2: string;
  iso27001: string;
  /** Classes whose presence means this control FAILS. */
  failingClasses: string[];
}

export const CONTROLS: ControlDef[] = [
  {
    id: "no-exposed-secrets",
    description: "No exposed secrets in the default branch",
    soc2: "CC6.1",
    iso27001: "A.8.24",
    failingClasses: ["exposed-secret"],
  },
  {
    id: "tenant-isolation",
    description: "Tenant isolation rules present (RLS/security rules)",
    soc2: "CC6.3",
    iso27001: "A.8.3",
    failingClasses: ["rls-gap", "cross-surface-scope-mismatch"],
  },
  {
    id: "deps-pinned",
    description: "Dependencies pinned; no hallucinated packages",
    soc2: "CC8.1",
    iso27001: "A.8.28",
    failingClasses: ["unpinned-dependency"],
  },
  {
    id: "mcp-authenticated",
    description: "MCP transports authenticated",
    soc2: "CC6.6",
    iso27001: "A.8.21",
    failingClasses: ["unauth-mcp-transport"],
  },
  {
    id: "tool-inputs-bounded",
    description: "Tool parameters bounded and schema-validated",
    soc2: "CC8.1",
    iso27001: "A.8.28",
    failingClasses: ["unbounded-tool-param", "missing-schema-validation"],
  },
  {
    id: "cors-restricted",
    description: "CORS restricted to explicit origins",
    soc2: "CC6.6",
    iso27001: "A.8.21",
    failingClasses: ["cors-misconfig"],
  },
];

export interface Scan {
  id: string;
  rulesetVersion: string;
  findings: Finding[];
}

export interface EvidenceItem {
  controlId: string;
  soc2: string;
  iso27001: string;
  status: "pass" | "fail";
  description: string;
  failingFingerprints: string[];
  scanId: string;
  rulesetVersion: string;
  controlMapVersion: string;
}

export class NoPostureError extends Error {
  constructor() {
    super("No scan posture available; refusing to fabricate evidence (FR-023)");
    this.name = "NoPostureError";
  }
}

/** Evaluate a scan's posture into mapped evidence items. Throws if there is no scan. */
export function evaluatePosture(scan: Scan | null): EvidenceItem[] {
  if (!scan) throw new NoPostureError();
  return CONTROLS.map((control) => {
    const failing = scan.findings.filter((f) => control.failingClasses.includes(f.classId));
    return {
      controlId: control.id,
      soc2: control.soc2,
      iso27001: control.iso27001,
      status: failing.length === 0 ? "pass" : "fail",
      description: control.description,
      failingFingerprints: failing.map((f) => f.fingerprint),
      scanId: scan.id,
      rulesetVersion: scan.rulesetVersion,
      controlMapVersion: CONTROL_MAP_VERSION,
    };
  });
}
