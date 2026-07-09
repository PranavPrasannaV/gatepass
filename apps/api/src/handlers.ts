import { randomUUID, createHash } from "node:crypto";
import { buildScanContext, detectFrameworks } from "@gatepass/engine";
import { runScan, runScanAsync, generateSuggestedFix } from "@gatepass/detectors";
import { LlmGateway } from "@gatepass/semantic";
import { toSarif, parseFindingsDocument, type Finding } from "@gatepass/findings";
import { evaluateGate, type GateConfig } from "@gatepass/github";
import { evaluatePosture, draftAnswers, ingest, type Scan as PostureScan, type SourceFormat } from "@gatepass/evidence";
import { requireFeature, type PlanTier } from "@gatepass/shared";
import { validateRunnerUpload } from "@gatepass/runner";
import { scoreTool, type CorpusCaseLabel, type Detection } from "@gatepass/benchmark";
import { MemoryStore, type StoredScan, type FleetServer } from "./store.js";

/**
 * API handlers wiring the analysis, gate, evidence, and runner libraries over the store.
 * Pure functions (request → result) so they are unit-testable without a running server; the
 * HTTP binding in server.ts is a thin adapter. RBAC/auth and DB persistence are the two
 * production swap-ins (both stubbed here as an in-memory store + trusted caller).
 */

const RULESET_VERSION = "2026.07.0";

export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}

import type { LlmTransport } from "@gatepass/semantic";

export interface HandlerOptions {
  /** LLM transport for research-tier refinement. Production wires the Anthropic transport;
   *  absent means static-only (research findings keep heuristic confidence). */
  llmTransport?: LlmTransport;
  llmModel?: string;
}

export function makeHandlers(store: MemoryStore, options: HandlerOptions = {}) {
  const requireScan = (scanId: string): StoredScan => {
    const s = store.scans.get(scanId);
    if (!s) throw new NotFoundError(`scan ${scanId}`);
    return s;
  };
  const requireOrg = (orgId: string) => {
    const o = store.orgs.get(orgId);
    if (!o) throw new NotFoundError(`org ${orgId}`);
    return o;
  };
  const asPostureScan = (s: StoredScan): PostureScan => ({
    id: s.doc.scan.id,
    rulesetVersion: s.doc.scan.rulesetVersion,
    findings: store.findingsOf(s.id),
  });

  return {
    async createScan(orgId: string, repoPath: string) {
      const org = requireOrg(orgId);
      const ctx = await buildScanContext(repoPath);
      // Build a per-org gateway; refines research-tier confidence in-line when enabled+wired.
      const gateway = new LlmGateway({
        enabled: org.llmEnabled,
        apiKey: options.llmTransport ? "configured" : undefined,
        model: options.llmModel,
        transport: options.llmTransport,
      });
      const doc = await runScanAsync(
        ctx,
        {
          scanId: randomUUID(),
          rulesetVersion: RULESET_VERSION,
          executionMode: "hosted",
          semanticEnabled: org.llmEnabled,
        },
        gateway,
      );
      store.putScan({ id: doc.scan.id, orgId, doc, disputes: new Map() });
      const visible = store.findingsOf(doc.scan.id);
      return {
        scanId: doc.scan.id,
        frameworks: detectFrameworks(ctx),
        verified: visible.filter((f) => f.tier === "verified").length,
        research: visible.filter((f) => f.tier === "research").length,
      };
    },

    getFindings(scanId: string, includeSuppressed = false): Finding[] {
      requireScan(scanId);
      return store.findingsOf(scanId, includeSuppressed);
    },

    getSarif(scanId: string) {
      return toSarif(requireScan(scanId).doc);
    },

    // Dispute → suppress this fingerprint org-wide so it does not recur on unchanged code (FR-011, T087).
    disputeFinding(scanId: string, fingerprint: string, reason: string) {
      const scan = requireScan(scanId);
      if (!scan.doc.findings.some((f) => f.fingerprint === fingerprint))
        throw new NotFoundError(`finding ${fingerprint}`);
      scan.disputes.set(fingerprint, reason);
      store.suppress(scan.orgId, fingerprint);
      return { ok: true, suppressed: fingerprint };
    },

    // Opt-in agent-loop fix guidance (FR-014, T079): 403 unless the org enabled it.
    agentGuidance(orgId: string, scanId: string, fingerprint: string) {
      const org = requireOrg(orgId);
      if (!org.agentLoopEnabled) throw new ForbiddenError("agent-loop integration is not enabled for this org");
      const scan = requireScan(scanId);
      const finding = scan.doc.findings.find((f) => f.fingerprint === fingerprint);
      if (!finding) throw new NotFoundError(`finding ${fingerprint}`);
      const fix = generateSuggestedFix(finding);
      return {
        fingerprint,
        guidance: fix ?? { kind: "agent_guidance", content: "No automated guidance; review manually." },
      };
    },

    evaluateGate(scanId: string, config: GateConfig) {
      const scan = requireScan(scanId);
      return evaluateGate(config, { findings: store.findingsOf(scan.id), scanCompleted: true });
    },

    getEvidence(orgId: string, scanId: string) {
      const org = requireOrg(orgId);
      requireFeature(org.planTier as PlanTier, "evidence_export");
      return evaluatePosture(asPostureScan(requireScan(scanId)));
    },

    draftQuestionnaire(orgId: string, scanId: string, format: SourceFormat, content: string) {
      const org = requireOrg(orgId);
      requireFeature(org.planTier as PlanTier, "questionnaire_autofill");
      const questions = ingest(format, content);
      return draftAnswers(questions, asPostureScan(requireScan(scanId)));
    },

    // Fleet (FR-024, T085) — Scale tier.
    registerFleetServer(orgId: string, name: string, endpointOrRepo: string, configHash: string): FleetServer {
      const org = requireOrg(orgId);
      requireFeature(org.planTier as PlanTier, "mcp_fleet");
      const server: FleetServer = { id: randomUUID(), orgId, name, endpointOrRepo, configHash, posture: "unscanned" };
      store.fleetServers.set(server.id, server);
      return server;
    },

    async scanFleetServer(serverId: string, repoPath: string) {
      const server = store.fleetServers.get(serverId);
      if (!server) throw new NotFoundError(`fleet server ${serverId}`);
      const ctx = await buildScanContext(repoPath);
      const doc = runScan(ctx, {
        scanId: randomUUID(),
        rulesetVersion: RULESET_VERSION,
        executionMode: "hosted",
        semanticEnabled: true,
      });
      store.putScan({ id: doc.scan.id, orgId: server.orgId, doc, disputes: new Map() });
      server.lastScanId = doc.scan.id;
      server.posture = posture(doc.findings);
      return server;
    },

    // Config change → rescan trigger (FR-024): only rescan if the config hash actually changed.
    fleetConfigChanged(serverId: string, newHash: string): boolean {
      const server = store.fleetServers.get(serverId);
      if (!server) throw new NotFoundError(`fleet server ${serverId}`);
      if (server.configHash === newHash) return false;
      server.configHash = newHash;
      server.posture = "unscanned";
      return true;
    },

    fleetView(orgId: string) {
      requireOrg(orgId);
      const servers = [...store.fleetServers.values()].filter((s) => s.orgId === orgId);
      const rollup = { total: servers.length, unscanned: 0, passing: 0, findings_open: 0, critical: 0 } as Record<
        string,
        number
      >;
      for (const s of servers) rollup[s.posture]!++;
      return { servers, rollup };
    },

    // Self-hosted runner results upload (FR-006a, T094): validate findings-only, then store.
    ingestRunnerResults(orgId: string, payload: unknown) {
      requireOrg(orgId);
      validateRunnerUpload(payload); // rejects any source-bearing or malformed payload
      const doc = parseFindingsDocument(payload);
      store.putScan({ id: doc.scan.id, orgId, doc, disputes: new Map() });
      return { scanId: doc.scan.id, findings: doc.findings.length };
    },

    // Publish a benchmark run for a corpus version (FR-018, T046). Immutable once set.
    publishBenchmark(tool: string, corpusVersion: string, labels: CorpusCaseLabel[], detections: Detection[]) {
      if (store.benchmarks.has(corpusVersion)) {
        const existing = store.benchmarks.get(corpusVersion) as { runs: unknown[] };
        existing.runs.push(scoreTool(tool, corpusVersion, labels, detections));
        return existing;
      }
      const record = {
        corpusVersion,
        publishedAt: new Date().toISOString(),
        runs: [scoreTool(tool, corpusVersion, labels, detections)],
      };
      store.benchmarks.set(corpusVersion, record);
      return record;
    },

    // Public benchmark (no auth): latest across versions, or a specific version.
    getPublicBenchmark(corpusVersion?: string) {
      if (corpusVersion) {
        const rec = store.benchmarks.get(corpusVersion);
        if (!rec) throw new NotFoundError(`benchmark ${corpusVersion}`);
        return rec;
      }
      return [...store.benchmarks.values()];
    },
  };
}

function posture(findings: Finding[]): FleetServer["posture"] {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.length > 0) return "findings_open";
  return "passing";
}

/** Stable config-hash helper for callers/tests. */
export function hashConfig(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}
