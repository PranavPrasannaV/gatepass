import { describe, it, expect } from "vitest";
import { evaluateGate, buildReview, type GateConfig } from "../src/index.js";
import type { Finding } from "@gatepass/findings";

const verified: Finding = {
  fingerprint: "sha256:a", tier: "verified", classId: "exposed-secret", severity: "critical",
  surfaces: ["app_code"], locations: [{ path: "a.js", startLine: 1, endLine: 1, surface: "app_code" }],
  explanation: "secret", reproduction: { kind: "inspection", steps: ["look"], expected: "leak" },
};
const research: Finding = {
  fingerprint: "sha256:b", tier: "research", classId: "tool-poisoning", severity: "medium",
  surfaces: ["tool_defs"], locations: [{ path: "t.json", startLine: 2, endLine: 2, surface: "tool_defs" }],
  explanation: "maybe poisoned", confidence: 0.6,
};

describe("CI gate decision (FR-016, FR-016a)", () => {
  const failOpen: GateConfig = { mode: "block_verified", failureMode: "fail_open" };

  it("blocks on a verified finding in block_verified mode", () => {
    const r = evaluateGate(failOpen, { findings: [verified, research], scanCompleted: true });
    expect(r.conclusion).toBe("failure");
    expect(r.blocking).toHaveLength(1);
  });

  it("does not block on research-only findings in block_verified mode", () => {
    const r = evaluateGate(failOpen, { findings: [research], scanCompleted: true });
    expect(r.conclusion).toBe("success");
  });

  it("fails OPEN (neutral) when the scan did not complete", () => {
    const r = evaluateGate(failOpen, { scanCompleted: false });
    expect(r.conclusion).toBe("neutral");
  });

  it("fails CLOSED (failure) on incomplete scan when configured", () => {
    const r = evaluateGate({ mode: "block_verified", failureMode: "fail_closed" }, { scanCompleted: false });
    expect(r.conclusion).toBe("failure");
  });

  it("block_threshold respects minSeverity and maxAllowed", () => {
    const cfg: GateConfig = { mode: "block_threshold", failureMode: "fail_open", threshold: { minSeverity: "high", maxAllowed: 0 } };
    expect(evaluateGate(cfg, { findings: [research], scanCompleted: true }).conclusion).toBe("success"); // medium < high
    expect(evaluateGate(cfg, { findings: [verified], scanCompleted: true }).conclusion).toBe("failure"); // critical >= high
  });

  it("off mode never blocks", () => {
    const r = evaluateGate({ mode: "off", failureMode: "fail_open" }, { findings: [verified], scanCompleted: true });
    expect(r.conclusion).toBe("neutral");
  });
});

describe("PR review builder (FR-012)", () => {
  it("emits COMMENT event (never auto-changing) with per-finding comments", () => {
    const review = buildReview([verified, research]);
    expect(review.event).toBe("COMMENT");
    expect(review.comments).toHaveLength(2);
  });

  it("shows a reproduction for verified and confidence for research", () => {
    const review = buildReview([verified, research]);
    expect(review.comments[0]!.body).toContain("Reproduction");
    expect(review.comments[1]!.body).toContain("confidence");
  });

  it("summary states suggestions are advisory", () => {
    expect(buildReview([verified]).summary).toMatch(/advisory|approve/i);
  });
});
