import { describe, it, expect } from "vitest";
import {
  calibrateConfidence,
  displayThreshold,
  calibrateFindings,
  computePrecision,
  computeRecall,
  DISPLAY_HIDE,
  DISPLAY_DIM,
  DISPLAY_SHOW,
} from "../src/calibration/index.js";
import type { ClassMetrics } from "../src/calibration/index.js";

const makeMetrics = (overrides: Partial<ClassMetrics> & { classId: string }): ClassMetrics => ({
  truePositives: 10,
  falsePositives: 2,
  falseNegatives: 1,
  vulnerable: 11,
  clean: 50,
  ...overrides,
});

describe("computePrecision", () => {
  it("returns TP / (TP + FP)", () => {
    expect(computePrecision(makeMetrics({ classId: "x", truePositives: 8, falsePositives: 2 }))).toBeCloseTo(0.8, 4);
  });

  it("returns 1 when no predictions exist", () => {
    expect(computePrecision(makeMetrics({ classId: "x", truePositives: 0, falsePositives: 0 }))).toBe(1);
  });

  it("returns 0 when no true positives", () => {
    expect(computePrecision(makeMetrics({ classId: "x", truePositives: 0, falsePositives: 5 }))).toBe(0);
  });
});

describe("computeRecall", () => {
  it("returns TP / vulnerable", () => {
    expect(computeRecall(makeMetrics({ classId: "x", truePositives: 9, vulnerable: 10 }))).toBeCloseTo(0.9, 4);
  });

  it("returns 1 when no vulnerable cases", () => {
    expect(computeRecall(makeMetrics({ classId: "x", vulnerable: 0 }))).toBe(1);
  });

  it("returns 0 when no true positives", () => {
    expect(computeRecall(makeMetrics({ classId: "x", truePositives: 0, vulnerable: 5 }))).toBe(0);
  });
});

describe("calibrateConfidence", () => {
  it("preserves confidence when precision is 1 (perfect)", () => {
    const m = makeMetrics({ classId: "sql-injection", truePositives: 20, falsePositives: 0, vulnerable: 20 });
    const { calibrated, precision, recall } = calibrateConfidence("sql-injection", 0.85, m);
    expect(calibrated).toBeCloseTo(0.85, 3);
    expect(precision).toBe(1);
    expect(recall).toBeCloseTo(1, 3);
  });

  it("scales confidence by precision when precision < 1", () => {
    const m = makeMetrics({ classId: "noisy-detector", truePositives: 10, falsePositives: 30 });
    const { calibrated, precision } = calibrateConfidence("noisy-detector", 0.8, m);
    // precision = 10/40 = 0.25, calibrated = 0.8 * 0.25 = 0.2
    expect(precision).toBeCloseTo(0.25, 3);
    expect(calibrated).toBeCloseTo(0.2, 3);
  });

  it("returns raw confidence unchanged when no metrics exist", () => {
    const { calibrated, precision, recall } = calibrateConfidence("brand-new-class", 0.75, undefined);
    expect(calibrated).toBe(0.75);
    expect(precision).toBe(0);
    expect(recall).toBe(0);
  });

  it("clamps raw confidence to [0, 1]", () => {
    const m = makeMetrics({ classId: "bounds" });
    const low = calibrateConfidence("bounds", -0.5, m);
    expect(low.calibrated).toBeGreaterThanOrEqual(0);

    const high = calibrateConfidence("bounds", 1.5, m);
    expect(high.calibrated).toBeLessThanOrEqual(1);
  });

  it("returns calibrated=0 when confidence=0", () => {
    const m = makeMetrics({ classId: "zero" });
    expect(calibrateConfidence("zero", 0, m).calibrated).toBe(0);
  });

  it("computes recall correctly from metrics", () => {
    const m = makeMetrics({ classId: "r-test", truePositives: 7, vulnerable: 10 });
    const { recall } = calibrateConfidence("r-test", 0.9, m);
    expect(recall).toBeCloseTo(0.7, 3);
  });
});

describe("displayThreshold", () => {
  it('returns "hide" for confidence < 0.3', () => {
    expect(displayThreshold(DISPLAY_HIDE - 0.01)).toBe("hide");
    expect(displayThreshold(0)).toBe("hide");
    expect(displayThreshold(0.29)).toBe("hide");
  });

  it('returns "dim" for [0.3, 0.5)', () => {
    expect(displayThreshold(DISPLAY_HIDE)).toBe("dim");
    expect(displayThreshold(0.3)).toBe("dim");
    expect(displayThreshold(0.4)).toBe("dim");
    expect(displayThreshold(DISPLAY_DIM - 0.01)).toBe("dim");
  });

  it('returns "show" for [0.5, 0.8)', () => {
    expect(displayThreshold(DISPLAY_DIM)).toBe("show");
    expect(displayThreshold(0.6)).toBe("show");
    expect(displayThreshold(DISPLAY_SHOW - 0.01)).toBe("show");
  });

  it('returns "highlight" for [0.8, 1]', () => {
    expect(displayThreshold(DISPLAY_SHOW)).toBe("highlight");
    expect(displayThreshold(0.9)).toBe("highlight");
    expect(displayThreshold(1)).toBe("highlight");
  });
});

describe("calibrateFindings", () => {
  const metricsByClass = new Map<string, ClassMetrics>([
    ["known-good", makeMetrics({ classId: "known-good", truePositives: 20, falsePositives: 1 })],
    ["noisy", makeMetrics({ classId: "noisy", truePositives: 5, falsePositives: 45 })],
  ]);

  it("calibrates each finding against its metrics", () => {
    const findings = [
      { classId: "known-good", confidence: 0.9 },
      { classId: "noisy", confidence: 0.8 },
    ];
    const results = calibrateFindings(findings, metricsByClass);
    expect(results).toHaveLength(2);

    const kg = results.find((r) => r.classId === "known-good")!;
    // precision = 20/21 ≈ 0.952 → calibrated ≈ 0.857
    expect(kg.calibratedConfidence).toBeCloseTo(0.857, 2);
    expect(kg.rawConfidence).toBe(0.9);
    expect(kg.displayLevel).toBe("highlight");

    const n = results.find((r) => r.classId === "noisy")!;
    // precision = 5/50 = 0.1 → calibrated = 0.08
    expect(n.calibratedConfidence).toBeCloseTo(0.08, 2);
    expect(n.displayLevel).toBe("hide");
  });

  it("filters out findings without confidence", () => {
    const findings = [
      { classId: "a", confidence: 0.5 },
      { classId: "b" as any }, // no confidence → filtered
    ];
    expect(calibrateFindings(findings, metricsByClass)).toHaveLength(1);
  });

  it("handles empty findings array", () => {
    expect(calibrateFindings([], metricsByClass)).toEqual([]);
  });

  it("handles metrics map miss (unmetered class)", () => {
    const findings = [{ classId: "unmetered", confidence: 0.75 }];
    const results = calibrateFindings(findings, new Map());
    expect(results).toHaveLength(1);
    expect(results[0].calibratedConfidence).toBe(0.75);
    expect(results[0].precision).toBe(0);
  });
});
