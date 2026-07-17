import { describe, it, expect } from "vitest";
import {
  parseFinding,
  safeParseFinding,
  isCrossSurface,
  assertRedacted,
  redactSecrets,
  RedactionError,
  type Finding,
} from "../src/index.js";

const verified: Finding = {
  fingerprint: "sha256:abc",
  tier: "verified",
  classId: "exposed-secret",
  severity: "critical",
  surfaces: ["app_code"],
  locations: [{ path: "dist/bundle.js", startLine: 10, endLine: 10, surface: "app_code" }],
  explanation: "AWS key exposed in client bundle.",
  reproduction: { kind: "inspection", steps: ["Open dist/bundle.js:10"], expected: "Key visible" },
};

const research: Finding = {
  fingerprint: "sha256:def",
  tier: "research",
  classId: "tool-poisoning",
  severity: "high",
  surfaces: ["tool_defs"],
  locations: [{ path: "mcp/tools.json", startLine: 3, endLine: 8, surface: "tool_defs" }],
  explanation: "Tool description embeds instruction that redirects model behavior.",
  confidence: 0.72,
};

describe("tier integrity (Constitution Principle II)", () => {
  it("accepts a well-formed verified finding", () => {
    expect(parseFinding(verified).tier).toBe("verified");
  });

  it("accepts a well-formed research finding", () => {
    expect(parseFinding(research).tier).toBe("research");
  });

  it("REJECTS a verified finding without a reproduction (FR-008)", () => {
    const { reproduction: _reproduction, ...bad } = verified;
    expect(safeParseFinding(bad).success).toBe(false);
  });

  it("REJECTS a verified finding that carries a confidence score", () => {
    const bad = { ...verified, confidence: 0.9 };
    expect(safeParseFinding(bad).success).toBe(false);
  });

  it("REJECTS a research finding without a confidence score (FR-009)", () => {
    const { confidence: _confidence, ...bad } = research;
    expect(safeParseFinding(bad).success).toBe(false);
  });

  it("REJECTS a research finding that carries a reproduction", () => {
    const bad = { ...research, reproduction: verified.reproduction };
    expect(safeParseFinding(bad).success).toBe(false);
  });

  it("REJECTS an unknown tier — no third state (contract rule 3)", () => {
    const bad = { ...verified, tier: "confirmed" };
    expect(safeParseFinding(bad).success).toBe(false);
  });

  it("REJECTS confidence outside 0..1", () => {
    expect(safeParseFinding({ ...research, confidence: 1.5 }).success).toBe(false);
  });
});

describe("cross-surface detection (FR-002)", () => {
  it("flags findings spanning two or more surfaces", () => {
    const xs: Finding = {
      ...verified,
      surfaces: ["tool_defs", "app_code"],
      locations: [
        { path: "mcp/tools.json", startLine: 1, endLine: 2, surface: "tool_defs" },
        { path: "src/db.ts", startLine: 5, endLine: 5, surface: "app_code" },
      ],
    };
    expect(isCrossSurface(xs)).toBe(true);
    expect(isCrossSurface(verified)).toBe(false);
  });
});

describe("redaction linter (contract rule 5)", () => {
  it("throws when a reproduction leaks a secret verbatim", () => {
    const repro = { kind: "inspection" as const, steps: ["The key is AKIAEXAMPLE123"], expected: "x" };
    expect(() => assertRedacted(repro, ["AKIAEXAMPLE123"])).toThrow(RedactionError);
  });

  it("passes when secrets are redacted", () => {
    const raw = "The key is AKIAEXAMPLE123";
    const redacted = redactSecrets(raw, ["AKIAEXAMPLE123"]);
    const repro = { kind: "inspection" as const, steps: [redacted], expected: "x" };
    expect(() => assertRedacted(repro, ["AKIAEXAMPLE123"])).not.toThrow();
  });
});
