/**
 * Edge-case tests for the introspection pipeline.
 *
 * Verifies that detectors handle boundary conditions gracefully:
 *  - Empty directories
 *  - Directories with no MCP/tool definitions
 *  - Malformed JSON files
 *  - Large files exceeding MAX_FILE_BYTES
 *  - Binary files
 *  - Mixed content (safe code + plain text)
 *  - Completely clean codebases (zero findings expected)
 *
 * These do NOT re-score detection accuracy (the main benchmark does that).
 * They verify the pipeline doesn't crash, hang, or emit garbage on edge inputs.
 */

import { describe, it, expect } from "vitest";
import { buildScanContext } from "@gatepass/engine";
import { runScan, type RunScanOptions } from "@gatepass/detectors";
import path from "node:path";
import fs from "node:fs";

const TEST_REPO =
  process.env["GATE_PASS_TEST_REPO"] ||
  path.resolve(import.meta.dirname, "../../../../gate_pass_test_repo");

const SCAN_OPTS: RunScanOptions = {
  scanId: "edge-cases",
  rulesetVersion: "benchmark-v1",
  executionMode: "cli",
  semanticEnabled: true,
};

function runEdgeCase(caseDir: string) {
  it(`handles "${path.basename(caseDir)}" without crashing`, async () => {
    const absDir = path.resolve(TEST_REPO, "cases", caseDir);
    if (!fs.existsSync(absDir)) {
      console.warn(`  ⚠  Edge case directory not found: ${absDir} — skipping`);
      return;
    }
    const ctx = await buildScanContext(absDir);
    expect(() => runScan(ctx, SCAN_OPTS)).not.toThrow();
  });
}

function runEdgeCaseNoFindings(caseDir: string) {
  it(`produces zero findings for "${path.basename(caseDir)}"`, async () => {
    const absDir = path.resolve(TEST_REPO, "cases", caseDir);
    if (!fs.existsSync(absDir)) {
      console.warn(`  ⚠  Edge case directory not found: ${absDir} — skipping`);
      return;
    }
    const ctx = await buildScanContext(absDir);
    const doc = runScan(ctx, SCAN_OPTS);
    expect(doc.findings).toHaveLength(0);
  });
}

describe("edge case resilience", () => {
  // The scanner should not crash on these — findings may vary.
  runEdgeCase("edge-empty");
  runEdgeCase("edge-no-mcp");
  runEdgeCase("edge-malformed-json");
  runEdgeCase("edge-large-file");
  runEdgeCase("edge-binary-file");
  runEdgeCase("edge-mixed-content");

  // The completely clean codebase should produce ZERO findings.
  runEdgeCaseNoFindings("edge-no-findings");
});
