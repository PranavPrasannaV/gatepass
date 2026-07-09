import { describe, it, expect } from "vitest";
import { scoreTool, isPrecisionRegression, type CorpusCaseLabel, type Detection } from "../src/index.js";

const labels: CorpusCaseLabel[] = [
  { caseId: "c1", classId: "exposed-secret", label: "vulnerable" },
  { caseId: "c2", classId: "exposed-secret", label: "clean" },
  { caseId: "c3", classId: "tool-poisoning", label: "vulnerable" },
];

describe("benchmark scoring (FR-018, SC-007)", () => {
  it("computes per-class TP/FP for a perfect tool", () => {
    const detections: Detection[] = [
      { caseId: "c1", flaggedClassIds: ["exposed-secret"] },
      { caseId: "c2", flaggedClassIds: [] },
      { caseId: "c3", flaggedClassIds: ["tool-poisoning"] },
    ];
    const b = scoreTool("gatepass", "corpus-v1", labels, detections);
    expect(b.overallFpRate).toBe(0);
    expect(b.perClass.find((c) => c.classId === "exposed-secret")!.tpRate).toBe(1);
  });

  it("scores a noisy incumbent with false positives", () => {
    const detections: Detection[] = [
      { caseId: "c1", flaggedClassIds: ["exposed-secret"] },
      { caseId: "c2", flaggedClassIds: ["exposed-secret"] }, // FP on clean case
      { caseId: "c3", flaggedClassIds: [] }, // FN
    ];
    const b = scoreTool("incumbent", "corpus-v1", labels, detections);
    expect(b.perClass.find((c) => c.classId === "exposed-secret")!.fpRate).toBe(1);
    expect(b.perClass.find((c) => c.classId === "tool-poisoning")!.tpRate).toBe(0);
  });

  it("is deterministic across runs (SC-007 reproducibility)", () => {
    const detections: Detection[] = [
      { caseId: "c1", flaggedClassIds: ["exposed-secret"] },
      { caseId: "c2", flaggedClassIds: [] },
      { caseId: "c3", flaggedClassIds: ["tool-poisoning"] },
    ];
    const a = scoreTool("gatepass", "corpus-v1", labels, detections);
    const b = scoreTool("gatepass", "corpus-v1", labels, detections);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("detects a precision regression (FR-019 release gate)", () => {
    const published = scoreTool("gatepass", "corpus-v1", labels, [
      { caseId: "c1", flaggedClassIds: ["exposed-secret"] },
      { caseId: "c2", flaggedClassIds: [] },
      { caseId: "c3", flaggedClassIds: ["tool-poisoning"] },
    ]);
    const regressed = scoreTool("gatepass", "corpus-v1", labels, [
      { caseId: "c1", flaggedClassIds: ["exposed-secret"] },
      { caseId: "c2", flaggedClassIds: ["exposed-secret"] },
      { caseId: "c3", flaggedClassIds: ["tool-poisoning"] },
    ]);
    expect(isPrecisionRegression(published, regressed)).toBe(true);
    expect(isPrecisionRegression(published, published)).toBe(false);
  });
});
