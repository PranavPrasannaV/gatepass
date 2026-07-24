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
  /** ISO timestamp set at creation; used for dashboard chronology. */
  createdAt?: string;
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

/**
 * Store interface: all data-access methods are async so they work equally well
 * with the in-memory MemoryStore and the Postgres-backed PgStore.
 */
export interface Store {
  upsertOrg(org: OrgRecord): Promise<OrgRecord>;
  getOrg(orgId: string): Promise<OrgRecord | undefined>;
  putScan(scan: StoredScan): Promise<void>;
  getScan(scanId: string): Promise<StoredScan | undefined>;
  findingsOf(scanId: string, includeSuppressed?: boolean): Promise<Finding[]>;
  suppress(orgId: string, fingerprint: string): Promise<void>;
  isSuppressed(orgId: string, fingerprint: string): Promise<boolean>;
  upsertFleetServer?(server: FleetServer): Promise<FleetServer>;
  getFleetServer?(serverId: string): Promise<FleetServer | undefined>;
  fleetView?(orgId: string): Promise<{ servers: FleetServer[]; rollup: Record<string, number> }>;
  /** Track a repo that has been scanned for an org. */
  putRepo?(orgId: string, repoPath: string, scanId: string): Promise<void>;
  /** List tracked repos for an org. */
  getRepos?(orgId: string): Promise<Array<{ name: string; lastScanId: string }>>;
  getBenchmark?(corpusVersion?: string): Promise<unknown>;
  publishBenchmark?(corpusVersion: string, tool: string, results: string): Promise<void>;
  getLatestScan?(): Promise<{ id: string; orgId: string } | undefined>;
  /** All scans for an org, oldest first (dashboard overview). */
  listScans?(orgId: string): Promise<StoredScan[]>;
  /** Store a compliance scan result keyed by scanId. */
  putComplianceScan?(scanId: string, orgId: string, result: unknown): Promise<void>;
  /** Get a stored compliance scan result. */
  getComplianceScan?(scanId: string): Promise<unknown | undefined>;
}

export class MemoryStore implements Store {
  readonly orgs = new Map<string, OrgRecord>();
  readonly scans = new Map<string, StoredScan>();
  readonly fleetServers = new Map<string, FleetServer>();
  /** Published benchmark runs keyed by corpus version (public, immutable once set). */
  readonly benchmarks = new Map<string, unknown>();
  /** Compliance scan results keyed by scanId. */
  readonly complianceScans = new Map<string, unknown>();
  /** Scanned repos keyed by orgId → map of repo-name → lastScanId. */
  readonly repos = new Map<string, Map<string, string>>();
  /** Org-level fingerprints suppressed by an accepted dispute (FR-011). */
  private readonly suppressed = new Map<string, Set<string>>();

  async upsertOrg(org: OrgRecord): Promise<OrgRecord> {
    this.orgs.set(org.id, org);
    return org;
  }

  async getOrg(orgId: string): Promise<OrgRecord | undefined> {
    return this.orgs.get(orgId);
  }

  async putScan(scan: StoredScan): Promise<void> {
    this.scans.set(scan.id, scan);
  }

  async listScans(orgId: string): Promise<StoredScan[]> {
    return [...this.scans.values()].filter((s) => s.orgId === orgId);
  }

  async getScan(scanId: string): Promise<StoredScan | undefined> {
    return this.scans.get(scanId);
  }

  async suppress(orgId: string, fingerprint: string): Promise<void> {
    let set = this.suppressed.get(orgId);
    if (!set) {
      set = new Set();
      this.suppressed.set(orgId, set);
    }
    set.add(fingerprint);
  }

  async isSuppressed(orgId: string, fingerprint: string): Promise<boolean> {
    return this.suppressed.get(orgId)?.has(fingerprint) ?? false;
  }

  async findingsOf(scanId: string, includeSuppressed = false): Promise<Finding[]> {
    const scan = this.scans.get(scanId);
    if (!scan) return [];
    if (includeSuppressed) return scan.doc.findings;
    const suppressed = this.suppressed.get(scan.orgId);
    if (!suppressed) return scan.doc.findings;
    return scan.doc.findings.filter((f) => !suppressed.has(f.fingerprint));
  }

  async upsertFleetServer(server: FleetServer): Promise<FleetServer> {
    this.fleetServers.set(server.id, server);
    return server;
  }

  async getFleetServer(serverId: string): Promise<FleetServer | undefined> {
    return this.fleetServers.get(serverId);
  }

  async fleetView(orgId: string): Promise<{ servers: FleetServer[]; rollup: Record<string, number> }> {
    const servers = [...this.fleetServers.values()].filter((s) => s.orgId === orgId);
    const rollup: Record<string, number> = {
      total: servers.length,
      unscanned: 0,
      passing: 0,
      findings_open: 0,
      critical: 0,
    };
    for (const s of servers) rollup[s.posture]!++;
    return { servers, rollup };
  }

  async putRepo(orgId: string, repoPath: string, scanId: string): Promise<void> {
    let orgRepos = this.repos.get(orgId);
    if (!orgRepos) {
      orgRepos = new Map();
      this.repos.set(orgId, orgRepos);
    }
    orgRepos.set(repoPath, scanId);
  }

  async getRepos(orgId: string): Promise<Array<{ name: string; lastScanId: string }>> {
    const orgRepos = this.repos.get(orgId);
    if (!orgRepos) return [];
    return [...orgRepos.entries()].map(([name, lastScanId]) => ({ name, lastScanId }));
  }

  async getBenchmark(corpusVersion?: string): Promise<unknown> {
    if (corpusVersion) {
      const rec = this.benchmarks.get(corpusVersion);
      return rec ?? null;
    }
    return [...this.benchmarks.values()];
  }

  async publishBenchmark(corpusVersion: string, _tool: string, results: string): Promise<void> {
    const parsed = JSON.parse(results);
    const existing = this.benchmarks.get(corpusVersion) as { runs: unknown[] } | undefined;
    if (existing) {
      existing.runs.push(parsed);
    } else {
      this.benchmarks.set(corpusVersion, {
        corpusVersion,
        publishedAt: new Date().toISOString(),
        runs: [parsed],
      });
    }
  }

  async putComplianceScan(scanId: string, orgId: string, result: unknown): Promise<void> {
    this.complianceScans.set(scanId, { scanId, orgId, result, createdAt: new Date().toISOString() });
  }

  async getComplianceScan(scanId: string): Promise<unknown | undefined> {
    return this.complianceScans.get(scanId);
  }
}
