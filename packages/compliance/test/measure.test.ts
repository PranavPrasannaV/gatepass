import { describe, it, expect } from "vitest";
import { runComplianceMeasurement } from "../src/measure.js";
import { COMPLIANCE_FIXTURES } from "../corpus/fixtures.js";
import { COMPLIANCE_RULES } from "../src/index.js";

const result = runComplianceMeasurement(COMPLIANCE_FIXTURES);

describe("compliance precision measurement (corpus gate)", () => {
  it("every fixture resolves to its expected outcome (0 issues)", () => {
    // A non-empty issues list means a rule produced a false positive, a false negative, or the
    // wrong status for a manual rule. The message names each offender.
    const detail = result.issues
      .map((i) => `${i.ruleId} [${i.label}] ${i.reason}, got '${i.actualStatus}' — ${i.note}`)
      .join("\n");
    expect(result.issues, `\n${detail}`).toHaveLength(0);
  });

  it("0% false-positive rate across all clean fixtures", () => {
    expect(result.overallFpRate).toBe(0);
  });

  it("100% recall across all vulnerable fixtures", () => {
    expect(result.overallTpRate).toBe(1);
  });

  it("covers every scannable rule with at least one fixture", () => {
    // Manual-review rules are exercised by `manual` fixtures; scannable rules need vuln+clean.
    const measured = new Set(COMPLIANCE_FIXTURES.map((f) => f.ruleId));
    const missing = COMPLIANCE_RULES.filter((r) => r.scannable && !measured.has(r.id)).map((r) => r.id);
    expect(missing, `rules with no fixture: ${missing.join(", ")}`).toHaveLength(0);
  });

  it("has both a vulnerable and a clean fixture for every scannable rule it measures", () => {
    const scannable = new Set(COMPLIANCE_RULES.filter((r) => r.scannable).map((r) => r.id));
    const byRule = new Map<string, Set<string>>();
    for (const f of COMPLIANCE_FIXTURES) {
      if (!byRule.has(f.ruleId)) byRule.set(f.ruleId, new Set());
      byRule.get(f.ruleId)!.add(f.label);
    }
    const incomplete: string[] = [];
    for (const [ruleId, labels] of byRule) {
      if (!scannable.has(ruleId)) continue;
      if (labels.has("manual")) continue; // manual rules are single-fixture by nature
      if (!labels.has("vulnerable") || !labels.has("clean")) incomplete.push(ruleId);
    }
    expect(incomplete, `rules missing a vuln/clean pair: ${incomplete.join(", ")}`).toHaveLength(0);
  });
});
