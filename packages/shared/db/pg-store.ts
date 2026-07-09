import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "./schema.js";

/**
 * Postgres-backed store implementing the Store interface.
 * The SQL migrations (0001_core.sql, 0002_findings.sql) must be applied before using this store.
 */

export class PgStore {
  private readonly db: ReturnType<typeof drizzle>;
  private readonly client: postgres.Sql;

  constructor(connectionString: string) {
    this.client = postgres(connectionString, { max: 10 });
    this.db = drizzle(this.client, { schema });
  }

  async close(): Promise<void> {
    await this.client.end();
  }

  async upsertOrg(org: {
    id: string;
    planTier: string;
    llmEnabled: boolean;
    agentLoopEnabled: boolean;
  }): Promise<{ id: string; planTier: string; llmEnabled: boolean; agentLoopEnabled: boolean }> {
    await this.db
      .insert(schema.organizations)
      .values({
        id: org.id,
        name: org.id,
        slug: org.id,
        planTier: org.planTier as "free" | "team" | "scale",
        llmAnalysisEnabled: org.llmEnabled,
      })
      .onConflictDoUpdate({
        target: schema.organizations.id,
        set: {
          planTier: org.planTier as "free" | "team" | "scale",
          llmAnalysisEnabled: org.llmEnabled,
        },
      });
    return org;
  }

  async getOrg(
    orgId: string,
  ): Promise<{ id: string; planTier: string; llmEnabled: boolean; agentLoopEnabled: boolean } | undefined> {
    const row = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1);
    if (!row[0]) return undefined;
    return {
      id: row[0].id,
      planTier: row[0].planTier,
      llmEnabled: row[0].llmAnalysisEnabled,
      agentLoopEnabled: row[0].llmAnalysisEnabled,
    };
  }

  async putScan(scan: {
    id: string;
    orgId: string;
    doc: {
      scan: { rulesetVersion: string };
      findings: Array<{
        id: string;
        fingerprint: string;
        tier: string;
        classId: string;
        severity: string;
        locations: unknown;
        surfaces: string[];
        reproduction: unknown | null;
        confidence: number | null;
        explanation: string;
      }>;
    };
    disputes: Map<string, string>;
  }): Promise<void> {
    await this.db
      .insert(schema.scans)
      .values({
        id: scan.id,
        orgId: scan.orgId,
        trigger: "manual",
        executionMode: "hosted",
        rulesetVersion: scan.doc.scan.rulesetVersion,
        status: "completed",
        stageTimings: "{}",
      })
      .onConflictDoNothing();

    if (scan.doc.findings.length > 0) {
      await this.db
        .insert(schema.findings)
        .values(
          scan.doc.findings.map((f) => ({
            id: f.id,
            orgId: scan.orgId,
            scanId: scan.id,
            fingerprint: f.fingerprint,
            tier: f.tier as "verified" | "research",
            classId: f.classId,
            severity: f.severity as "critical" | "high" | "medium" | "low",
            locations: JSON.stringify(f.locations),
            surfaces: f.surfaces,
            reproduction: f.reproduction ? JSON.stringify(f.reproduction) : null,
            confidence: f.confidence?.toString() ?? null,
            explanation: f.explanation,
            status: "open",
          })),
        )
        .onConflictDoNothing();
    }
  }

  async getScan(
    scanId: string,
  ): Promise<
    | {
        id: string;
        orgId: string;
        doc: {
          schema: string;
          scan: { id: string; rulesetVersion: string; executionMode: string; surfacesScanned: string[] };
          findings: unknown[];
        };
        disputes: Map<string, string>;
        createdAt: Date;
      }
    | undefined
  > {
    const scanRow = await this.db.select().from(schema.scans).where(eq(schema.scans.id, scanId)).limit(1);
    if (!scanRow[0]) return undefined;

    const findingRows = await this.db.select().from(schema.findings).where(eq(schema.findings.scanId, scanId));

    const findings = findingRows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      scanId: r.scanId,
      fingerprint: r.fingerprint,
      tier: r.tier,
      classId: r.classId,
      severity: r.severity,
      locations: JSON.parse(r.locations),
      surfaces: r.surfaces,
      reproduction: r.reproduction ? JSON.parse(r.reproduction) : null,
      confidence: r.confidence ? Number(r.confidence) : null,
      explanation: r.explanation,
      status: r.status,
    }));

    return {
      id: scanRow[0].id,
      orgId: scanRow[0].orgId,
      doc: {
        schema: "gatepass.findings/1",
        scan: {
          id: scanRow[0].id,
          rulesetVersion: scanRow[0].rulesetVersion,
          executionMode: scanRow[0].executionMode,
          surfacesScanned: [],
        },
        findings,
      },
      createdAt: scanRow[0].createdAt,
      disputes: new Map<string, string>(),
    };
  }

  async findingsOf(scanId: string, includeSuppressed = false): Promise<unknown[]> {
    const rows = await this.db.select().from(schema.findings).where(eq(schema.findings.scanId, scanId));

    return rows
      .filter((r) => includeSuppressed || r.status !== "suppressed")
      .map((r) => ({
        id: r.id,
        orgId: r.orgId,
        scanId: r.scanId,
        fingerprint: r.fingerprint,
        tier: r.tier,
        classId: r.classId,
        severity: r.severity,
        locations: JSON.parse(r.locations),
        surfaces: r.surfaces,
        reproduction: r.reproduction ? JSON.parse(r.reproduction) : null,
        confidence: r.confidence ? Number(r.confidence) : null,
        explanation: r.explanation,
        status: r.status,
      }));
  }

  async suppress(orgId: string, fingerprint: string): Promise<void> {
    await this.db
      .update(schema.findings)
      .set({ status: "suppressed" })
      .where(and(eq(schema.findings.orgId, orgId), eq(schema.findings.fingerprint, fingerprint)));
  }

  async isSuppressed(orgId: string, fingerprint: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.findings.id })
      .from(schema.findings)
      .where(
        and(
          eq(schema.findings.orgId, orgId),
          eq(schema.findings.fingerprint, fingerprint),
          eq(schema.findings.status, "suppressed"),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async upsertFleetServer(server: {
    id: string;
    orgId: string;
    name: string;
    endpointOrRepo: string;
    configHash: string;
    lastScanId?: string;
    posture: string;
  }): Promise<{
    id: string;
    orgId: string;
    name: string;
    endpointOrRepo: string;
    configHash: string;
    lastScanId?: string;
    posture: string;
  }> {
    await this.db
      .insert(schema.fleetServers)
      .values({
        id: server.id,
        orgId: server.orgId,
        name: server.name,
        endpointOrRepo: server.endpointOrRepo,
        configHash: server.configHash,
        posture: server.posture as "unscanned" | "passing" | "findings_open" | "critical",
        lastScanId: server.lastScanId ?? null,
      })
      .onConflictDoUpdate({
        target: schema.fleetServers.id,
        set: {
          posture: server.posture as "unscanned" | "passing" | "findings_open" | "critical",
          configHash: server.configHash,
          lastScanId: server.lastScanId ?? null,
        },
      });
    return server;
  }

  async getFleetServer(
    serverId: string,
  ): Promise<
    | {
        id: string;
        orgId: string;
        name: string;
        endpointOrRepo: string;
        configHash: string;
        lastScanId?: string;
        posture: string;
      }
    | undefined
  > {
    const row = await this.db.select().from(schema.fleetServers).where(eq(schema.fleetServers.id, serverId)).limit(1);
    if (!row[0]) return undefined;
    return {
      id: row[0].id,
      orgId: row[0].orgId,
      name: row[0].name,
      endpointOrRepo: row[0].endpointOrRepo,
      configHash: row[0].configHash ?? "",
      lastScanId: row[0].lastScanId ?? undefined,
      posture: row[0].posture,
    };
  }

  async fleetView(
    orgId: string,
  ): Promise<{
    servers: Array<{
      id: string;
      orgId: string;
      name: string;
      endpointOrRepo: string;
      configHash: string;
      lastScanId?: string;
      posture: string;
    }>;
    rollup: Record<string, number>;
  }> {
    const rows = await this.db.select().from(schema.fleetServers).where(eq(schema.fleetServers.orgId, orgId));

    const servers = rows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      name: r.name,
      endpointOrRepo: r.endpointOrRepo,
      configHash: r.configHash ?? "",
      lastScanId: r.lastScanId ?? undefined,
      posture: r.posture,
    }));

    const rollup: Record<string, number> = {
      total: servers.length,
      unscanned: 0,
      passing: 0,
      findings_open: 0,
      critical: 0,
    };
    for (const s of servers) {
      rollup[s.posture] = (rollup[s.posture] ?? 0) + 1;
    }

    return { servers, rollup };
  }

  async getBenchmark(corpusVersion?: string): Promise<unknown> {
    if (corpusVersion) {
      const rows = await this.db
        .select()
        .from(schema.benchmarkRuns)
        .where(eq(schema.benchmarkRuns.corpusVersion, corpusVersion));
      return {
        corpusVersion,
        publishedAt: rows[0]?.publishedAt?.toISOString() ?? null,
        runs: rows.map((r) => ({
          id: r.id,
          tool: r.tool,
          results: JSON.parse(r.results),
        })),
      };
    }
    const rows = await this.db.select().from(schema.benchmarkRuns);
    const byVersion = new Map<string, unknown[]>();
    for (const r of rows) {
      const arr = byVersion.get(r.corpusVersion) ?? [];
      arr.push({ id: r.id, tool: r.tool, results: JSON.parse(r.results) });
      byVersion.set(r.corpusVersion, arr);
    }
    return [...byVersion.entries()].map(([corpusVersion, runs]) => ({
      corpusVersion,
      runs,
    }));
  }

  async publishBenchmark(corpusVersion: string, tool: string, results: string): Promise<void> {
    await this.db.insert(schema.benchmarkRuns).values({
      id: randomUUID(),
      corpusVersion,
      tool,
      results,
    });
  }
}
