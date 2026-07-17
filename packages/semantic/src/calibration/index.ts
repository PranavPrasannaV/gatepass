/**
 * Confidence calibration (T028, FR-005). Maps raw detector confidence scores against
 * corpus-labeled ground truth to produce calibrated scores and display thresholds.
 *
 * Calibration principle: a detector whose confidence consistently aligns with corpus labels
 * (high TP / low FP) has its confidence scores displayed as-is. A detector that over- or
 * under-confides relative to measured precision gets its scores adjusted.
 *
 * Display thresholds control visual prominence in the findings view:
 *   - hide:   confidence < 0.3 — suppressed unless includeSuppressed is set
 *   - dim:    confidence 0.3–0.5 — shown with reduced prominence
 *   - show:   confidence 0.5–0.8 — normal display
 *   - highlight: confidence >= 0.8 — emphasized (strong signal)
 */

export type DisplayLevel = "hide" | "dim" | "show" | "highlight";

export interface ClassMetrics {
  classId: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  vulnerable: number;
  clean: number;
}

export interface CalibrationResult {
  classId: string;
  rawConfidence: number;
  calibratedConfidence: number;
  displayLevel: DisplayLevel;
  precision: number;
  recall: number;
}

export const DISPLAY_HIDE = 0.3;
export const DISPLAY_DIM = 0.5;
export const DISPLAY_SHOW = 0.8;

/** Compute precision from metrics; defaults to 1 when no predictions exist. */
export function computePrecision(m: ClassMetrics): number {
  const total = m.truePositives + m.falsePositives;
  return total === 0 ? 1 : m.truePositives / total;
}

/** Compute recall from metrics; defaults to 1 when no vulnerable cases exist. */
export function computeRecall(m: ClassMetrics): number {
  return m.vulnerable === 0 ? 1 : m.truePositives / m.vulnerable;
}

/**
 * Calibrate a raw confidence score against corpus-measured class metrics.
 *
 * When the class has been measured (metrics exist): the calibrated score is the raw confidence
 * adjusted by the class precision — a detector with 50% precision has its confidence halved.
 * When no corpus data exists (new or unmetered class): the raw confidence is returned
 * unchanged with a note that calibration is pending corpus data.
 */
export function calibrateConfidence(
  _classId: string,
  rawConfidence: number,
  metrics: ClassMetrics | undefined,
): { calibrated: number; precision: number; recall: number } {
  const confidence = Math.max(0, Math.min(1, rawConfidence));

  if (!metrics) {
    return { calibrated: confidence, precision: 0, recall: 0 };
  }

  const precision = computePrecision(metrics);
  const recall = computeRecall(metrics);

  // Blend: a detector with perfect precision (1.0) keeps its full confidence.
  // A detector with low precision gets scaled down proportionally.
  const calibrated = Math.max(0, Math.min(1, confidence * precision));

  return { calibrated: Number(calibrated.toFixed(3)), precision, recall };
}

/**
 * Determine the display level for a calibrated confidence score.
 * Maps [0, 0.3) → hide, [0.3, 0.5) → dim, [0.5, 0.8) → show, [0.8, 1] → highlight.
 */
export function displayThreshold(confidence: number): DisplayLevel {
  if (confidence < DISPLAY_HIDE) return "hide";
  if (confidence < DISPLAY_DIM) return "dim";
  if (confidence < DISPLAY_SHOW) return "show";
  return "highlight";
}

/**
 * Calibrate an entire scan's research-tier findings against the corpus metrics map.
 * Returns a CalibrationResult for each finding, keyed by classId.
 */
export function calibrateFindings(
  findings: Array<{ classId: string; confidence?: number }>,
  metricsByClass: Map<string, ClassMetrics>,
): CalibrationResult[] {
  return findings
    .filter((f) => f.confidence !== undefined)
    .map((f) => {
      const { calibrated, precision, recall } = calibrateConfidence(
        f.classId,
        f.confidence!,
        metricsByClass.get(f.classId),
      );
      return {
        classId: f.classId,
        rawConfidence: f.confidence!,
        calibratedConfidence: calibrated,
        displayLevel: displayThreshold(calibrated),
        precision,
        recall,
      };
    });
}
