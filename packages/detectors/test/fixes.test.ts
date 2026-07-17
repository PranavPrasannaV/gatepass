import { describe, it, expect } from "vitest";
import type { Finding } from "@gatepass/findings";
import { generateSuggestedFix } from "../src/index.js";

function makeFinding(classId: string, explanation = ""): Finding {
  return {
    tier: "verified",
    fingerprint: `test-${classId}`,
    classId,
    severity: "high",
    surfaces: ["app_code"],
    locations: [{ path: "test.ts", startLine: 1, endLine: 10, surface: "app_code" }],
    explanation,
    reproduction: { kind: "command", steps: ["repro step 1"], expected: "finding reproduced" },
  };
}

describe("generateSuggestedFix", () => {
  it("returns a diff kind fix for cors-misconfig classId", () => {
    const fix = generateSuggestedFix(makeFinding("cors-misconfig"));
    expect(fix).toBeDefined();
    expect(fix!.kind).toBe("diff");
    expect(fix!.content).toContain("wildcard origin");
  });

  it("returns a diff kind fix for rls-gap classId (includes table name from explanation)", () => {
    const fix = generateSuggestedFix(makeFinding("rls-gap", 'Table "orders"'));
    expect(fix).toBeDefined();
    expect(fix!.kind).toBe("diff");
    expect(fix!.content).toContain("orders");
  });

  it("returns a diff kind fix for rls-gap with fallback table name when explanation lacks a table", () => {
    const fix = generateSuggestedFix(makeFinding("rls-gap", "no table reference here"));
    expect(fix).toBeDefined();
    expect(fix!.kind).toBe("diff");
    expect(fix!.content).toContain("your_table");
  });

  it("returns a diff kind fix for unpinned-dependency classId", () => {
    const fix = generateSuggestedFix(makeFinding("unpinned-dependency"));
    expect(fix).toBeDefined();
    expect(fix!.kind).toBe("diff");
    expect(fix!.content).toContain("Pin this dependency");
  });

  it("returns agent_guidance for unbounded-tool-param classId", () => {
    const fix = generateSuggestedFix(makeFinding("unbounded-tool-param"));
    expect(fix).toBeDefined();
    expect(fix!.kind).toBe("agent_guidance");
    expect(fix!.content).toContain("maxLength");
  });

  it("returns agent_guidance for missing-schema-validation classId", () => {
    const fix = generateSuggestedFix(makeFinding("missing-schema-validation"));
    expect(fix).toBeDefined();
    expect(fix!.kind).toBe("agent_guidance");
    expect(fix!.content).toContain("JSON schema");
  });

  it("returns undefined for exposed-secret classId (safe fallback)", () => {
    const fix = generateSuggestedFix(makeFinding("exposed-secret"));
    expect(fix).toBeUndefined();
  });

  it("returns undefined for an unknown classId", () => {
    const fix = generateSuggestedFix(makeFinding("some-unknown-class"));
    expect(fix).toBeUndefined();
  });
});
