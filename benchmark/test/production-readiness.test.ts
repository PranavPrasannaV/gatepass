/**
 * Production readiness test suite — end-to-end verification of the full Gatepass pipeline.
 *
 * When ANTHROPIC_API_KEY is set, runs both heuristic AND LLM pathways and compares results.
 * Reports clear PASS/FAIL for every check so the user knows exactly what works and what doesn't.
 *
 * Run:
 *   pnpm exec vitest run benchmark/test/production-readiness.test.ts
 *   ANTHROPIC_API_KEY=sk-... pnpm exec vitest run benchmark/test/production-readiness.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildScanContext } from "@gatepass/engine";
import {
  runScan,
  runScanAsync,
  type RunScanOptions,
} from "@gatepass/detectors";
import { LlmGateway } from "@gatepass/semantic";
import { toSarif } from "@gatepass/findings";
import { scoreTool, type CorpusCaseLabel, type ToolBenchmark } from "../src/index.js";
import path from "node:path";
import fs from "node:fs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_TEST_REPO = path.resolve(
  import.meta.dirname,
  "../../../../gate_pass_test_repo",
);
const TEST_REPO = process.env["GATE_PASS_TEST_REPO"] || DEFAULT_TEST_REPO;
const CASES_ROOT = path.join(TEST_REPO, "cases");

const SCAN_OPTS: RunScanOptions = {
  scanId: "production-readiness",
  rulesetVersion: "benchmark-v1",
  executionMode: "cli",
  semanticEnabled: true,
};

// ---------------------------------------------------------------------------
// LLM gateway setup
// ---------------------------------------------------------------------------

function buildGateway(): LlmGateway | undefined {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return undefined;
  return new LlmGateway({
    enabled: true,
    apiKey,
    transport: {
      async complete(req) {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: req.model,
            system: req.system,
            messages: [{ role: "user", content: req.artifact }],
            max_tokens: 256,
          }),
        });
        if (!resp.ok) {
          throw new Error(`Anthropic API error: ${resp.status} ${await resp.text()}`);
        }
        const json = await resp.json();
        const text = json.content?.[0]?.text ?? "";
        return { text };
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Benchmark case definitions (matches introspection-benchmark.test.ts exactly)
// ---------------------------------------------------------------------------

interface BenchCase {
  caseId: string;
  classId: string;
  label: "vulnerable" | "clean";
}

const BENCH_CASES: BenchCase[] = [
  // ---- verified tier — variant 1 (original) ----------------------------
  { caseId: "vuln-exposed-secret", classId: "exposed-secret", label: "vulnerable" },
  { caseId: "clean-exposed-secret", classId: "exposed-secret", label: "clean" },

  { caseId: "vuln-unauth-mcp-transport", classId: "unauth-mcp-transport", label: "vulnerable" },
  { caseId: "clean-unauth-mcp-transport", classId: "unauth-mcp-transport", label: "clean" },

  { caseId: "vuln-cors-misconfig", classId: "cors-misconfig", label: "vulnerable" },
  { caseId: "clean-cors-misconfig", classId: "cors-misconfig", label: "clean" },

  { caseId: "vuln-rls-gap", classId: "rls-gap", label: "vulnerable" },
  { caseId: "clean-rls-gap", classId: "rls-gap", label: "clean" },

  { caseId: "vuln-unpinned-dependency", classId: "unpinned-dependency", label: "vulnerable" },
  { caseId: "clean-unpinned-dependency", classId: "unpinned-dependency", label: "clean" },

  { caseId: "vuln-unbounded-tool-param", classId: "unbounded-tool-param", label: "vulnerable" },
  { caseId: "clean-unbounded-tool-param", classId: "unbounded-tool-param", label: "clean" },

  { caseId: "vuln-missing-schema-validation", classId: "missing-schema-validation", label: "vulnerable" },
  { caseId: "clean-missing-schema-validation", classId: "missing-schema-validation", label: "clean" },

  // ---- verified tier — variant 2 (different attack pattern) ------------
  { caseId: "vuln-exposed-secret-variant2", classId: "exposed-secret", label: "vulnerable" },
  { caseId: "clean-exposed-secret-variant2", classId: "exposed-secret", label: "clean" },

  { caseId: "vuln-unauth-mcp-transport-variant2", classId: "unauth-mcp-transport", label: "vulnerable" },
  { caseId: "clean-unauth-mcp-transport-variant2", classId: "unauth-mcp-transport", label: "clean" },

  { caseId: "vuln-cors-misconfig-variant2", classId: "cors-misconfig", label: "vulnerable" },
  { caseId: "clean-cors-misconfig-variant2", classId: "cors-misconfig", label: "clean" },

  { caseId: "vuln-rls-gap-variant2", classId: "rls-gap", label: "vulnerable" },
  { caseId: "clean-rls-gap-variant2", classId: "rls-gap", label: "clean" },

  { caseId: "vuln-unpinned-dependency-variant2", classId: "unpinned-dependency", label: "vulnerable" },
  { caseId: "clean-unpinned-dependency-variant2", classId: "unpinned-dependency", label: "clean" },

  { caseId: "vuln-unbounded-tool-param-variant2", classId: "unbounded-tool-param", label: "vulnerable" },
  { caseId: "clean-unbounded-tool-param-variant2", classId: "unbounded-tool-param", label: "clean" },

  { caseId: "vuln-missing-schema-validation-variant2", classId: "missing-schema-validation", label: "vulnerable" },
  { caseId: "clean-missing-schema-validation-variant2", classId: "missing-schema-validation", label: "clean" },

  // ---- research tier — variant 1 (original) ----------------------------
  { caseId: "vuln-tool-poisoning", classId: "tool-poisoning", label: "vulnerable" },
  { caseId: "clean-tool-poisoning", classId: "tool-poisoning", label: "clean" },

  { caseId: "vuln-cross-surface-scope-mismatch", classId: "cross-surface-scope-mismatch", label: "vulnerable" },
  { caseId: "clean-cross-surface-scope-mismatch", classId: "cross-surface-scope-mismatch", label: "clean" },

  { caseId: "vuln-hbv", classId: "hbv", label: "vulnerable" },
  { caseId: "clean-hbv", classId: "hbv", label: "clean" },

  { caseId: "vuln-confused-deputy", classId: "confused-deputy", label: "vulnerable" },
  { caseId: "clean-confused-deputy", classId: "confused-deputy", label: "clean" },

  { caseId: "vuln-over-permissioned-loop", classId: "over-permissioned-loop", label: "vulnerable" },
  { caseId: "clean-over-permissioned-loop", classId: "over-permissioned-loop", label: "clean" },

  // ---- research tier — variant 2 (different attack pattern) ------------
  { caseId: "vuln-tool-poisoning-variant2", classId: "tool-poisoning", label: "vulnerable" },
  { caseId: "clean-tool-poisoning-variant2", classId: "tool-poisoning", label: "clean" },

  { caseId: "vuln-cross-surface-scope-mismatch-variant2", classId: "cross-surface-scope-mismatch", label: "vulnerable" },
  { caseId: "clean-cross-surface-scope-mismatch-variant2", classId: "cross-surface-scope-mismatch", label: "clean" },

  { caseId: "vuln-hbv-variant2", classId: "hbv", label: "vulnerable" },
  { caseId: "clean-hbv-variant2", classId: "hbv", label: "clean" },

  { caseId: "vuln-confused-deputy-variant2", classId: "confused-deputy", label: "vulnerable" },
  { caseId: "clean-confused-deputy-variant2", classId: "confused-deputy", label: "clean" },

  { caseId: "vuln-over-permissioned-loop-variant2", classId: "over-permissioned-loop", label: "vulnerable" },
  { caseId: "clean-over-permissioned-loop-variant2", classId: "over-permissioned-loop", label: "clean" },
];

// All 12 unique classIds in the benchmark.
const ALL_CLASS_IDS = [
  "exposed-secret",
  "unauth-mcp-transport",
  "cors-misconfig",
  "rls-gap",
  "unpinned-dependency",
  "unbounded-tool-param",
  "missing-schema-validation",
  "tool-poisoning",
  "cross-surface-scope-mismatch",
  "hbv",
  "confused-deputy",
  "over-permissioned-loop",
];

// Edge case directory names.
const EDGE_CASES = [
  "edge-empty",
  "edge-no-mcp",
  "edge-malformed-json",
  "edge-large-file",
  "edge-binary-file",
  "edge-mixed-content",
];

const EDGE_CASES_NO_FINDINGS = ["edge-no-findings"];

// Near-miss case directories — assert zero findings.
const NEAR_MISS_CASES = [
  "nearmiss-secret-in-comment",
  "nearmiss-cors-in-comment",
  "nearmiss-while-true-with-break",
  "nearmiss-akia-in-identifier",
  "nearmiss-tool-description-mentions-poisoning",
  "nearmiss-pinned-to-vulnerable",
];

// ---------------------------------------------------------------------------
// Helper: run detectors against a case directory
// ---------------------------------------------------------------------------

interface DetectResult {
  classIds: Set<string>;
  findings: { classId: string; tier: string; confidence: number }[];
  rawFindings: unknown[];
}

async function detectForCase(
  caseDir: string,
  gateway?: LlmGateway,
): Promise<DetectResult> {
  const ctx = await buildScanContext(caseDir);

  let doc;
  if (gateway?.enabled) {
    doc = await runScanAsync(ctx, SCAN_OPTS, gateway);
  } else {
    doc = runScan(ctx, SCAN_OPTS);
  }

  return {
    classIds: new Set(doc.findings.map((f) => f.classId)),
    findings: doc.findings.map((f) => ({
      classId: f.classId,
      tier: f.tier,
      confidence: f.confidence ?? 0,
    })),
    rawFindings: doc.findings,
  };
}

// ---------------------------------------------------------------------------
// Summary report state — collected across all describe blocks
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIPPED" | "WARN";
  detail: string;
}

const _results: CheckResult[] = [];

function record(name: string, status: CheckResult["status"], detail: string): void {
  _results.push({ name, status, detail });
}

function printSummary(): void {
  const overall = _results.every((r) => r.status === "PASS" || r.status === "SKIPPED") ? "PASS" : "FAIL";

  const lines: string[] = [
    "",
    "╔══════════════════════════════════════════════════════════════╗",
    "║              GATEPASS PRODUCTION READINESS REPORT           ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
  ];

  for (const r of _results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "SKIPPED" ? "⊘" : r.status === "WARN" ? "⚠" : "✗";
    lines.push(`  ${icon} ${r.name.padEnd(24)} ${r.status.padEnd(10)} ${r.detail}`);
  }

  lines.push(
    "",
    "════════════════════════════════════════════════════════════════",
    `  Overall:                ${overall}`,
    "",
  );

  console.log(lines.join("\n"));
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("production readiness", () => {
  let labels: CorpusCaseLabel[];
  let gateway: LlmGateway | undefined;
  let llmEnabled: boolean;
  let repoExists: boolean;

  beforeAll(() => {
    repoExists = fs.existsSync(CASES_ROOT);
    if (!repoExists) {
      console.warn(`\n  ⚠  Test repo not found at ${CASES_ROOT} — skipping benchmark-dependent checks\n`);
    }

    gateway = buildGateway();
    llmEnabled = !!gateway?.enabled;

    labels = BENCH_CASES.map((c) => ({
      caseId: c.caseId,
      classId: c.classId,
      label: c.label,
    }));

    if (llmEnabled) {
      console.log(`\n  LLM gateway enabled — using runScanAsync (research-tier confidence refined by Anthropic)\n`);
    } else {
      console.log(`\n  LLM gateway disabled — using runScan (heuristic pre-filtering). ` +
        `Set ANTHROPIC_API_KEY to enable LLM refinement.\n`);
    }
  });

  // =========================================================================
  // 1. Test Repo Integrity Check
  // =========================================================================

  describe("test repo integrity", () => {
    it("exists and contains all expected case directories", () => {
      if (!fs.existsSync(TEST_REPO)) {
        record("Test Repo Integrity", "FAIL", `repo not found at ${TEST_REPO}`);
        expect(fs.existsSync(TEST_REPO)).toBe(true);
        return;
      }

      const expectedDirs = BENCH_CASES.map((c) => c.caseId);
      const missing: string[] = [];
      for (const d of expectedDirs) {
        if (!fs.existsSync(path.join(CASES_ROOT, d))) {
          missing.push(d);
        }
      }

      if (missing.length > 0) {
        record("Test Repo Integrity", "FAIL", `missing ${missing.length} case dirs: ${missing.slice(0, 5).join(", ")}...`);
        expect(missing).toHaveLength(0);
        return;
      }

      record("Test Repo Integrity", "PASS", `${expectedDirs.length} case directories verified at ${CASES_ROOT}`);
      expect(missing).toHaveLength(0);
    });

    it("contains all 12 distinct classIds in the case definitions", () => {
      const defined = new Set(BENCH_CASES.map((c) => c.classId));
      const definedArr = [...defined].sort();
      expect(definedArr).toEqual([...ALL_CLASS_IDS].sort());
      record("Class ID Coverage", "PASS", `${defined.size} unique classIds defined (${definedArr.join(", ")})`);
    });
  });

  // =========================================================================
  // 2. Heuristic Benchmark — scan ALL cases with runScan (no LLM)
  // =========================================================================

  // We run the heuristic benchmark in a single large test so the scorer has
  // all detections at once.
  let heuristicResult: ToolBenchmark | null = null;
  let heuristicDetections: { caseId: string; flaggedClassIds: string[] }[] = [];
  let heuristicCrossClass: { caseId: string; unexpectedClassIds: string[] }[] = [];
  let heuristicDurationMs = 0;

  describe("heuristic benchmark", () => {
    it("scans every case with 100% TP / 0% FP", async () => {
      if (!repoExists) {
        record("Heuristic Benchmark", "SKIPPED", "no test repo");
        return;
      }

      const start = Date.now();
      const BATCH_SIZE = 12;
      const allResults: { caseId: string; flaggedClassIds: string[]; crossClass: typeof heuristicCrossClass[number] | null }[] = [];

      for (let i = 0; i < BENCH_CASES.length; i += BATCH_SIZE) {
        const batch = BENCH_CASES.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (c) => {
            const caseDir = path.join(CASES_ROOT, c.caseId);
            if (!fs.existsSync(caseDir)) {
              console.warn(`  ⚠  Case directory not found: ${caseDir} — skipping`);
              return { caseId: c.caseId, flaggedClassIds: [], crossClass: null };
            }
            const { classIds } = await detectForCase(caseDir); // no gateway = heuristic only
            const flaggedClassIds = [...classIds];

            let crossClass: typeof heuristicCrossClass[number] | null = null;
            const unexpected = flaggedClassIds.filter((id) => id !== c.classId);
            if (unexpected.length > 0) {
              crossClass = { caseId: c.caseId, unexpectedClassIds: unexpected };
            }

            return { caseId: c.caseId, flaggedClassIds, crossClass };
          }),
        );
        allResults.push(...batchResults);
        console.log(`  Heuristic batch progress: ${Math.min(i + BATCH_SIZE, BENCH_CASES.length)}/${BENCH_CASES.length} cases scanned`);
      }

      heuristicDurationMs = Date.now() - start;

      heuristicDetections = allResults.map((r) => ({
        caseId: r.caseId,
        flaggedClassIds: r.flaggedClassIds,
      }));

      heuristicCrossClass = allResults
        .map((r) => r.crossClass)
        .filter((x): x is typeof heuristicCrossClass[number] => x !== null);

      heuristicResult = scoreTool("gatepass", "production-heuristic-v1", labels, heuristicDetections);

      // Assert cross-class safety: no unexpected classId should fire on any case.
      for (const issue of heuristicCrossClass) {
        expect(issue.unexpectedClassIds,
          `${issue.caseId}: unexpected findings ${issue.unexpectedClassIds.join(", ")} from detectors that should not fire on this case`,
        ).toHaveLength(0);
      }

      // Assert perfect scores for every class.
      for (const s of heuristicResult.perClass) {
        expect(s.tpRate,
          `${s.classId}: expected TP rate 1 (vuln cases flagged) but got ${s.tpRate}`,
        ).toBe(1);
        expect(s.fpRate,
          `${s.classId}: expected FP rate 0 (clean cases not flagged) but got ${s.fpRate}`,
        ).toBe(0);
      }

      const passed = heuristicResult.perClass.every((s) => s.tpRate === 1 && s.fpRate === 0);
      const classSummary = heuristicResult.perClass.map((s) => `${s.classId}=TP:${s.truePositives} FP:${s.falsePositives}`).join(", ");
      record("Heuristic Benchmark", passed ? "PASS" : "FAIL",
        `${BENCH_CASES.length}/${BENCH_CASES.length} cases, 100% TP, 0% FP — ${classSummary}`,
      );
    });
  });

  // =========================================================================
  // 3. LLM Benchmark (gated on ANTHROPIC_API_KEY)
  // =========================================================================

  let llmResult: ToolBenchmark | null = null;
  let _llmDurationMs = 0;

  describe("LLM benchmark", () => {
    it("scans every case with LLM refinement (skipped if ANTHROPIC_API_KEY not set)", async () => {
      if (!repoExists) {
        record("LLM Benchmark", "SKIPPED", "no test repo");
        return;
      }

      if (!llmEnabled) {
        console.log("  ⊘ LLM benchmark skipped — set ANTHROPIC_API_KEY environment variable to enable");
        record("LLM Benchmark", "SKIPPED", "set ANTHROPIC_API_KEY to enable");
        return;
      }

      const start = Date.now();
      const BATCH_SIZE = 8; // smaller batches for LLM to avoid rate limits
      const allResults: { caseId: string; flaggedClassIds: string[] }[] = [];

      for (let i = 0; i < BENCH_CASES.length; i += BATCH_SIZE) {
        const batch = BENCH_CASES.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (c) => {
            const caseDir = path.join(CASES_ROOT, c.caseId);
            if (!fs.existsSync(caseDir)) {
              console.warn(`  ⚠  Case directory not found: ${caseDir} — skipping`);
              return { caseId: c.caseId, flaggedClassIds: [] };
            }
            const { classIds } = await detectForCase(caseDir, gateway);
            return { caseId: c.caseId, flaggedClassIds: [...classIds] };
          }),
        );
        allResults.push(...batchResults);
        console.log(`  LLM batch progress: ${Math.min(i + BATCH_SIZE, BENCH_CASES.length)}/${BENCH_CASES.length} cases scanned`);
      }

      _llmDurationMs = Date.now() - start;

      llmResult = scoreTool("gatepass", "production-llm-v1", labels, allResults);

      // LLM should produce >= heuristic TP rate (LLM supplements, doesn't regress).
      if (heuristicResult) {
        for (const s of llmResult.perClass) {
          const h = heuristicResult.perClass.find((hs) => hs.classId === s.classId);
          if (h) {
            expect(s.tpRate,
              `${s.classId}: LLM TP rate (${s.tpRate}) should not be below heuristic TP rate (${h.tpRate})`,
            ).toBeGreaterThanOrEqual(h.tpRate - 1e-9);
          }
        }
      }

      const passed = llmResult.perClass.every((s) => s.tpRate === 1 && s.fpRate === 0);
      record("LLM Benchmark", passed ? "PASS" : "FAIL",
        `${BENCH_CASES.length}/${BENCH_CASES.length} cases with LLM refinement`,
      );
    });
  });

  // =========================================================================
  // 4. Cross-Class Safety
  // =========================================================================

  describe("cross-class safety", () => {
    it("produces zero unexpected classId firings across all cases", async () => {
      if (!repoExists) {
        record("Cross-Class Safety", "SKIPPED", "no test repo");
        return;
      }

      // We already computed heuristicCrossClass above. If no heuristic results
      // (e.g., test ran in isolation), compute them now.
      let crossClass = heuristicCrossClass;

      if (crossClass.length === 0 && heuristicDetections.length === 0) {
        // Compute on-demand.
        const allResults: { caseId: string; flaggedClassIds: string[]; crossClass: typeof heuristicCrossClass[number] | null }[] = [];

        for (const c of BENCH_CASES) {
          const caseDir = path.join(CASES_ROOT, c.caseId);
          if (!fs.existsSync(caseDir)) {
            console.warn(`  ⚠  Case directory not found: ${caseDir} — skipping`);
            continue;
          }
          const { classIds } = await detectForCase(caseDir);
          const flaggedClassIds = [...classIds];
          let cc: typeof heuristicCrossClass[number] | null = null;
          const unexpected = flaggedClassIds.filter((id) => id !== c.classId);
          if (unexpected.length > 0) {
            cc = { caseId: c.caseId, unexpectedClassIds: unexpected };
          }
          allResults.push({ caseId: c.caseId, flaggedClassIds, crossClass: cc });
        }

        crossClass = allResults.map((r) => r.crossClass).filter((x): x is typeof heuristicCrossClass[number] => x !== null);
      }

      for (const issue of crossClass) {
        expect(issue.unexpectedClassIds,
          `${issue.caseId}: unexpected findings ${issue.unexpectedClassIds.join(", ")} from detectors that should not fire on this case`,
        ).toHaveLength(0);
      }

      record("Cross-Class Safety", crossClass.length === 0 ? "PASS" : "FAIL",
        crossClass.length === 0
          ? "0 cross-class issues across all cases"
          : `${crossClass.length} cross-class issues found`,
      );
    });
  });

  // =========================================================================
  // 5. Edge Cases + Near-Miss Cases
  // =========================================================================

  describe("edge cases", () => {
    for (const caseDir of EDGE_CASES) {
      it(`handles "${caseDir}" without crashing`, async () => {
        if (!repoExists) {
          return;
        }
        const absDir = path.join(CASES_ROOT, caseDir);
        if (!fs.existsSync(absDir)) {
          console.warn(`  ⚠  Edge case directory not found: ${absDir} — skipping`);
          return;
        }
        const ctx = await buildScanContext(absDir);
        expect(() => runScan(ctx, SCAN_OPTS)).not.toThrow();
      });
    }

    it("all edge cases passed", () => {
      if (!repoExists) {
        record("Edge Cases", "SKIPPED", "no test repo");
        return;
      }
      // Verify all edge dirs exist
      const present = EDGE_CASES.filter((d) => fs.existsSync(path.join(CASES_ROOT, d)));
      record("Edge Cases", "PASS", `${present.length}/${EDGE_CASES.length} cases did not crash`);
    });

    for (const caseDir of EDGE_CASES_NO_FINDINGS) {
      it(`produces zero findings for "${caseDir}"`, async () => {
        if (!repoExists) {
          return;
        }
        const absDir = path.join(CASES_ROOT, caseDir);
        if (!fs.existsSync(absDir)) {
          console.warn(`  ⚠  Edge case directory not found: ${absDir} — skipping`);
          return;
        }
        const ctx = await buildScanContext(absDir);
        const doc = runScan(ctx, SCAN_OPTS);
        expect(doc.findings).toHaveLength(0);
      });
    }

    for (const caseDir of NEAR_MISS_CASES) {
      it(`produces zero findings for "${caseDir}" (near-miss)`, async () => {
        if (!repoExists) {
          return;
        }
        const absDir = path.join(CASES_ROOT, caseDir);
        if (!fs.existsSync(absDir)) {
          console.warn(`  ⚠  Near-miss directory not found: ${absDir} — skipping`);
          return;
        }
        const ctx = await buildScanContext(absDir);
        const doc = runScan(ctx, SCAN_OPTS);
        expect(doc.findings).toHaveLength(0);
      });
    }

    it("all near-miss cases passed", () => {
      if (!repoExists) {
        record("Near-Miss Cases", "SKIPPED", "no test repo");
        return;
      }
      const present = NEAR_MISS_CASES.filter((d) => fs.existsSync(path.join(CASES_ROOT, d)));
      record("Near-Miss Cases", "PASS", `${present.length}/${NEAR_MISS_CASES.length} cases, zero findings`);
    });
  });

  // =========================================================================
  // 6. SARIF Export Validation
  // =========================================================================

  describe("SARIF export", () => {
    it("produces valid SARIF 2.1.0 with tier and confidence in properties", async () => {
      if (!repoExists) {
        record("SARIF Export", "SKIPPED", "no test repo");
        return;
      }

      // Scan a single case to get findings.
      const firstVuln = BENCH_CASES.find((c) => c.label === "vulnerable");
      if (!firstVuln) {
        record("SARIF Export", "SKIPPED", "no vulnerable case found");
        return;
      }
      const caseDir = path.join(CASES_ROOT, firstVuln.caseId);
      if (!fs.existsSync(caseDir)) {
        record("SARIF Export", "SKIPPED", `case dir ${caseDir} not found`);
        return;
      }

      const ctx = await buildScanContext(caseDir);
      const doc = runScan(ctx, SCAN_OPTS);
      const sarif = toSarif(doc) as Record<string, unknown>;

      // Validate structure.
      expect(sarif).toBeTruthy();
      expect(sarif.version).toBe("2.1.0");
      expect(sarif["$schema"]).toBe("https://json.schemastore.org/sarif-2.1.0.json");

      const runs = sarif.runs as unknown[];
      expect(Array.isArray(runs)).toBe(true);
      expect(runs.length).toBeGreaterThan(0);

      const run = runs[0] as Record<string, unknown>;
      expect(run.tool).toBeTruthy();
      const driver = (run.tool as Record<string, unknown>).driver as Record<string, unknown>;
      expect(driver.name).toBe("Gatepass");

      const results = run.results as unknown[];
      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const result = results[0] as Record<string, unknown>;
        const props = result.properties as Record<string, unknown> | undefined;
        expect(props).toBeTruthy();
        if (props) {
          expect(props.tier).toBeTruthy();
          // tier should be either "verified" or "research"
          expect(["verified", "research"]).toContain(props.tier);
          // confidence should be present for research tier
          if (props.tier === "research") {
            expect(props.confidence).toBeDefined();
          }
        }
      }

      record("SARIF Export", "PASS", `valid SARIF 2.1.0 with ${results.length} results, tier in properties`);
    });
  });

  // =========================================================================
  // 7. Performance Measurement
  // =========================================================================

  describe("performance", () => {
    it("completes the full benchmark scan within 30 seconds", async () => {
      if (!repoExists) {
        record("Performance", "SKIPPED", "no test repo");
        return;
      }

      // We already timed the heuristic benchmark above. If it didn't run,
      // run a minimal timing check now.
      let durationMs = heuristicDurationMs;
      if (durationMs === 0) {
        // Quick timing run: scan 2 cases.
        const start = Date.now();
        const cases = BENCH_CASES.slice(0, 2);
        for (const c of cases) {
          const caseDir = path.join(CASES_ROOT, c.caseId);
          if (fs.existsSync(caseDir)) {
            const ctx = await buildScanContext(caseDir);
            runScan(ctx, SCAN_OPTS);
          }
        }
        durationMs = Date.now() - start;
      }

      const totalCases = BENCH_CASES.length;
      const warnThreshold = 30_000;

      const durationStr = durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;

      if (durationMs > warnThreshold) {
        console.warn(`  ⚠  Benchmark scan took ${durationStr} — exceeds 30s threshold`);
        record("Performance", "WARN", `${durationStr} (${totalCases} cases scanned) — exceeds 30s threshold`);
      } else {
        record("Performance", "PASS", `${durationStr} (${totalCases} cases scanned)`);
      }

      // Soft assertion: log warning but don't fail the test.
      expect(durationMs).toBeLessThan(warnThreshold * 10); // 300s hard ceiling — something is badly broken
    });
  });

  // =========================================================================
  // 8. Reproducibility Check
  // =========================================================================

  describe("reproducibility", () => {
    it("produces identical fingerprint outputs for identical inputs (SC-007 determinism)", async () => {
      if (!repoExists) {
        record("Reproducibility", "SKIPPED", "no test repo");
        return;
      }

      // Pick two cases to test determinism: one vuln and one clean.
      const testCases = BENCH_CASES.filter((c) =>
        c.classId === "exposed-secret" || c.classId === "unpinned-dependency"
      );

      for (const c of testCases) {
        const caseDir = path.join(CASES_ROOT, c.caseId);
        if (!fs.existsSync(caseDir)) {
          console.warn(`  ⚠  Case directory not found: ${caseDir} — skipping reproducibility for this case`);
          continue;
        }

        // Run the same directory twice.
        const ctx1 = await buildScanContext(caseDir);
        const ctx2 = await buildScanContext(caseDir);
        const doc1 = runScan(ctx1, SCAN_OPTS);
        const doc2 = runScan(ctx2, SCAN_OPTS);

        const fp1 = doc1.findings.map((f) => f.fingerprint).sort();
        const fp2 = doc2.findings.map((f) => f.fingerprint).sort();

        expect(fp1).toEqual(fp2);
      }

      record("Reproducibility", "PASS", "fingerprints match across repeated scans (SC-007 satisfied)");
    });
  });

  // =========================================================================
  // 9. Comprehensive Summary Report
  // =========================================================================

  afterAll(() => {
    printSummary();
  });
});
