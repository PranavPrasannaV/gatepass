// Re-export canonical types from packages
export type { Finding, Tier, Severity, Surface, Location, Reproduction, FindingsDocument } from "@gatepass/findings";
import type { PlanTier } from "@gatepass/shared";
export type { PlanTier };

// Dashboard-specific response shapes (not in packages)
export interface OrgRecord {
  id: string;
  planTier: PlanTier;
  llmEnabled: boolean;
  agentLoopEnabled: boolean;
}

export interface RepoRecord {
  name: string;
  visibility: string;
  scanStatus: "never_scanned" | "scanning" | "complete" | "failed";
  gateMode: "off" | "block_verified" | "block_threshold";
  gateFailureMode: "fail_open" | "fail_closed";
  frameworks: string[];
  lastScanId?: string;
}

export interface ScanResult {
  scanId: string;
  frameworks: string[];
  verified: number;
  research: number;
}

export interface FleetServer {
  id: string;
  orgId: string;
  name: string;
  endpointOrRepo: string;
  configHash: string;
  lastScanId?: string;
  posture: "unscanned" | "passing" | "findings_open" | "critical";
}

export interface FleetRollup {
  total: number;
  unscanned: number;
  passing: number;
  findings_open: number;
  critical: number;
}

export interface FleetView {
  servers: FleetServer[];
  rollup: FleetRollup;
}

export interface AgentGuidance {
  fingerprint: string;
  guidance: {
    kind: string;
    content: string;
  };
}

export interface EvidenceExport {
  id: string;
  scanId: string;
  format: string;
  createdAt: string;
  status: string;
}

export interface QuestionnaireDraft {
  id: string;
  scanId: string;
  status: "draft" | "review" | "completed";
  answers: Array<{ question: string; answer: string; needsReview: boolean }>;
}

export interface BenchmarkData {
  corpusVersion: string;
  publishedAt: string;
  runs: Array<{
    tool: string;
    perClass: Array<{
      classId: string;
      tp: number;
      fp: number;
      fn: number;
      precision: number;
      recall: number;
    }>;
  }>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
