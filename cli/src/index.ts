#!/usr/bin/env -S node --experimental-strip-types
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { buildScanContext } from "@gatepass/engine";
import { runScan } from "@gatepass/detectors";
import { isCrossSurface, type Finding } from "@gatepass/findings";

const RULESET_VERSION = "2026.07.0";

interface Args {
  path: string;
  output?: string;
  json: boolean;
  noSemantic: boolean;
  failOn: "none" | "verified" | "any";
}

function parseArgs(argv: string[]): Args {
  const args: Args = { path: ".", output: undefined, json: false, noSemantic: false, failOn: "none" };
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--output" || a === "-o") args.output = argv[++i];
    else if (a === "--json") args.json = true;
    else if (a === "--no-semantic") args.noSemantic = true;
    else if (a === "--fail-on") args.failOn = (argv[++i] as Args["failOn"]) ?? "none";
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else if (a && !a.startsWith("-")) positionals.push(a);
  }
  if (positionals[0]) args.path = positionals[0];
  return args;
}

function printHelp(): void {
  console.log(`gatepass scan <path> [options]

  Scans application code and agentic infrastructure and reports two-tier findings.

Options:
  -o, --output <file>   Write canonical findings JSON to <file>
      --json            Print findings JSON to stdout
      --no-semantic     Disable research-tier (LLM-assisted) analysis
      --fail-on <mode>  Exit non-zero on: none (default) | verified | any
  -h, --help            Show this help

Exit codes: 0 success · 1 findings over --fail-on threshold · 2 usage/error`);
}

function severityRank(s: Finding["severity"]): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}

function printHuman(findings: Finding[]): void {
  if (findings.length === 0) {
    console.log("✓ No findings.");
    return;
  }
  const verified = findings.filter((f) => f.tier === "verified");
  const research = findings.filter((f) => f.tier === "research");

  const render = (list: Finding[]) => {
    for (const f of [...list].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))) {
      const loc = f.locations[0]!;
      const xs = isCrossSurface(f) ? " [cross-surface]" : "";
      const conf = f.tier === "research" ? `  confidence ${(f.confidence * 100).toFixed(0)}%` : "";
      console.log(`  [${f.severity.toUpperCase()}] ${f.classId}${xs}  ${loc.path}:${loc.startLine}${conf}`);
      console.log(`      ${f.explanation}`);
    }
  };

  console.log(`\nVERIFIED (${verified.length}) — deterministically confirmed, each with a reproduction`);
  render(verified);
  console.log(`\nRESEARCH (${research.length}) — semantic, confidence-scored`);
  render(research);
  console.log("");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const first = process.argv[2];
  if (first && first !== "scan" && !first.startsWith("-") && !args.output) {
    // allow both `gatepass scan <path>` and `gatepass <path>`
  }

  let ctx;
  try {
    ctx = await buildScanContext(args.path);
  } catch (err) {
    console.error(`error: cannot scan ${args.path}: ${(err as Error).message}`);
    process.exit(2);
  }

  const doc = runScan(ctx, {
    scanId: randomUUID(),
    rulesetVersion: RULESET_VERSION,
    executionMode: "cli",
    semanticEnabled: !args.noSemantic,
  });

  if (args.output) {
    await fs.writeFile(args.output, JSON.stringify(doc, null, 2));
    console.error(`Wrote ${doc.findings.length} finding(s) to ${args.output}`);
  }
  if (args.json) {
    console.log(JSON.stringify(doc, null, 2));
  } else {
    console.log(`Scanned ${ctx.files.length} file(s) across surfaces: ${ctx.surfacesPresent.join(", ")}`);
    if (args.noSemantic) console.log("(research tier disabled — static-only, reduced coverage)");
    printHuman(doc.findings);
  }

  const verifiedCount = doc.findings.filter((f) => f.tier === "verified").length;
  if (args.failOn === "any" && doc.findings.length > 0) process.exit(1);
  if (args.failOn === "verified" && verifiedCount > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
