import { describe, it, expect } from "vitest";
import { ApiEvidenceExporter, NoEvidenceError, evaluatePosture, type Scan } from "../src/index.js";

const scan: Scan = { id: "scan-1", rulesetVersion: "2026.07.0", findings: [] };

function fakeFetch(capture: { calls: { url: string; init: any }[] }) {
  return async (url: string, init: any) => {
    capture.calls.push({ url, init });
    return { ok: true, status: 201, json: async () => ({ id: `ext-${capture.calls.length}` }) };
  };
}

describe("compliance evidence exporters (FR-021/T083)", () => {
  it("pushes each posture item to Vanta with a bearer token, returns external ids", async () => {
    const items = evaluatePosture(scan);
    const cap = { calls: [] as { url: string; init: any }[] };
    const exporter = new ApiEvidenceExporter("vanta", "vtoken", fakeFetch(cap) as any);
    const result = await exporter.export(items);

    expect(result.platform).toBe("vanta");
    expect(result.delivered).toBe(items.length);
    expect(result.externalIds).toHaveLength(items.length);
    expect(cap.calls[0]!.url).toContain("api.vanta.com");
    expect(cap.calls[0]!.init.headers.authorization).toBe("Bearer vtoken");
    const body = JSON.parse(cap.calls[0]!.init.body);
    expect(body.scanId).toBe("scan-1"); // traceable (SC-008)
    expect(body.source).toBe("gatepass");
  });

  it("targets the Drata endpoint for the drata platform", async () => {
    const cap = { calls: [] as { url: string; init: any }[] };
    const exporter = new ApiEvidenceExporter("drata", "dtoken", fakeFetch(cap) as any);
    await exporter.export(evaluatePosture(scan));
    expect(cap.calls[0]!.url).toContain("drata.com");
  });

  it("refuses to export when there is no evidence (FR-023)", async () => {
    const exporter = new ApiEvidenceExporter("vanta", "t", (async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    })) as any);
    await expect(exporter.export([])).rejects.toThrow(NoEvidenceError);
  });

  it("throws on a non-ok platform response", async () => {
    const exporter = new ApiEvidenceExporter("vanta", "t", (async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    })) as any);
    await expect(exporter.export(evaluatePosture(scan))).rejects.toThrow(/401/);
  });
});
