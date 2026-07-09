import { describe, it, expect } from "vitest";
import { scoreTool, releaseGate, type CorpusCaseLabel, type Detection } from "../src/index.js";

const labels: CorpusCaseLabel[] = [
  { caseId: "c1", classId: "exposed-secret", label: "vulnerable" },
  { caseId: "c2", classId: "exposed-secret", label: "clean" },
];
const perfect: Detection[] = [
  { caseId: "c1", flaggedClassIds: ["exposed-secret"] },
  { caseId: "c2", flaggedClassIds: [] },
];
const noisy: Detection[] = [
  { caseId: "c1", flaggedClassIds: ["exposed-secret"] },
  { caseId: "c2", flaggedClassIds: ["exposed-secret"] },
];

describe("release precision gate (FR-019)", () => {
  const published = scoreTool("gatepass", "corpus-v1", labels, perfect);

  it("passes when precision is unchanged", () => {
    const candidate = scoreTool("gatepass", "corpus-v1", labels, perfect);
    expect(releaseGate(published, candidate).pass).toBe(true);
  });

  it("blocks when a class regresses", () => {
    const candidate = scoreTool("gatepass", "corpus-v1", labels, noisy);
    const r = releaseGate(published, candidate);
    expect(r.pass).toBe(false);
    expect(r.regressedClasses).toContain("exposed-secret");
  });

  it("allows a regression if the affected rule is demoted (FR-019)", () => {
    const candidate = scoreTool("gatepass", "corpus-v1", labels, noisy);
    expect(releaseGate(published, candidate, ["exposed-secret"]).pass).toBe(true);
  });

  it("blocks on a corpus-version mismatch", () => {
    const candidate = scoreTool("gatepass", "corpus-v2", labels, perfect);
    expect(releaseGate(published, candidate).pass).toBe(false);
  });
});
