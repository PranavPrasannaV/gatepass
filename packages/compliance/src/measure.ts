import type { ScanContext, ScanFile } from "@gatepass/engine";
import { runComplianceScan } from "./compliance-scanner.js";
import type { ComplianceStatus } from "./compliance-schema.js";

/**
 * Compliance precision measurement (Constitution Principle I & III: every rule ships fixtures
 * and a measured precision, or it does not merge). This is the compliance-domain analogue of
 * `corpus/harness/measure.ts` for the security detectors.
 *
 * A fixture pins a single rule to an expected outcome on a specific tree:
 *  - `vulnerable` fixtures MUST produce a `fail` for their rule (else a false negative).
 *  - `clean` fixtures MUST NOT produce a `fail` for their rule (a `fail` is a false positive).
 *  - `manual` fixtures assert a rule that can only be `manual_review`.
 * Fixtures also carry the surrounding files needed to make the domain APPLICABLE, so a mobile
 * rule is measured inside a mobile project and the EU AI Act inside an AI system.
 */

export type FixtureLabel = "vulnerable" | "clean" | "manual";

export interface ComplianceFixture {
  ruleId: string;
  label: FixtureLabel;
  note: string;
  files: Record<string, string>;
}

function toContext(files: Record<string, string>): ScanContext {
  const scanFiles: ScanFile[] = Object.entries(files).map(([relPath, content]) => ({
    relPath,
    absPath: `/virtual/${relPath}`,
    content,
    surfaces: ["app_code"],
  }));
  return { root: "/virtual", files: scanFiles, surfacesPresent: ["app_code"] } as ScanContext;
}

export interface RuleMetrics {
  ruleId: string;
  vulnerable: number;
  clean: number;
  truePositives: number;
  falseNegatives: number;
  falsePositives: number;
  trueNegatives: number;
  tpRate: number; // recall over vulnerable fixtures
  fpRate: number; // false positives over clean fixtures
}

export interface FixtureIssue {
  ruleId: string;
  label: FixtureLabel;
  note: string;
  reason: string;
  actualStatus: ComplianceStatus | "absent";
}

export interface ComplianceMeasureResult {
  perRule: RuleMetrics[];
  fixturesMeasured: number;
  overallTpRate: number;
  overallFpRate: number;
  issues: FixtureIssue[];
}

export function runComplianceMeasurement(fixtures: readonly ComplianceFixture[]): ComplianceMeasureResult {
  const byRule = new Map<string, RuleMetrics>();
  const ensure = (ruleId: string): RuleMetrics => {
    let m = byRule.get(ruleId);
    if (!m) {
      m = {
        ruleId,
        vulnerable: 0,
        clean: 0,
        truePositives: 0,
        falseNegatives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        tpRate: 0,
        fpRate: 0,
      };
      byRule.set(ruleId, m);
    }
    return m;
  };

  const issues: FixtureIssue[] = [];

  for (const fx of fixtures) {
    const result = runComplianceScan(toContext(fx.files), `fixture:${fx.ruleId}:${fx.label}`);
    const check = result.checks.find((c) => c.ruleId === fx.ruleId);
    const status: ComplianceStatus | "absent" = check?.status ?? "absent";
    const m = ensure(fx.ruleId);

    if (fx.label === "vulnerable") {
      m.vulnerable++;
      if (status === "fail") m.truePositives++;
      else {
        m.falseNegatives++;
        issues.push({
          ruleId: fx.ruleId,
          label: fx.label,
          note: fx.note,
          reason: "expected fail",
          actualStatus: status,
        });
      }
    } else if (fx.label === "clean") {
      m.clean++;
      if (status === "fail") {
        m.falsePositives++;
        issues.push({
          ruleId: fx.ruleId,
          label: fx.label,
          note: fx.note,
          reason: "expected non-fail (false positive)",
          actualStatus: status,
        });
      } else {
        m.trueNegatives++;
      }
    } else {
      // manual: the rule can only be resolved by a human; assert the scanner says so.
      if (status !== "manual_review") {
        issues.push({
          ruleId: fx.ruleId,
          label: fx.label,
          note: fx.note,
          reason: "expected manual_review",
          actualStatus: status,
        });
      }
    }
  }

  let tp = 0,
    vuln = 0,
    fp = 0,
    clean = 0;
  for (const m of byRule.values()) {
    m.tpRate = m.vulnerable ? m.truePositives / m.vulnerable : 1;
    m.fpRate = m.clean ? m.falsePositives / m.clean : 0;
    tp += m.truePositives;
    vuln += m.vulnerable;
    fp += m.falsePositives;
    clean += m.clean;
  }

  return {
    perRule: [...byRule.values()].sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
    fixturesMeasured: fixtures.length,
    overallTpRate: vuln ? tp / vuln : 1,
    overallFpRate: clean ? fp / clean : 0,
    issues,
  };
}
