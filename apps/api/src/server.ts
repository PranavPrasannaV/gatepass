import http from "node:http";
import { URL } from "node:url";
import { MemoryStore, type Store } from "./store.js";
import { makeHandlers, NotFoundError, ForbiddenError } from "./handlers.js";
import type { GitHubClient } from "@gatepass/github";
import { PlanTierError } from "@gatepass/shared";
import { RunnerUploadError } from "@gatepass/runner";

/**
 * Thin HTTP binding over the handlers. Minimal Node http server standing in for the
 * production Fastify app — it exists so the platform wiring is genuinely runnable end-to-end.
 * Routes mirror contracts/api.md.
 */

export interface ServerOptions {
  store?: Store;
  githubClient?: GitHubClient;
  llmTransport?: import("@gatepass/semantic").LlmTransport;
  llmModel?: string;
}

export async function createServer(opts: ServerOptions = {}): Promise<{ server: http.Server; store: Store }> {
  const store = opts.store ?? new MemoryStore();
  const h = makeHandlers(store, {
    githubClient: opts.githubClient,
    llmTransport: opts.llmTransport,
    llmModel: opts.llmModel,
  });

  // Seed demo orgs for integration tests and dev use
  await store.upsertOrg({ id: "demo", planTier: "scale", llmEnabled: true, agentLoopEnabled: true });
  await store.upsertOrg({ id: "free-org", planTier: "free", llmEnabled: true, agentLoopEnabled: false });
  await store.upsertOrg({ id: "no-agent", planTier: "scale", llmEnabled: true, agentLoopEnabled: false });

  if (store.upsertFleetServer) {
    await store.upsertFleetServer({
      id: "srv-1",
      orgId: "demo",
      name: "prd-db-cluster-01",
      endpointOrRepo: "10.0.4.15:5432",
      configHash: "a7f9c2e3b1d4",
      posture: "critical",
      lastScanId: "scan-001",
    });
    await store.upsertFleetServer({
      id: "srv-2",
      orgId: "demo",
      name: "prd-web-gw-04",
      endpointOrRepo: "10.0.2.112:443",
      configHash: "b3d1f8a7c9e2",
      posture: "passing",
      lastScanId: "scan-002",
    });
    await store.upsertFleetServer({
      id: "srv-3",
      orgId: "demo",
      name: "stg-cache-red-01",
      endpointOrRepo: "10.1.5.22:6379",
      configHash: "e4f2a8c1d3b6",
      posture: "unscanned",
    });
    await store.upsertFleetServer({
      id: "srv-4",
      orgId: "free-org",
      name: "dev-api-gw-01",
      endpointOrRepo: "10.0.1.50:8080",
      configHash: "c5d8e3f1a2b7",
      posture: "findings_open",
      lastScanId: "scan-003",
    });
  }

  if (store.publishBenchmark) {
    await store.publishBenchmark(
      "corpus-v1",
      "gatepass",
      JSON.stringify({
        tool: "gatepass",
        corpusVersion: "corpus-v1",
        perClass: [
          { classId: "sql-injection", tp: 142, fp: 3, fn: 1, precision: 0.979, recall: 0.993 },
          { classId: "cors-misconfig", tp: 87, fp: 12, fn: 4, precision: 0.878, recall: 0.956 },
          { classId: "xss-reflected", tp: 205, fp: 8, fn: 12, precision: 0.962, recall: 0.944 },
          { classId: "path-traversal", tp: 54, fp: 2, fn: 0, precision: 0.964, recall: 1.0 },
          { classId: "insecure-crypto", tp: 31, fp: 18, fn: 2, precision: 0.632, recall: 0.939 },
          { classId: "xxe-injection", tp: 22, fp: 1, fn: 0, precision: 0.956, recall: 1.0 },
          { classId: "ssrf", tp: 67, fp: 5, fn: 3, precision: 0.93, recall: 0.957 },
          { classId: "open-redirect", tp: 43, fp: 7, fn: 2, precision: 0.86, recall: 0.955 },
          { classId: "ldap-injection", tp: 18, fp: 1, fn: 0, precision: 0.947, recall: 1.0 },
          { classId: "cmd-injection", tp: 96, fp: 4, fn: 2, precision: 0.96, recall: 0.979 },
          { classId: "hardcoded-secret", tp: 311, fp: 22, fn: 8, precision: 0.934, recall: 0.975 },
          { classId: "insecure-deserial", tp: 39, fp: 3, fn: 1, precision: 0.928, recall: 0.975 },
        ],
        publishedAt: new Date().toISOString(),
      }),
    );
  }

  const server = http.createServer((req, res) => {
    void handle(req, res).catch((err) => sendError(res, err));
  });

  async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const p = url.pathname.split("/").filter(Boolean);
    const q = url.searchParams;
    const body = await readBody(req);
    const M = req.method;

    // CORS preflight
    if (M === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
      });
      return res.end();
    }

    // POST /v1/orgs/:org/scans
    if (M === "POST" && p[0] === "v1" && p[1] === "orgs" && p[3] === "scans") {
      return sendJson(res, 201, await h.createScan(p[2]!, String(body.path)));
    }
    // GET /v1/scans/:id/findings[?includeSuppressed=1]
    if (M === "GET" && p[1] === "scans" && p[3] === "findings") {
      return sendJson(res, 200, await h.getFindings(p[2]!, q.get("includeSuppressed") === "1"));
    }
    if (M === "GET" && p[1] === "scans" && p[3] === "findings.sarif") {
      return sendJson(res, 200, await h.getSarif(p[2]!));
    }
    // POST /v1/scans/:id/gate
    if (M === "POST" && p[1] === "scans" && p[3] === "gate") {
      return sendJson(res, 200, await h.evaluateGate(p[2]!, body as never));
    }
    // GET /v1/orgs/:org/scans/:id/agent-guidance?fingerprint=
    if (M === "GET" && p[1] === "orgs" && p[3] === "scans" && p[5] === "agent-guidance") {
      return sendJson(res, 200, await h.agentGuidance(p[2]!, p[4]!, q.get("fingerprint") ?? ""));
    }
    // POST /v1/findings/:fingerprint/dispute { scanId, reason }
    if (M === "POST" && p[1] === "findings" && p[3] === "dispute") {
      return sendJson(res, 200, await h.disputeFinding(p[2]!, String(body.scanId), String(body.reason)));
    }
    // GET /v1/orgs/:org/evidence?scanId=
    if (M === "GET" && p[1] === "orgs" && p[3] === "evidence") {
      return sendJson(res, 200, await h.getEvidence(p[2]!, q.get("scanId") ?? ""));
    }
    // POST /v1/orgs/:org/questionnaires { scanId, format, content }
    if (M === "POST" && p[1] === "orgs" && p[3] === "questionnaires") {
      return sendJson(
        res,
        200,
        await h.draftQuestionnaire(p[2]!, String(body.scanId), (body.format as never) ?? "csv", String(body.content)),
      );
    }
    // POST /v1/orgs/:org/fleet/servers { name, endpointOrRepo, configHash }
    if (M === "POST" && p[1] === "orgs" && p[3] === "fleet" && p[4] === "servers") {
      return sendJson(
        res,
        201,
        await h.registerFleetServer(
          p[2]!,
          String(body.name),
          String(body.endpointOrRepo),
          String(body.configHash ?? ""),
        ),
      );
    }
    // GET /v1/orgs/:org/fleet
    if (M === "GET" && p[1] === "orgs" && p[3] === "fleet" && p.length === 4) {
      return sendJson(res, 200, await h.fleetView(p[2]!));
    }
    // POST /v1/fleet/servers/:id/rescan { path }
    if (M === "POST" && p[1] === "fleet" && p[2] === "servers" && p[4] === "rescan") {
      return sendJson(res, 200, await h.scanFleetServer(p[3]!, String(body.path)));
    }
    // POST /v1/runner/results
    if (M === "POST" && p[1] === "runner" && p[2] === "results") {
      return sendJson(
        res,
        201,
        await h.ingestRunnerResults(String(body.orgId ?? q.get("orgId")), body.document ?? body),
      );
    }
    // POST /v1/benchmark/publish { tool, corpusVersion, labels, detections }
    if (M === "POST" && p[1] === "benchmark" && p[2] === "publish") {
      return sendJson(
        res,
        201,
        await h.publishBenchmark(
          String(body.tool),
          String(body.corpusVersion),
          body.labels as never,
          body.detections as never,
        ),
      );
    }
    // GET /v1/public/benchmark[/:corpusVersion]
    if (M === "GET" && p[1] === "public" && p[2] === "benchmark") {
      return sendJson(res, 200, await h.getPublicBenchmark(p[3]));
    }
    // GET /v1/orgs/:org
    if (M === "GET" && p[1] === "orgs" && p.length === 3) {
      return sendJson(res, 200, await h.getOrg(p[2]!));
    }
    // GET /v1/orgs/:org/repos
    if (M === "GET" && p[1] === "orgs" && p.length === 4 && p[3] === "repos") {
      return sendJson(res, 200, await h.listRepos(p[2]!));
    }
    sendJson(res, 404, { error: "not found" });
  }

  return { server, store };
}

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(data));
}

function sendError(res: http.ServerResponse, err: unknown): void {
  if (err instanceof NotFoundError) return sendJson(res, 404, { error: err.message });
  if (err instanceof ForbiddenError || err instanceof PlanTierError)
    return sendJson(res, 403, { error: (err as Error).message });
  if (err instanceof RunnerUploadError) return sendJson(res, 422, { error: err.message });
  sendJson(res, 500, { error: (err as Error).message });
}

async function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  if (req.method !== "POST") return {};
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
