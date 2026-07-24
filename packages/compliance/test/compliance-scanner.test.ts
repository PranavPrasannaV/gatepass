import { describe, it, expect } from "vitest";
import type { ScanContext } from "@gatepass/engine";
import {
  runComplianceScan,
  getScanners,
  complianceResultSchema,
  COMPLIANCE_RULES,
  COMPLIANCE_DOMAINS,
  type ComplianceCheck,
} from "../src/index.js";

/** Build a ScanContext from a { path: content } map, no filesystem needed. */
function ctxOf(files: Record<string, string>): ScanContext {
  return {
    root: "/virtual",
    files: Object.entries(files).map(([relPath, content]) => ({
      relPath,
      absPath: `/virtual/${relPath}`,
      content,
      surfaces: ["app_code"],
    })),
    surfacesPresent: ["app_code"],
  } as ScanContext;
}

const findCheck = (checks: ComplianceCheck[], ruleId: string) => checks.find((c) => c.ruleId === ruleId);

describe("scanner registry", () => {
  it("registers all five domain scanners exactly once (idempotent)", () => {
    const scanners = getScanners();
    expect(scanners).toHaveLength(5);
    const domains = scanners.map((s) => s.domain).sort();
    expect(domains).toEqual([...COMPLIANCE_DOMAINS].sort());
  });

  it("returns scanners in a deterministic order", () => {
    expect(getScanners().map((s) => s.domain)).toEqual(getScanners().map((s) => s.domain));
  });
});

describe("runComplianceScan aggregate", () => {
  const result = runComplianceScan(ctxOf({ "app/page.tsx": "export const x = 1;" }), "scan-1");

  it("produces a schema-valid ComplianceResult", () => {
    expect(() => complianceResultSchema.parse(result)).not.toThrow();
  });

  it("counts every check into exactly one status bucket", () => {
    const sum = result.passCount + result.failCount + result.naCount + result.manualCount;
    expect(sum).toBe(result.totalChecks);
    expect(result.totalChecks).toBe(result.checks.length);
  });

  it("scores over APPLICABLE checks only (not-applicable and manual excluded)", () => {
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    const applicable = result.passCount + result.failCount;
    const expected = applicable === 0 ? 100 : Math.round(Math.max(0, 100 - (result.failCount / applicable) * 100));
    expect(result.score).toBe(expected);
  });

  it("does not fail Apple/Google-Play rules on a web-only project (applicability gating)", () => {
    // The dominant false-positive class: a Next.js app has no iOS/Android target, so those
    // domains must be not_applicable, never fail.
    const mobile = result.checks.filter((c) => c.domain === "app_store" || c.domain === "google_play");
    expect(mobile.length).toBeGreaterThan(0);
    for (const c of mobile) expect(c.status).toBe("not_applicable");
  });

  it("emits per-domain rollups whose totals sum to the overall total", () => {
    const domainTotal = Object.values(result.byDomain).reduce((n, d) => n + (d?.total ?? 0), 0);
    expect(domainTotal).toBe(result.totalChecks);
  });

  it("only emits checks whose ruleId exists in the rules registry", () => {
    const known = new Set(COMPLIANCE_RULES.map((r) => r.id));
    for (const c of result.checks) expect(known).toContain(c.ruleId);
  });

  it("never emits duplicate ruleIds (double registration would corrupt the score)", () => {
    const ids = result.checks.map((c) => c.ruleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("attaches a suggested fix to every failing check (remediation requirement)", () => {
    for (const c of result.checks.filter((x) => x.status === "fail")) {
      expect(c.fix, `rule ${c.ruleId} failed without a fix`).toBeDefined();
      expect(c.fix!.description.length).toBeGreaterThan(0);
    }
  });
});

describe("WCAG target size (SC 2.5.8)", () => {
  it("flags a small INTERACTIVE target and cites a real file and line", () => {
    const checks = runComplianceScan(
      ctxOf({ "src/ui.css": ".btn {\n  cursor: pointer;\n  height: 16px;\n}\n" }),
      "s",
    ).checks;
    const c = findCheck(checks, "wcag-target-size")!;
    expect(c.status).toBe("fail");
    // The reproduction must point at the real file, not a synthetic buffer.
    expect(c.locations[0]!.path).toBe("src/ui.css");
    expect(c.locations[0]!.startLine).toBe(3);
    expect(c.fix?.diff).toContain("src/ui.css");
  });

  it("does NOT flag a small dimension on a non-interactive element", () => {
    const checks = runComplianceScan(
      ctxOf({ "src/ui.css": ".divider {\n  height: 2px;\n  background: #eee;\n}\n" }),
      "s",
    ).checks;
    expect(findCheck(checks, "wcag-target-size")!.status).toBe("pass");
  });

  it("honours the Spacing exception (>=24px offset around the target)", () => {
    const checks = runComplianceScan(
      ctxOf({ "src/ui.css": ".btn {\n  cursor: pointer;\n  height: 16px;\n  margin: 32px;\n}\n" }),
      "s",
    ).checks;
    expect(findCheck(checks, "wcag-target-size")!.status).toBe("pass");
  });

  it("honours the Inline exception (target inside a sentence of text)", () => {
    const checks = runComplianceScan(
      ctxOf({ "src/ui.css": ".inline-link {\n  display: inline;\n  cursor: pointer;\n  height: 16px;\n}\n" }),
      "s",
    ).checks;
    expect(findCheck(checks, "wcag-target-size")!.status).toBe("pass");
  });

  it("ignores non-px units it cannot compare to the 24 CSS px floor", () => {
    const checks = runComplianceScan(
      ctxOf({ "src/ui.css": ".btn {\n  cursor: pointer;\n  height: 1rem;\n}\n" }),
      "s",
    ).checks;
    expect(findCheck(checks, "wcag-target-size")!.status).toBe("pass");
  });
});

describe("WCAG contrast (SC 1.4.3 / 1.4.11)", () => {
  it("fails a genuinely low-contrast pair and reports the computed ratio", () => {
    const checks = runComplianceScan(
      ctxOf({ "src/a.css": "body {\n  background: #ffffff;\n  color: #cccccc;\n}\n" }),
      "s",
    ).checks;
    const c = findCheck(checks, "wcag-text-contrast")!;
    expect(c.status).toBe("fail");
    expect(c.locations[0]!.path).toBe("src/a.css");
    expect(c.locations[0]!.snippet).toMatch(/\d\.\d\d:1/);
    // The fix must carry a real replacement colour, not a template.
    expect(c.fix?.diff).toMatch(/#[0-9a-f]{6}/i);
  });

  it("passes a high-contrast pair", () => {
    const checks = runComplianceScan(
      ctxOf({ "src/a.css": "body {\n  background: #ffffff;\n  color: #111111;\n}\n" }),
      "s",
    ).checks;
    expect(findCheck(checks, "wcag-text-contrast")!.status).toBe("pass");
  });

  it("reports manual_review — not a false fail — when the background is unresolvable", () => {
    const checks = runComplianceScan(
      ctxOf({ "src/a.css": ".x {\n  color: var(--muted);\n}\n.y {\n  color: #888888;\n}\n" }),
      "s",
    ).checks;
    expect(findCheck(checks, "wcag-text-contrast")!.status).toBe("manual_review");
  });

  it("does not regress on dark colours with high leading hex digits", () => {
    const checks = runComplianceScan(
      ctxOf({ "src/a.css": "body {\n  background: #ffffff;\n  color: #8B0000;\n}\n" }),
      "s",
    ).checks;
    expect(findCheck(checks, "wcag-text-contrast")!.status).toBe("pass");
  });
});

describe("every failing check is actionable", () => {
  it("produces locations that point at files present in the scanned tree", () => {
    const files = {
      "src/ui.css": ".btn { cursor: pointer; height: 12px; background: #ffffff; color: #dddddd; }",
      "app/login.tsx": "export const Login = () => <div>captcha</div>;",
    };
    const result = runComplianceScan(ctxOf(files), "s");
    const known = new Set(Object.keys(files));
    for (const check of result.checks) {
      for (const loc of check.locations) {
        // Either a real scanned file, or an explicit non-file marker — never a fake path
        // masquerading as source.
        if (loc.path.startsWith("(")) continue;
        expect(known, `check ${check.ruleId} cited unknown path ${loc.path}`).toContain(loc.path);
      }
    }
  });
});
