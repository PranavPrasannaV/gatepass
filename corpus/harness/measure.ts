import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildScanContext } from "@gatepass/engine";
import { runScan } from "@gatepass/detectors";
import type { Finding, FindingsDocument } from "@gatepass/findings";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASES_ROOT = path.resolve(HERE, "..", "cases");

export interface CaseMeta {
  id: string;
  classId: string;
  label: "vulnerable" | "clean";
  public: boolean;
  note?: string;
  dir: string;
}

export interface ClassMetrics {
  classId: string;
  vulnerable: number;
  clean: number;
  truePositives: number;
  falseNegatives: number;
  falsePositives: number;
  tpRate: number;
  fpRate: number;
}

export interface ReproIssue {
  caseId: string;
  fingerprint: string;
  reason: string;
}

export interface MeasureResult {
  corpusVersion: string;
  perClass: ClassMetrics[];
  overallFpRate: number;
  reproIssues: ReproIssue[];
  casesMeasured: number;
}

async function loadCases(): Promise<CaseMeta[]> {
  const cases: CaseMeta[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const metaPath = path.join(full, "case.json");
        try {
          const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
          cases.push({ ...meta, dir: full });
        } catch {
          await walk(full);
        }
      }
    }
  }
  await walk(CASES_ROOT);
  return cases;
}

/**
 * Verify a reproduction is confirmable (SC-002): the cited location must exist within the
 * fixture tree and the line must be within the file's bounds. A fabricated or stale
 * reproduction fails here.
 */
async function verifyReproduction(treeDir: string, finding: Finding): Promise<string | null> {
  if (finding.tier !== "verified") return null;
  const loc = finding.locations[0]!;
  const abs = path.join(treeDir, loc.path);
  let content: string;
  try {
    content = await fs.readFile(abs, "utf8");
  } catch {
    return `cited file ${loc.path} does not exist in fixture`;
  }
  const lineCount = content.split(/\r?\n/).length;
  if (loc.startLine < 1 || loc.startLine > lineCount) {
    return `cited line ${loc.startLine} out of bounds (file has ${lineCount} lines)`;
  }
  return null;
}

export async function measure(corpusVersion = "corpus-v1"): Promise<MeasureResult> {
  const cases = await loadCases();
  const byClass = new Map<string, ClassMetrics>();
  const reproIssues: ReproIssue[] = [];

  const ensure = (classId: string): ClassMetrics => {
    let m = byClass.get(classId);
    if (!m) {
      m = { classId, vulnerable: 0, clean: 0, truePositives: 0, falseNegatives: 0, falsePositives: 0, tpRate: 0, fpRate: 0 };
      byClass.set(classId, m);
    }
    return m;
  };

  for (const c of cases) {
    const treeDir = path.join(c.dir, "tree");
    const ctx = await buildScanContext(treeDir);
    const doc: FindingsDocument = runScan(ctx, {
      scanId: `corpus:${c.id}`,
      rulesetVersion: corpusVersion,
      executionMode: "cli",
      semanticEnabled: true,
    });
    const classFindings = doc.findings.filter((f) => f.classId === c.classId);
    const m = ensure(c.classId);

    if (c.label === "vulnerable") {
      m.vulnerable++;
      if (classFindings.length > 0) m.truePositives++;
      else m.falseNegatives++;
    } else {
      m.clean++;
      if (classFindings.length > 0) m.falsePositives++;
    }

    for (const f of classFindings) {
      const issue = await verifyReproduction(treeDir, f);
      if (issue) reproIssues.push({ caseId: c.id, fingerprint: f.fingerprint, reason: issue });
    }
  }

  let fpTotal = 0;
  let cleanTotal = 0;
  for (const m of byClass.values()) {
    m.tpRate = m.vulnerable ? m.truePositives / m.vulnerable : 1;
    m.fpRate = m.clean ? m.falsePositives / m.clean : 0;
    fpTotal += m.falsePositives;
    cleanTotal += m.clean;
  }

  return {
    corpusVersion,
    perClass: [...byClass.values()].sort((a, b) => a.classId.localeCompare(b.classId)),
    overallFpRate: cleanTotal ? fpTotal / cleanTotal : 0,
    reproIssues,
    casesMeasured: cases.length,
  };
}
