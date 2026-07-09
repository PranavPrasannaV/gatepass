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
}

export interface StoredScan {
  id: string;
  orgId: string;
  doc: FindingsDocument;
  disputes: Map<string, string>; // fingerprint -> reason
}

export class MemoryStore {
  readonly orgs = new Map<string, OrgRecord>();
  readonly scans = new Map<string, StoredScan>();

  upsertOrg(org: OrgRecord): OrgRecord {
    this.orgs.set(org.id, org);
    return org;
  }

  putScan(scan: StoredScan): void {
    this.scans.set(scan.id, scan);
  }

  findingsOf(scanId: string): Finding[] {
    return this.scans.get(scanId)?.doc.findings ?? [];
  }
}
