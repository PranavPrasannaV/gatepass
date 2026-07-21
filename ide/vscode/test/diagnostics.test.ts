import { describe, it, expect } from "vitest";
import { findingsToDiagnostics, findingToDiagnostic } from "../src/diagnostics.js";
import type { Finding, FindingsDocument } from "@gatepass/findings";

const verified: Finding = {
  fingerprint: "sha256:a",
  tier: "verified",
  classId: "exposed-secret",
  severity: "critical",
  surfaces: ["app_code"],
  locations: [{ path: "dist/app.js", startLine: 12, endLine: 12, surface: "app_code" }],
  explanation: "AWS key in bundle.",
  reproduction: { kind: "inspection", steps: ["s"], expected: "e" },
};
const research: Finding = {
  fingerprint: "sha256:b",
  tier: "research",
  classId: "tool-poisoning",
  severity: "medium",
  surfaces: ["tool_defs"],
  locations: [{ path: "mcp/tools.json", startLine: 3, endLine: 3, surface: "tool_defs" }],
  explanation: "Injection cue in tool description.",
  confidence: 0.72,
};

describe("VS Code diagnostics conversion (FR-013/T078)", () => {
  it("verified critical maps to error and is labelled verified", () => {
    const d = findingToDiagnostic(verified);
    expect(d.severity).toBe("error");
    expect(d.source).toBe("Gatepass");
    expect(d.code).toBe("exposed-secret");
    expect(d.message).toContain("(verified)");
    expect(d.path).toBe("dist/app.js");
    expect(d.startLine).toBe(12);
  });

  it("research tier maps to information and always shows confidence (never error)", () => {
    const d = findingToDiagnostic(research);
    expect(d.severity).toBe("information");
    expect(d.message).toContain("72% confidence");
  });

  it("converts a whole document", () => {
    const doc: FindingsDocument = {
      schema: "gatepass.findings/1",
      scan: { id: "s", rulesetVersion: "v", executionMode: "cli", surfacesScanned: ["app_code"] },
      findings: [verified, research],
    };
    expect(findingsToDiagnostics(doc)).toHaveLength(2);
  });
});
