/**
 * Benchmark scoring (FR-018, SC-007). Scores any tool's detections against a versioned,
 * labeled corpus, producing per-class TP/FP rates. Deterministic: the same corpus tag +
 * detections always yields identical numbers, which is what makes published benchmark
 * results reproducible.
 *
 * `ToolAdapter` abstracts a scanner (Gatepass CLI, or a pinned incumbent container) so the
 * harness compares tools on identical inputs. Live incumbent execution is wired at the
 * adapter boundary; scoring itself is pure.
 */

export interface CorpusCaseLabel {
  caseId: string;
  classId: string;
  label: "vulnerable" | "clean";
}

/** A tool's detection: which classes it flagged for a given case. */
export interface Detection {
  caseId: string;
  flaggedClassIds: string[];
}

export interface ClassScore {
  classId: string;
  truePositives: number;
  falseNegatives: number;
  falsePositives: number;
  trueNegatives: number;
  tpRate: number;
  fpRate: number;
}

export interface ToolBenchmark {
  tool: string;
  corpusVersion: string;
  perClass: ClassScore[];
  overallFpRate: number;
}

export function scoreTool(
  tool: string,
  corpusVersion: string,
  labels: CorpusCaseLabel[],
  detections: Detection[],
): ToolBenchmark {
  const flaggedByCase = new Map(detections.map((d) => [d.caseId, new Set(d.flaggedClassIds)]));
  const byClass = new Map<string, ClassScore>();
  const ensure = (classId: string): ClassScore => {
    let s = byClass.get(classId);
    if (!s) {
      s = { classId, truePositives: 0, falseNegatives: 0, falsePositives: 0, trueNegatives: 0, tpRate: 0, fpRate: 0 };
      byClass.set(classId, s);
    }
    return s;
  };

  for (const label of labels) {
    const flagged = flaggedByCase.get(label.caseId)?.has(label.classId) ?? false;
    const s = ensure(label.classId);
    if (label.label === "vulnerable") {
      if (flagged) s.truePositives++;
      else s.falseNegatives++;
    } else {
      if (flagged) s.falsePositives++;
      else s.trueNegatives++;
    }
  }

  let fp = 0;
  let clean = 0;
  for (const s of byClass.values()) {
    const pos = s.truePositives + s.falseNegatives;
    const neg = s.falsePositives + s.trueNegatives;
    s.tpRate = pos ? s.truePositives / pos : 1;
    s.fpRate = neg ? s.falsePositives / neg : 0;
    fp += s.falsePositives;
    clean += neg;
  }

  return {
    tool,
    corpusVersion,
    perClass: [...byClass.values()].sort((a, b) => a.classId.localeCompare(b.classId)),
    overallFpRate: clean ? fp / clean : 0,
  };
}

/** Compare a candidate run against the last published run; used by the release gate (FR-019). */
export function isPrecisionRegression(published: ToolBenchmark, candidate: ToolBenchmark): boolean {
  const publishedByClass = new Map(published.perClass.map((c) => [c.classId, c]));
  for (const cand of candidate.perClass) {
    const prev = publishedByClass.get(cand.classId);
    if (!prev) continue;
    // Regression = FP rate worsened or TP rate dropped beyond a small tolerance.
    if (cand.fpRate > prev.fpRate + 1e-9) return true;
    if (cand.tpRate < prev.tpRate - 1e-9) return true;
  }
  return false;
}
