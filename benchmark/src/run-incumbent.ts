import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scoreTool, type CorpusCaseLabel, type Detection, type ToolBenchmark } from "./score.js";

/**
 * Reproducible incumbent benchmark run (FR-018, T080): scans the labeled corpus with a real
 * pinned incumbent (Semgrep) and scores it with the exact same `scoreTool` pipeline Gatepass
 * uses, so the published comparison is apples-to-apples by construction.
 *
 *   pnpm benchmark:incumbent
 *
 * Methodology notes (also in benchmark/INCUMBENT.md):
 * - The corpus is staged to a temp dir with an empty .semgrepignore and scanned with
 *   --no-git-ignore, because fixtures intentionally live in dirs scanners skip by default
 *   (dist/ bundles). The incumbent sees every file Gatepass sees.
 * - Incumbent rule ids are mapped onto Gatepass class ids GENEROUSLY (substring patterns per
 *   class): any rule that plausibly addresses the class counts as detecting it. Unmapped rule
 *   hits are still reported raw for transparency.
 */

interface CaseMeta {
  id: string;
  classId: string;
  label: "vulnerable" | "clean";
  dir: string;
}

/** Mirrors the corpus harness walk (corpus/harness/measure.ts): a case is a dir with case.json. */
export async function loadCases(casesRoot: string): Promise<CaseMeta[]> {
  const cases: CaseMeta[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      try {
        const meta = JSON.parse(await fs.readFile(path.join(full, "case.json"), "utf8"));
        cases.push({ id: meta.id, classId: meta.classId, label: meta.label, dir: full });
      } catch {
        await walk(full);
      }
    }
  }
  await walk(casesRoot);
  return cases;
}

/**
 * Generous rule-id → Gatepass-class mapping: if the incumbent fires ANY rule whose id
 * plausibly targets the class, it gets credit for detecting that class. Classes without a
 * pattern have no generic-SAST equivalent; a rule only counts there if it names the class.
 */
const CLASS_RULE_PATTERNS: Record<string, RegExp> = {
  "exposed-secret": /secret|credential|api[-_.]?key|access[-_.]?key|private[-_.]?key|hardcoded|token/i,
  "cors-misconfig": /cors|access-control-allow/i,
  "unpinned-dependency": /unpinned|pin(ned)?[-_.]?(dependenc|version)|version[-_.]?pin/i,
  "missing-schema-validation": /schema[-_.]?valid|input[-_.]?valid/i,
  "unauth-mcp-transport": /unauth|missing[-_.]?auth|no[-_.]?auth/i,
  "rls-gap": /row[-_.]?level[-_.]?security|\brls\b/i,
  "tool-poisoning": /tool[-_.]?poison|prompt[-_.]?inject/i,
  "confused-deputy": /confused[-_.]?deputy/i,
  hbv: /hidden[-_.]?behavior/i,
  "over-permissioned-loop": /over[-_.]?permission/i,
  "cross-surface-scope-mismatch": /scope[-_.]?mismatch/i,
  "unbounded-tool-param": /unbounded/i,
};

export function mapRuleToClasses(ruleId: string): string[] {
  return Object.entries(CLASS_RULE_PATTERNS)
    .filter(([, pattern]) => pattern.test(ruleId))
    .map(([classId]) => classId);
}

export interface SarifResultLite {
  ruleId: string;
  uri: string;
}

export function parseSarifResults(sarifText: string): SarifResultLite[] {
  try {
    const sarif = JSON.parse(sarifText) as {
      runs?: { results?: { ruleId?: string; locations?: { physicalLocation?: { artifactLocation?: { uri?: string } } }[] }[] }[];
    };
    const out: SarifResultLite[] = [];
    for (const run of sarif.runs ?? []) {
      for (const r of run.results ?? []) {
        const uri = r.locations?.[0]?.physicalLocation?.artifactLocation?.uri;
        if (r.ruleId && uri) out.push({ ruleId: r.ruleId, uri });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Normalize a SARIF uri or filesystem path for prefix comparison across platforms. */
function normalizePath(p: string): string {
  return decodeURIComponent(p.replace(/^file:\/+/i, "")).replace(/\\/g, "/").replace(/^\/(?=[a-zA-Z]:)/, "").toLowerCase();
}

export interface CaseAttribution {
  /** Gatepass class ids the incumbent gets credit for, per case id. */
  classesByCase: Map<string, Set<string>>;
  /** Raw incumbent rule ids per case id (transparency: includes unmapped hits). */
  rulesByCase: Map<string, Set<string>>;
}

/** Attribute each SARIF result to the corpus case whose staged dir contains it. */
export function attributeToCases(
  results: readonly SarifResultLite[],
  stageRoot: string,
  caseIds: readonly string[],
): CaseAttribution {
  const stage = normalizePath(stageRoot);
  const classesByCase = new Map<string, Set<string>>();
  const rulesByCase = new Map<string, Set<string>>();
  for (const r of results) {
    const p = normalizePath(r.uri);
    const caseId = caseIds.find((id) => p.startsWith(`${stage}/${id.toLowerCase()}/`) || p.includes(`/${id.toLowerCase()}/`));
    if (!caseId) continue;
    if (!rulesByCase.has(caseId)) rulesByCase.set(caseId, new Set());
    rulesByCase.get(caseId)!.add(r.ruleId);
    if (!classesByCase.has(caseId)) classesByCase.set(caseId, new Set());
    for (const c of mapRuleToClasses(r.ruleId)) classesByCase.get(caseId)!.add(c);
  }
  return { classesByCase, rulesByCase };
}

function run(command: string, args: string[], cwd: string): Promise<{ stdout: string; code: number }> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { cwd, timeout: 600_000, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, PYTHONUTF8: "1" } },
      (err, stdout) => resolve({ stdout: stdout ?? "", code: err && "code" in err ? Number(err.code) || 1 : 0 }),
    );
  });
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  for (const e of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

const SEMGREP_CONFIGS = ["p/security-audit", "p/secrets", "p/default"];

export async function runSemgrepBenchmark(casesRoot: string, corpusVersion = "corpus-v1"): Promise<{
  benchmark: ToolBenchmark;
  rulesByCase: Map<string, Set<string>>;
  semgrepVersion: string;
}> {
  const bin = process.platform === "win32" ? "semgrep.exe" : "semgrep";
  const versionOut = await run(bin, ["--version"], process.cwd());
  const semgrepVersion = versionOut.stdout.trim().split(/\r?\n/).pop() ?? "unknown";
  if (versionOut.code !== 0 || !semgrepVersion) {
    throw new Error("semgrep is not installed or not on PATH (pip install semgrep)");
  }

  const cases = await loadCases(casesRoot);
  if (cases.length === 0) throw new Error(`no corpus cases found under ${casesRoot}`);

  // Stage the corpus so default ignore rules (dist/, .gitignore) cannot hide fixtures.
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), "gatepass-incumbent-"));
  try {
    await copyDir(casesRoot, stage);
    await fs.writeFile(path.join(stage, ".semgrepignore"), "");

    const sarifPath = path.join(stage, "incumbent.sarif");
    const args = [
      "scan",
      ...SEMGREP_CONFIGS.flatMap((c) => ["--config", c]),
      "--sarif",
      "--output",
      sarifPath,
      "--metrics=off",
      "--no-git-ignore",
      "--quiet",
      stage,
    ];
    await run(bin, args, stage);
    const results = parseSarifResults(await fs.readFile(sarifPath, "utf8").catch(() => ""));

    const { classesByCase, rulesByCase } = attributeToCases(
      results,
      stage,
      cases.map((c) => c.id),
    );
    const labels: CorpusCaseLabel[] = cases.map(({ id, classId, label }) => ({ caseId: id, classId, label }));
    const detections: Detection[] = cases.map((c) => ({
      caseId: c.id,
      flaggedClassIds: [...(classesByCase.get(c.id) ?? [])],
    }));
    const name = `semgrep@${semgrepVersion} (${SEMGREP_CONFIGS.join(" + ")})`;
    return { benchmark: scoreTool(name, corpusVersion, labels, detections), rulesByCase, semgrepVersion };
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
  }
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const isEntry = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  const casesRoot = path.resolve(HERE, "..", "..", "corpus", "cases");
  const { benchmark, rulesByCase } = await runSemgrepBenchmark(casesRoot);

  console.log(`\nIncumbent: ${benchmark.tool}`);
  console.log(`Corpus:    ${benchmark.corpusVersion}\n`);
  console.log("Class                          TP   FN   FP   TN   TP-rate  FP-rate");
  console.log("--------------------------------------------------------------------");
  for (const s of benchmark.perClass) {
    const row = [
      s.classId.padEnd(30),
      String(s.truePositives).padStart(3),
      String(s.falseNegatives).padStart(4),
      String(s.falsePositives).padStart(4),
      String(s.trueNegatives).padStart(4),
      `${(s.tpRate * 100).toFixed(1)}%`.padStart(8),
      `${(s.fpRate * 100).toFixed(1)}%`.padStart(8),
    ];
    console.log(row.join(" "));
  }
  const detected = benchmark.perClass.filter((s) => s.truePositives > 0).length;
  console.log(`\nClasses detected: ${detected}/${benchmark.perClass.length}`);
  console.log(`Overall FP rate:  ${(benchmark.overallFpRate * 100).toFixed(1)}%`);

  if (rulesByCase.size > 0) {
    console.log("\nRaw incumbent rule hits (all, including unmapped):");
    for (const [caseId, rules] of rulesByCase) console.log(`  ${caseId}: ${[...rules].join(", ")}`);
  }

  const reportsDir = path.resolve(HERE, "..", "reports");
  await fs.mkdir(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, "incumbent-semgrep.json");
  await fs.writeFile(
    reportPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), ...benchmark, rawRuleHits: Object.fromEntries([...rulesByCase].map(([k, v]) => [k, [...v]])) }, null, 2),
  );
  console.log(`\nReport written: ${reportPath}`);
}
