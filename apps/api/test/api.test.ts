import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import { createServer } from "../src/server.js";
import { MemoryStore } from "../src/store.js";

let base: string;
let close: () => void;

beforeAll(async () => {
  const store = new MemoryStore();
  store.upsertOrg({ id: "demo", planTier: "scale", llmEnabled: true });
  store.upsertOrg({ id: "free-org", planTier: "free", llmEnabled: true });
  const { server } = createServer(store);
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
  close = () => server.close();
});

afterAll(() => close());

async function post(path: string, body: unknown) {
  const res = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json() };
}
async function get(path: string) {
  const res = await fetch(base + path);
  return { status: res.status, json: await res.json() };
}

describe("API integration (T013/T030/T031 wiring)", () => {
  let scanId: string;

  it("scans the eval repo and reports two-tier counts", async () => {
    const { status, json } = await post("/v1/orgs/demo/scans", { path: "corpus/eval-repos/vulnerable-nextjs-mcp" });
    expect(status).toBe(201);
    expect(json.verified).toBeGreaterThanOrEqual(3);
    expect(json.research).toBeGreaterThanOrEqual(1);
    scanId = json.scanId;
  });

  it("returns findings and SARIF for the scan", async () => {
    const findings = await get(`/v1/scans/${scanId}/findings`);
    expect(findings.json.length).toBeGreaterThan(0);
    const sarif = await get(`/v1/scans/${scanId}/findings.sarif`);
    expect(sarif.json.version).toBe("2.1.0");
  });

  it("the CI gate blocks on verified findings", async () => {
    const { json } = await post(`/v1/scans/${scanId}/gate`, { mode: "block_verified", failureMode: "fail_open" });
    expect(json.conclusion).toBe("failure");
  });

  it("records a dispute for a real finding", async () => {
    const findings = await get(`/v1/scans/${scanId}/findings`);
    const fp = findings.json[0].fingerprint;
    const { json } = await post(`/v1/findings/${fp}/dispute`, { scanId, reason: "false positive" });
    expect(json.ok).toBe(true);
  });

  it("exports evidence traceable to the scan (Scale tier)", async () => {
    const { status, json } = await get(`/v1/orgs/demo/evidence?scanId=${scanId}`);
    expect(status).toBe(200);
    expect(json.every((i: { scanId: string }) => i.scanId === scanId)).toBe(true);
  });

  it("denies evidence export to a free-tier org (403, FR-025)", async () => {
    // seed a scan under the free org
    const created = await post("/v1/orgs/free-org/scans", { path: "corpus/cases/verified/rls-gap/vuln-no-rls/tree" });
    const res = await get(`/v1/orgs/free-org/evidence?scanId=${created.json.scanId}`);
    expect(res.status).toBe(403);
  });
});
