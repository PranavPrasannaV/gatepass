import { randomUUID } from "node:crypto";
import { buildScanContext, detectFrameworks } from "@gatepass/engine";
import { runScan } from "@gatepass/detectors";
import { toSarif, type Finding } from "@gatepass/findings";
import { evaluateGate, type GateConfig } from "@gatepass/github";
import { evaluatePosture, draftAnswers, type Scan as PostureScan } from "@gatepass/evidence";
import { requireFeature, type PlanTier } from "@gatepass/shared";
import { MemoryStore, type StoredScan } from "./store.js";

/**
 * API handlers wiring the analysis, gate, and evidence libraries over the store. Framed as
 * pure functions (request → result) so they are unit-testable without a running server; the
 * HTTP binding in server.ts is a thin adapter. RBAC/auth and DB persistence are the two
 * production swap-ins (both stubbed here as an in-memory store + trusted caller).
 */

const RULESET_VERSION = "2026.07.0";

export interface Handlers {
  createScan(orgId: string, repoPath: string): Promise<{ scanId: string; frameworks: string[]; verified: number; research: number }>;
  getFindings(scanId: string): Finding[];
  getSarif(scanId: string): unknown;
  disputeFinding(scanId: string, fingerprint: string, reason: string): { ok: boolean };
  evaluateGate(scanId: string, config: GateConfig): ReturnType<typeof evaluateGate>;
  getEvidence(orgId: string, scanId: string): ReturnType<typeof evaluatePosture>;
  draftQuestionnaire(orgId: string, scanId: string, questions: { id: string; question: string }[]): ReturnType<typeof draftAnswers>;
}

export class NotFoundError extends Error {}

export function makeHandlers(store: MemoryStore): Handlers {
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
    findings: s.doc.findings,
  });

  return {
    async createScan(orgId, repoPath) {
      const org = requireOrg(orgId);
      const ctx = await buildScanContext(repoPath);
      const doc = runScan(ctx, {
        scanId: randomUUID(),
        rulesetVersion: RULESET_VERSION,
        executionMode: "hosted",
        semanticEnabled: org.llmEnabled,
      });
      store.putScan({ id: doc.scan.id, orgId, doc, disputes: new Map() });
      return {
        scanId: doc.scan.id,
        frameworks: detectFrameworks(ctx),
        verified: doc.findings.filter((f) => f.tier === "verified").length,
        research: doc.findings.filter((f) => f.tier === "research").length,
      };
    },

    getFindings(scanId) {
      return requireScan(scanId).doc.findings;
    },

    getSarif(scanId) {
      return toSarif(requireScan(scanId).doc);
    },

    disputeFinding(scanId, fingerprint, reason) {
      const scan = requireScan(scanId);
      const exists = scan.doc.findings.some((f) => f.fingerprint === fingerprint);
      if (!exists) throw new NotFoundError(`finding ${fingerprint}`);
      scan.disputes.set(fingerprint, reason);
      return { ok: true };
    },

    evaluateGate(scanId, config) {
      const scan = requireScan(scanId);
      return evaluateGate(config, { findings: scan.doc.findings, scanCompleted: true });
    },

    getEvidence(orgId, scanId) {
      const org = requireOrg(orgId);
      requireFeature(org.planTier as PlanTier, "evidence_export"); // Scale-tier gated (FR-025)
      return evaluatePosture(asPostureScan(requireScan(scanId)));
    },

    draftQuestionnaire(orgId, scanId, questions) {
      const org = requireOrg(orgId);
      requireFeature(org.planTier as PlanTier, "questionnaire_autofill");
      return draftAnswers(questions, asPostureScan(requireScan(scanId)));
    },
  };
}
