import { createHash } from "node:crypto";
import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";
import { parseFinding, assertRedacted, type Finding, type FindingsDocument } from "@gatepass/findings";
import { LlmGateway, analyzeSemantic } from "@gatepass/semantic";
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
      const { rawSecrets: _rawSecrets, ...findingData } = raw;
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

const ARTIFACT_MAX = 4000;

/**
 * Async scan that refines research-tier confidence with the LLM gateway in-line (FR-011a).
 * Runs the deterministic `runScan` first, then, when a gateway is enabled, sends each
 * research finding's extracted artifact (a bounded slice of its file — never the whole repo)
 * to the model and blends the returned confidence. Verified findings are untouched, so tier
 * integrity and hosted/runner determinism of the verified set are preserved. When no gateway
 * is enabled this is identical to `runScan`.
 */
export async function runScanAsync(
  ctx: ScanContext,
  opts: RunScanOptions,
  gateway?: LlmGateway,
): Promise<FindingsDocument> {
  const doc = runScan(ctx, opts);
  if (!gateway || !gateway.enabled || opts.semanticEnabled === false) return doc;

  const contentByPath = new Map(ctx.files.map((f) => [f.relPath, f.content]));
  const findings = await Promise.all(
    doc.findings.map(async (f): Promise<Finding> => {
      if (f.tier !== "research") return f;
      const loc = f.locations[0]!;
      const artifact = (contentByPath.get(loc.path) ?? "").slice(0, ARTIFACT_MAX);
      const result = await analyzeSemantic(
        { classId: f.classId, artifact, heuristicConfidence: f.confidence },
        gateway,
      );
      // Re-validate through the schema so a refined finding cannot violate tier integrity.
      return parseFinding({ ...f, confidence: result.confidence });
    }),
  );
  findings.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  return { ...doc, findings };
}
