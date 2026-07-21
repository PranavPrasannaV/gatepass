/**
 * End-to-end introspection benchmark.
 *
 * Scans a purpose-built test repository (at GATE_PASS_TEST_REPO or the default path)
 * that contains one sub-directory per case — each either "vuln-{classId}" (a
 * vulnerable fixture) or "clean-{classId}" (a clean fixture the detector should
 * not flag). The pipeline runs every detector against each case in isolation, then
 * the harness scores every classId against its labeled cases.
 *
 * When ANTHROPIC_API_KEY is set in the environment, the async pipeline
 * (runScanAsync) is used, which sends research-tier artifacts through the LLM
 * gateway for confidence refinement. Without the key, the sync pipeline (runScan)
 * runs with heuristic pre-filtering only — still fully functional, same TP/FP.
 *
 * EXPECTED: 100 % TP rate (every vuln case flagged), 0 % FP rate (no clean case
 * flagged) across ALL detector classes.
 *
 * Run:
 *   pnpm benchmark                                       (default path)
 *   GATE_PASS_TEST_REPO=~/my/path pnpm benchmark         (custom repo path)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { buildScanContext } from "@gatepass/engine";
import {
  runScan,
  runScanAsync,
  type RunScanOptions,
} from "@gatepass/detectors";
import { LlmGateway } from "@gatepass/semantic";
import { scoreTool, releaseGate, type CorpusCaseLabel, type Detection, type ToolBenchmark } from "../src/index.js";
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

const SCAN_OPTS: RunScanOptions = {
  scanId: "introspection-benchmark",
  rulesetVersion: "benchmark-v1",
  executionMode: "cli",
  semanticEnabled: true,
};

// ---------------------------------------------------------------------------
// LLM gateway setup — used when ANTHROPIC_API_KEY is present
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
// Define the expected labels for every case.
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

// ---------------------------------------------------------------------------
// Helper: run detectors against a case directory
// ---------------------------------------------------------------------------

async function detectForCase(
  caseDir: string,
  gateway?: LlmGateway,
): Promise<{ classIds: Set<string>; findings: { classId: string; tier: string; confidence: number }[] }> {
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
  };
}

// ---------------------------------------------------------------------------
// Report writer
// ---------------------------------------------------------------------------

interface BenchReport {
  timestamp: string;
  llmEnabled: boolean;
  testRepo: string;
  overallFpRate: number;
  perClass: {
    classId: string;
    tp: number;
    fn: number;
    fp: number;
    tn: number;
    tpRate: number;
    fpRate: number;
    pass: boolean;
  }[];
  crossClassIssues: { caseId: string; unexpectedClassIds: string[] }[];
}

const REPORTS_DIR = path.resolve(import.meta.dirname, "../reports");

function writeReport(report: BenchReport): string {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  const filePath = path.join(REPORTS_DIR, `benchmark-${report.timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
  return filePath;
}

function formatTable(result: ToolBenchmark, crossClassIssues: BenchReport["crossClassIssues"]): string[] {
  const lines: string[] = [
    "",
    "═══════════════════════════════════════════════════════════",
    "  Gatepass Introspection Benchmark",
    "═══════════════════════════════════════════════════════════",
    "",
    `  Overall FP rate: ${(result.overallFpRate * 100).toFixed(1)}%`,
    "",
    "  Per-class scores:",
  ];

  for (const s of result.perClass) {
    const status = s.tpRate === 1 && s.fpRate === 0 ? "✓" : "✗";
    lines.push(
      `  ${status} ${s.classId.padEnd(32)} TP:${s.truePositives} FN:${s.falseNegatives} ` +
        `FP:${s.falsePositives} TN:${s.trueNegatives}  ` +
        `TP:${(s.tpRate * 100).toFixed(0)}% FP:${(s.fpRate * 100).toFixed(0)}%`,
    );
  }

  if (crossClassIssues.length > 0) {
    lines.push("", "  Cross-class issues (unexpected findings on clean cases):");
    for (const issue of crossClassIssues) {
      lines.push(`  ✗ ${issue.caseId}: unexpected ${issue.unexpectedClassIds.join(", ")}`);
    }
  }

  lines.push("", "───────────────────────────────────────────────────────", "");
  return lines;
}

// ---------------------------------------------------------------------------
// Benchmark suite
// ---------------------------------------------------------------------------

describe("introspection benchmark", () => {
  let labels: CorpusCaseLabel[];
  let casesRoot: string;
  let gateway: LlmGateway | undefined;
  let llmEnabled: boolean;

  beforeAll(() => {
    casesRoot = path.join(TEST_REPO, "cases");
    if (!fs.existsSync(casesRoot)) {
      throw new Error(
        `Test repo cases directory not found at ${casesRoot}. ` +
          `Clone / create the test repo at ${TEST_REPO} or set GATE_PASS_TEST_REPO.`,
      );
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

  it("scans every case with 100% TP / 0% FP and cross-class safety", async () => {
    const BATCH_SIZE = 12;
    const allResults: { caseId: string; flaggedClassIds: string[]; findings: BenchReport["crossClassIssues"][number] | null }[] = [];

    // Process in batches so the LLM gateway rate-limit isn't overwhelmed.
    for (let i = 0; i < BENCH_CASES.length; i += BATCH_SIZE) {
      const batch = BENCH_CASES.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (c) => {
          const caseDir = path.join(casesRoot, c.caseId);
          if (!fs.existsSync(caseDir)) {
            console.warn(`  ⚠  Case directory not found: ${caseDir} — skipping`);
            return { caseId: c.caseId, flaggedClassIds: [], findings: null };
          }
          const { classIds, findings } = await detectForCase(caseDir, gateway);
          // Record ALL detected classIds so the scorer can detect cross-class FPs on vuln cases too.
          const flaggedClassIds = [...classIds];

          // Cross-class safety: flag ANY unexpected finding (both clean and vuln cases).
          let crossClassIssue: BenchReport["crossClassIssues"][number] | null = null;
          const unexpected = [...classIds].filter((id) => id !== c.classId);
          if (unexpected.length > 0) {
            crossClassIssue = { caseId: c.caseId, unexpectedClassIds: unexpected };
          }

          return { caseId: c.caseId, flaggedClassIds, findings: crossClassIssue };
        }),
      );
      allResults.push(...batchResults);
    }

    const detections: Detection[] = allResults.map((r) => ({
      caseId: r.caseId,
      flaggedClassIds: r.flaggedClassIds,
    }));

    const crossClassIssues = allResults
      .map((r) => r.findings)
      .filter((x): x is BenchReport["crossClassIssues"][number] => x !== null);

    // Score.
    const result = scoreTool("gatepass", "introspection-benchmark-v1", labels, detections);

    // Warn if any class has zero vulnerable cases (scoreTool silently reports 100% TP for those).
    const vulnByClass = new Map<string, number>();
    for (const c of BENCH_CASES) {
      if (c.label === "vulnerable") vulnByClass.set(c.classId, (vulnByClass.get(c.classId) ?? 0) + 1);
    }
    for (const s of result.perClass) {
      const count = vulnByClass.get(s.classId) ?? 0;
      if (count === 0) {
        console.warn(`  ⚠  Class "${s.classId}" has zero vulnerable cases — 100% TP is vacuously true`);
      }
    }

    // Release gate: compare against the most recent published report.
    const publishedReports = fs.readdirSync(REPORTS_DIR)
      .filter((f) => f.startsWith("benchmark-") && f.endsWith(".json"))
      .sort()
      .reverse();
    if (publishedReports.length > 1) {
      // The most recent report BEFORE this run is at index 1 (index 0 is the current run).
      const prevReportPath = path.join(REPORTS_DIR, publishedReports[1]);
      try {
        const prevReport: BenchReport = JSON.parse(fs.readFileSync(prevReportPath, "utf8"));
        const prevScore: ToolBenchmark = {
          tool: "gatepass",
          corpusVersion: "introspection-benchmark-v1",
          perClass: prevReport.perClass.map((p) => ({
            classId: p.classId,
            truePositives: p.tp,
            falseNegatives: p.fn,
            falsePositives: p.fp,
            trueNegatives: p.tn,
            tpRate: p.tpRate,
            fpRate: p.fpRate,
          })),
          overallFpRate: prevReport.overallFpRate,
        };
        const gate = releaseGate(prevScore, result);
        if (!gate.pass) {
          console.warn(`  ⚠  Release gate BLOCKED — regressed classes: ${gate.regressedClasses.join(", ")}`);
        } else {
          console.log(`  ✓ Release gate: no regression from ${path.basename(prevReportPath)}`);
        }
      } catch {
        console.warn(`  ⚠  Could not read previous report at ${prevReportPath} — skipping release gate`);
      }
    }

    // Build report.
    const report: BenchReport = {
      timestamp: new Date().toISOString().replace(/[:.]/g, "-"),
      llmEnabled,
      testRepo: TEST_REPO,
      overallFpRate: result.overallFpRate,
      perClass: result.perClass.map((s) => ({
        classId: s.classId,
        tp: s.truePositives,
        fn: s.falseNegatives,
        fp: s.falsePositives,
        tn: s.trueNegatives,
        tpRate: s.tpRate,
        fpRate: s.fpRate,
        pass: s.tpRate === 1 && s.fpRate === 0,
      })),
      crossClassIssues,
    };

    const reportPath = writeReport(report);
    console.log(`  Report: ${reportPath}`);

    const tableLines = formatTable(result, crossClassIssues);
    console.log(tableLines.join("\n"));

    // Assert cross-class safety.
    for (const issue of crossClassIssues) {
      expect(issue.unexpectedClassIds,
        `${issue.caseId}: unexpected findings ${issue.unexpectedClassIds.join(", ")} from detectors that should not fire on this case`,
      ).toHaveLength(0);
    }

    // Assert perfect scores for every class.
    for (const s of result.perClass) {
      expect(s.tpRate,
        `${s.classId}: expected TP rate 1 (vuln cases flagged) but got ${s.tpRate}`,
      ).toBe(1);
      expect(s.fpRate,
        `${s.classId}: expected FP rate 0 (clean cases not flagged) but got ${s.fpRate}`,
      ).toBe(0);
    }
  });
});
