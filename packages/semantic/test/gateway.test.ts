import { describe, it, expect, vi } from "vitest";
import { LlmGateway, parseAnalysis, type LlmTransport, type LlmRequest } from "../src/index.js";

function recordingTransport(reply: string): LlmTransport & { calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return {
    calls,
    async complete(req) {
      calls.push(req);
      return { text: reply };
    },
  };
}

describe("LLM gateway (FR-011a)", () => {
  it("makes NO call and returns disabled when org disabled analysis", async () => {
    const t = recordingTransport("CONFIDENCE: 0.9");
    const gw = new LlmGateway({ enabled: false, apiKey: "k", transport: t });
    const r = await gw.analyze("sys", "artifact");
    expect(r.enabled).toBe(false);
    expect(t.calls).toHaveLength(0);
  });

  it("returns disabled when no API key is configured", async () => {
    const gw = new LlmGateway({ enabled: true, transport: recordingTransport("x") });
    expect((await gw.analyze("s", "a")).enabled).toBe(false);
  });

  it("tags every request zero-retention", async () => {
    const t = recordingTransport("CONFIDENCE: 0.8 — likely poisoning");
    const gw = new LlmGateway({ enabled: true, apiKey: "k", transport: t });
    const r = await gw.analyze("system prompt", "tool definition text");
    expect(r.enabled).toBe(true);
    expect(t.calls[0]!.metadata.zeroRetention).toBe(true);
    expect(t.calls[0]!.metadata.purpose).toBe("gatepass-research-tier");
    expect(r.confidence).toBeCloseTo(0.8);
  });

  it("parses confidence and bounds it to [0,1]", () => {
    expect(parseAnalysis("CONFIDENCE: 0.42").confidence).toBeCloseTo(0.42);
    expect(parseAnalysis("no score here").confidence).toBe(0.5);
  });
});
