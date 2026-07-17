import { describe, it, expect } from "vitest";
import { toSarif } from "../src/index.js";
import type { FindingsDocument, Finding, Surface, Severity } from "../src/index.js";

function makeVerifiedFinding(overrides?: Partial<Finding & { classId: string; severity: Severity }>): Finding {
  return {
    fingerprint: "sha256:verified-1",
    tier: "verified",
    classId: "exposed-secret",
    severity: "critical",
    surfaces: ["app_code"] as Surface[],
    locations: [{ path: "dist/bundle.js", startLine: 10, endLine: 10, surface: "app_code" as Surface }],
    explanation: "AWS key exposed in client bundle.",
    reproduction: { kind: "inspection" as const, steps: ["Open dist/bundle.js:10"], expected: "Key visible" },
    ...overrides,
  } as Finding;
}

function makeResearchFinding(
  overrides?: Partial<Finding & { classId: string; severity: Severity; confidence: number }>,
): Finding {
  return {
    fingerprint: "sha256:research-1",
    tier: "research",
    classId: "tool-poisoning",
    severity: "high",
    surfaces: ["tool_defs"] as Surface[],
    locations: [{ path: "mcp/tools.json", startLine: 3, endLine: 8, surface: "tool_defs" as Surface }],
    explanation: "Tool description embeds instruction that redirects model behavior.",
    confidence: 0.72,
    ...overrides,
  } as Finding;
}

function makeDoc(findings: Finding[]): FindingsDocument {
  return {
    schema: "gatepass.findings/1",
    scan: {
      id: "test-scan-1",
      rulesetVersion: "1.0.0",
      executionMode: "cli",
      surfacesScanned: ["app_code", "tool_defs"] as Surface[],
    },
    findings,
  };
}

describe("toSarif", () => {
  it("returns a valid SARIF 2.1.0 object with version and $schema", () => {
    const doc = makeDoc([]);
    const result = toSarif(doc) as Record<string, unknown>;
    expect(result.version).toBe("2.1.0");
    expect(result.$schema).toBe("https://json.schemastore.org/sarif-2.1.0.json");
  });

  it("maps critical severity to error level", () => {
    const doc = makeDoc([makeVerifiedFinding({ severity: "critical" })]);
    const result = toSarif(doc) as any;
    expect(result.runs[0].results[0].level).toBe("error");
  });

  it("maps high severity to error level", () => {
    const doc = makeDoc([makeResearchFinding({ severity: "high" })]);
    const result = toSarif(doc) as any;
    expect(result.runs[0].results[0].level).toBe("error");
  });

  it("maps medium severity to warning level", () => {
    const doc = makeDoc([makeVerifiedFinding({ severity: "medium" })]);
    const result = toSarif(doc) as any;
    expect(result.runs[0].results[0].level).toBe("warning");
  });

  it("maps low severity to note level", () => {
    const doc = makeDoc([makeVerifiedFinding({ severity: "low" })]);
    const result = toSarif(doc) as any;
    expect(result.runs[0].results[0].level).toBe("note");
  });

  it("includes tier and confidence in properties for research findings", () => {
    const doc = makeDoc([makeResearchFinding({ confidence: 0.72 })]);
    const result = toSarif(doc) as any;
    const props = result.runs[0].results[0].properties;
    expect(props.tier).toBe("research");
    expect(props.confidence).toBe(0.72);
  });

  it("includes tier in properties but NOT confidence for verified findings", () => {
    const doc = makeDoc([makeVerifiedFinding()]);
    const result = toSarif(doc) as any;
    const props = result.runs[0].results[0].properties;
    expect(props.tier).toBe("verified");
    expect(props.confidence).toBeUndefined();
  });

  it("includes severity in properties for all findings", () => {
    const doc = makeDoc([makeVerifiedFinding({ severity: "critical" })]);
    const result = toSarif(doc) as any;
    expect(result.runs[0].results[0].properties.severity).toBe("critical");
  });

  it("creates a rules array with unique rule IDs", () => {
    const doc = makeDoc([
      makeVerifiedFinding({ classId: "rule-1" }),
      makeResearchFinding({ classId: "rule-1" }),
      makeVerifiedFinding({ classId: "rule-2" }),
    ]);
    const result = toSarif(doc) as any;
    const rules = result.runs[0].tool.driver.rules;
    expect(rules).toHaveLength(2);
    const ruleIds = rules.map((r: { id: string }) => r.id).sort();
    expect(ruleIds).toEqual(["rule-1", "rule-2"]);
  });

  it("sets tool driver name and version from scan metadata", () => {
    const doc = makeDoc([]);
    const result = toSarif(doc) as any;
    expect(result.runs[0].tool.driver.name).toBe("Gatepass");
    expect(result.runs[0].tool.driver.semanticVersion).toBe("1.0.0");
  });

  it("includes result message text from finding explanation", () => {
    const doc = makeDoc([makeVerifiedFinding({ explanation: "Custom explanation." })]);
    const result = toSarif(doc) as any;
    expect(result.runs[0].results[0].message.text).toBe("Custom explanation.");
  });

  it("includes partialFingerprints with gatepassFingerprint", () => {
    const doc = makeDoc([makeVerifiedFinding({ fingerprint: "sha256:abc123" })]);
    const result = toSarif(doc) as any;
    expect(result.runs[0].results[0].partialFingerprints.gatepassFingerprint).toBe("sha256:abc123");
  });
});
