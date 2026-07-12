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
import type { Store, StoredScan, FleetServer, OrgRecord } from "./store.js";

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
import type { GitHubClient } from "@gatepass/github";

export interface HandlerOptions {
  /** LLM transport for research-tier refinement. Production wires the Anthropic transport;
   *  absent means static-only (research findings keep heuristic confidence). */
  llmTransport?: LlmTransport;
  llmModel?: string;
  /** GitHub App client for PR review and check-run delivery (T096). */
  githubClient?: GitHubClient;
}

export function makeHandlers(store: Store, options: HandlerOptions = {}) {
  const requireScan = async (scanId: string): Promise<StoredScan> => {
    const s = await store.getScan(scanId);
    if (!s) throw new NotFoundError(`scan ${scanId}`);
    return s;
  };
  const requireOrg = async (orgId: string): Promise<OrgRecord> => {
    const o = await store.getOrg(orgId);
    if (!o) throw new NotFoundError(`org ${orgId}`);
    return o;
  };
  const asPostureScan = async (s: StoredScan): Promise<PostureScan> => ({
    id: s.doc.scan.id,
    rulesetVersion: s.doc.scan.rulesetVersion,
    findings: await store.findingsOf(s.id),
  });

  return {
    async createScan(orgId: string, repoPath: string) {
      const org = await requireOrg(orgId);
      const ctx = await buildScanContext(repoPath);
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
      await store.putScan({ id: doc.scan.id, orgId, doc, disputes: new Map() });
      if (store.putRepo) await store.putRepo(orgId, repoPath, doc.scan.id);
      const visible = await store.findingsOf(doc.scan.id);
      return {
        scanId: doc.scan.id,
        frameworks: detectFrameworks(ctx),
        verified: visible.filter((f) => f.tier === "verified").length,
        research: visible.filter((f) => f.tier === "research").length,
      };
    },

    async getFindings(scanId: string, includeSuppressed = false): Promise<Finding[]> {
      await requireScan(scanId);
      return store.findingsOf(scanId, includeSuppressed);
    },

    async getSarif(scanId: string) {
      const scan = await requireScan(scanId);
      return toSarif(scan.doc);
    },

    // Dispute -> suppress this fingerprint org-wide so it does not recur on unchanged code (FR-011, T087).
    // Route: POST /v1/findings/:fingerprint/dispute { scanId, reason }
    async disputeFinding(fingerprint: string, scanId: string, reason: string) {
      const scan = await requireScan(scanId);
      if (!scan.doc.findings.some((f) => f.fingerprint === fingerprint))
        throw new NotFoundError(`finding ${fingerprint}`);
      scan.disputes.set(fingerprint, reason);
      await store.suppress(scan.orgId, fingerprint);
      return { ok: true, suppressed: fingerprint };
    },

    // Opt-in agent-loop fix guidance (FR-014, T079): 403 unless the org enabled it.
    async agentGuidance(orgId: string, scanId: string, fingerprint: string) {
      const org = await requireOrg(orgId);
      if (!org.agentLoopEnabled) throw new ForbiddenError("agent-loop integration is not enabled for this org");
      const scan = await requireScan(scanId);
      const finding = scan.doc.findings.find((f) => f.fingerprint === fingerprint);
      if (!finding) throw new NotFoundError(`finding ${fingerprint}`);
      const fix = generateSuggestedFix(finding);
      return {
        fingerprint,
        guidance: fix ?? { kind: "agent_guidance", content: "No automated guidance; review manually." },
      };
    },

    async evaluateGate(scanId: string, config: GateConfig) {
      const scan = await requireScan(scanId);
      return evaluateGate(config, { findings: await store.findingsOf(scan.id), scanCompleted: true });
    },

    async getEvidence(orgId: string, scanId: string) {
      const org = await requireOrg(orgId);
      requireFeature(org.planTier as PlanTier, "evidence_export");
      const scan = await requireScan(scanId);
      return evaluatePosture(await asPostureScan(scan));
    },

    async draftQuestionnaire(orgId: string, scanId: string, format: SourceFormat, content: string) {
      const org = await requireOrg(orgId);
      requireFeature(org.planTier as PlanTier, "questionnaire_autofill");
      const scan = await requireScan(scanId);
      const questions = ingest(format, content);
      return draftAnswers(questions, await asPostureScan(scan));
    },

    // Fleet (FR-024, T085) — Scale tier.
    async registerFleetServer(
      orgId: string,
      name: string,
      endpointOrRepo: string,
      configHash: string,
    ): Promise<FleetServer> {
      const org = await requireOrg(orgId);
      requireFeature(org.planTier as PlanTier, "mcp_fleet");
      const server: FleetServer = { id: randomUUID(), orgId, name, endpointOrRepo, configHash, posture: "unscanned" };
      if (store.upsertFleetServer) {
        await store.upsertFleetServer(server);
      }
      return server;
    },

    async scanFleetServer(serverId: string, repoPath: string) {
      const server = await (store.getFleetServer ? store.getFleetServer(serverId) : Promise.resolve(undefined));
      if (!server) throw new NotFoundError(`fleet server ${serverId}`);
      const ctx = await buildScanContext(repoPath);
      const doc = runScan(ctx, {
        scanId: randomUUID(),
        rulesetVersion: RULESET_VERSION,
        executionMode: "hosted",
        semanticEnabled: true,
      });
      await store.putScan({ id: doc.scan.id, orgId: server.orgId, doc, disputes: new Map() });
      server.lastScanId = doc.scan.id;
      server.posture = posture(doc.findings);
      return server;
    },

    // Config change -> rescan trigger (FR-024): only rescan if the config hash actually changed.
    async fleetConfigChanged(serverId: string, newHash: string): Promise<boolean> {
      const server = await (store.getFleetServer ? store.getFleetServer(serverId) : Promise.resolve(undefined));
      if (!server) throw new NotFoundError(`fleet server ${serverId}`);
      if (server.configHash === newHash) return false;
      server.configHash = newHash;
      server.posture = "unscanned";
      return true;
    },

    async fleetView(orgId: string) {
      await requireOrg(orgId);
      if (store.fleetView) {
        return store.fleetView(orgId);
      }
      return { servers: [], rollup: {} };
    },

    // Self-hosted runner results upload (FR-006a, T094): validate findings-only, then store.
    async ingestRunnerResults(orgId: string, payload: unknown) {
      await requireOrg(orgId);
      validateRunnerUpload(payload);
      const doc = parseFindingsDocument(payload);
      await store.putScan({ id: doc.scan.id, orgId, doc, disputes: new Map() });
      return { scanId: doc.scan.id, findings: doc.findings.length };
    },

    async publishBenchmark(tool: string, corpusVersion: string, labels: CorpusCaseLabel[], detections: Detection[]) {
      const scored = scoreTool(tool, corpusVersion, labels, detections);
      if (!store.publishBenchmark) throw new Error("Store does not support benchmark publishing");
      await store.publishBenchmark(corpusVersion, tool, JSON.stringify(scored));
      return store.getBenchmark!(corpusVersion);
    },

    async getPublicBenchmark(corpusVersion?: string) {
      if (!store.getBenchmark) throw new Error("Store does not support benchmark retrieval");
      const rec = await store.getBenchmark(corpusVersion);
      if (!rec) {
        if (corpusVersion) throw new NotFoundError(`benchmark ${corpusVersion}`);
        return [];
      }
      return rec;
    },

    // GET /v1/orgs/:org
    async getOrg(orgId: string) {
      const org = await requireOrg(orgId);
      return org;
    },

    // GET /v1/orgs/:org/repos
    async listRepos(orgId: string) {
      await requireOrg(orgId);
      if (store.getRepos) {
        const tracked = await store.getRepos(orgId);
        return tracked.map((r) => ({
          name: r.name,
          visibility: "private",
          scanStatus: r.lastScanId ? "complete" : "never_scanned",
          gateMode: "off",
          gateFailureMode: "fail_open",
          frameworks: [] as string[],
          lastScanId: r.lastScanId,
        }));
      }
      return [];
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
