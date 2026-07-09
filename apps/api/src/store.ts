import type { FindingsDocument, Finding } from "@gatepass/findings";
import type { PlanTier } from "@gatepass/shared";

/**
 * In-memory store used by the API handlers. Production swaps this for the Postgres-backed
 * repositories (packages/shared/db) with identical shapes; the handlers depend only on this
 * interface, so the swap does not touch handler logic.
 */

export interface OrgRecord {
  id: string;
  planTier: PlanTier;
  llmEnabled: boolean;
  agentLoopEnabled: boolean;
}

export interface StoredScan {
  id: string;
  orgId: string;
  doc: FindingsDocument;
  disputes: Map<string, string>; // fingerprint -> reason
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

export class MemoryStore {
  readonly orgs = new Map<string, OrgRecord>();
  readonly scans = new Map<string, StoredScan>();
  readonly fleetServers = new Map<string, FleetServer>();
  /** Org-level fingerprints suppressed by an accepted dispute (FR-011). */
  private readonly suppressed = new Map<string, Set<string>>();

  upsertOrg(org: OrgRecord): OrgRecord {
    this.orgs.set(org.id, org);
    return org;
  }

  putScan(scan: StoredScan): void {
    this.scans.set(scan.id, scan);
  }

  suppress(orgId: string, fingerprint: string): void {
    let set = this.suppressed.get(orgId);
    if (!set) {
      set = new Set();
      this.suppressed.set(orgId, set);
    }
    set.add(fingerprint);
  }

  isSuppressed(orgId: string, fingerprint: string): boolean {
    return this.suppressed.get(orgId)?.has(fingerprint) ?? false;
  }

  findingsOf(scanId: string, includeSuppressed = false): Finding[] {
    const scan = this.scans.get(scanId);
    if (!scan) return [];
    if (includeSuppressed) return scan.doc.findings;
    return scan.doc.findings.filter((f) => !this.isSuppressed(scan.orgId, f.fingerprint));
  }
}
