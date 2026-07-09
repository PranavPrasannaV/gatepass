import http from "node:http";
import { URL } from "node:url";
import { MemoryStore } from "./store.js";
import { makeHandlers, NotFoundError } from "./handlers.js";
import { PlanTierError } from "@gatepass/shared";

/**
 * Thin HTTP binding over the handlers. This is a minimal Node http server standing in for
 * the production Fastify app (plan §Primary Dependencies) — it exists so the platform wiring
 * is genuinely runnable end-to-end. Routes mirror contracts/api.md.
 */

export function createServer(store = new MemoryStore()): { server: http.Server; store: MemoryStore } {
  const h = makeHandlers(store);

  const server = http.createServer((req, res) => {
    void handle(req, res).catch((err) => sendError(res, err));
  });

  async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean); // e.g. v1, orgs, :org, scans
    const body = await readBody(req);

    // POST /v1/orgs/:org/scans  { path }
    if (req.method === "POST" && parts[0] === "v1" && parts[1] === "orgs" && parts[3] === "scans") {
      const result = await h.createScan(parts[2]!, String(body.path));
      return sendJson(res, 201, result);
    }
    // GET /v1/scans/:id/findings(.sarif)
    if (req.method === "GET" && parts[0] === "v1" && parts[1] === "scans" && parts[3] === "findings") {
      return sendJson(res, 200, h.getFindings(parts[2]!));
    }
    if (req.method === "GET" && parts[0] === "v1" && parts[1] === "scans" && parts[3] === "findings.sarif") {
      return sendJson(res, 200, h.getSarif(parts[2]!));
    }
    // POST /v1/scans/:id/gate  { mode, failureMode, threshold? }
    if (req.method === "POST" && parts[0] === "v1" && parts[1] === "scans" && parts[3] === "gate") {
      return sendJson(res, 200, h.evaluateGate(parts[2]!, body as never));
    }
    // POST /v1/findings/:fingerprint/dispute  { scanId, reason }
    if (req.method === "POST" && parts[0] === "v1" && parts[1] === "findings" && parts[3] === "dispute") {
      return sendJson(res, 200, h.disputeFinding(String(body.scanId), parts[2]!, String(body.reason)));
    }
    // GET /v1/orgs/:org/evidence?scanId=
    if (req.method === "GET" && parts[0] === "v1" && parts[1] === "orgs" && parts[3] === "evidence") {
      return sendJson(res, 200, h.getEvidence(parts[2]!, url.searchParams.get("scanId") ?? ""));
    }
    sendJson(res, 404, { error: "not found" });
  }

  return { server, store };
}

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  const payload = JSON.stringify(data);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

function sendError(res: http.ServerResponse, err: unknown): void {
  if (err instanceof NotFoundError) return sendJson(res, 404, { error: err.message });
  if (err instanceof PlanTierError) return sendJson(res, 403, { error: err.message });
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
