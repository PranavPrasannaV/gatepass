import { createHash } from "node:crypto";
import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";
import {
  parseFinding,
  assertRedacted,
  type Finding,
  type FindingsDocument,
} from "@gatepass/findings";
import { exposedSecretDetector } from "./exposed-secret.js";
import { unauthMcpTransportDetector } from "./unauth-mcp-transport.js";
import { toolPoisoningDetector } from "./tool-poisoning.js";
import { rlsGapDetector } from "./rls-gap.js";
import { corsDetector } from "./cors.js";
import { dependenciesDetector } from "./dependencies.js";
import { unboundedToolParamDetector, missingSchemaValidationDetector } from "./tool-params.js";
import { crossSurfaceScopeDetector } from "./cross-surface.js";
import { hbvDetector } from "./hbv.js";
import { confusedDeputyDetector } from "./confused-deputy.js";
import { overPermissionedLoopDetector } from "./over-permissioned-loop.js";

/** The default (active) ruleset. */
export const DEFAULT_DETECTORS: Detector[] = [
  // verified tier
  exposedSecretDetector,
  unauthMcpTransportDetector,
  rlsGapDetector,
  corsDetector,
  dependenciesDetector,
  unboundedToolParamDetector,
  missingSchemaValidationDetector,
  // research tier
  toolPoisoningDetector,
  crossSurfaceScopeDetector,
  hbvDetector,
  confusedDeputyDetector,
  overPermissionedLoopDetector,
];

function fingerprint(f: DetectorFinding): string {
  const loc = f.locations[0]!;
  const key = `${f.classId}|${loc.path}|${loc.startLine}|${f.tier}`;
  return "sha256:" + createHash("sha256").update(key).digest("hex").slice(0, 24);
}

export interface RunScanOptions {
  scanId: string;
  rulesetVersion: string;
  executionMode: "hosted" | "runner" | "cli";
  commitSha?: string;
  detectors?: Detector[];
  /** When false, research-tier detectors are skipped (LLM disabled — FR-011a). */
  semanticEnabled?: boolean;
}

/**
 * Run the scan pipeline over a context. Every emitted finding is:
 *  - assigned a stable fingerprint,
 *  - redaction-checked (verified tier),
 *  - validated through the canonical schema (tier integrity enforced or it throws).
 * Output is deterministic for a given (ruleset, context) — the basis of hosted/runner
 * parity (FR-006a).
 */
export function runScan(ctx: ScanContext, opts: RunScanOptions): FindingsDocument {
  const detectors = (opts.detectors ?? DEFAULT_DETECTORS).filter(
    (d) => opts.semanticEnabled !== false || d.tier !== "research",
  );

  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const detector of detectors) {
    for (const raw of detector.run(ctx)) {
      const fp = fingerprint(raw);
      if (seen.has(fp)) continue;
      seen.add(fp);

      if (raw.tier === "verified" && raw.reproduction && raw.rawSecrets?.length) {
        assertRedacted(raw.reproduction, raw.rawSecrets);
      }
      const { rawSecrets, ...findingData } = raw;
      findings.push(parseFinding({ ...findingData, fingerprint: fp }));
    }
  }

  findings.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));

  return {
    schema: "gatepass.findings/1",
    scan: {
      id: opts.scanId,
      rulesetVersion: opts.rulesetVersion,
      executionMode: opts.executionMode,
      commitSha: opts.commitSha,
      surfacesScanned: ctx.surfacesPresent,
    },
    findings,
  };
}
