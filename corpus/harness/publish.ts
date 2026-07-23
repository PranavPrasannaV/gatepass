import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { measure } from "./measure.js";

/**
 * Generate the published-benchmark artifact (benchmark/published/corpus-v1.json) from REAL
 * measurements: Gatepass's numbers come from running the corpus gate right now; incumbent
 * numbers are merged from benchmark/reports/incumbents.json when a `pnpm benchmark:incumbent`
 * run exists. This artifact is what the API seeds the public benchmark from — it is never
 * hand-written (Constitution Principle I: precision measured & published).
 *
 *   pnpm corpus:publish
 */

interface PublishedClass {
  classId: string;
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

function ratio(num: number, denom: number): number {
  return denom === 0 ? 1 : Number((num / denom).toFixed(4));
}

const result = await measure();
const gatepass: PublishedClass[] = result.perClass.map((c) => ({
  classId: c.classId,
  tp: c.truePositives,
  fp: c.falsePositives,
  fn: c.falseNegatives,
  precision: ratio(c.truePositives, c.truePositives + c.falsePositives),
  recall: ratio(c.truePositives, c.truePositives + c.falseNegatives),
}));

const runs: { tool: string; perClass: PublishedClass[] }[] = [{ tool: "gatepass", perClass: gatepass }];

// Merge incumbent runs when a benchmark:incumbent report exists.
try {
  const incumbents = JSON.parse(
    await fs.readFile(path.join(ROOT, "benchmark", "reports", "incumbents.json"), "utf8"),
  ) as {
    tools: {
      tool: string;
      perClass: { classId: string; truePositives: number; falsePositives: number; falseNegatives: number }[];
    }[];
  };
  for (const t of incumbents.tools) {
    runs.push({
      tool: t.tool,
      perClass: t.perClass.map((c) => ({
        classId: c.classId,
        tp: c.truePositives,
        fp: c.falsePositives,
        fn: c.falseNegatives,
        precision: ratio(c.truePositives, c.truePositives + c.falsePositives),
        recall: ratio(c.truePositives, c.truePositives + c.falseNegatives),
      })),
    });
  }
} catch {
  console.log("(no incumbents.json — publishing Gatepass numbers only; run pnpm benchmark:incumbent to add them)");
}

const artifact = {
  corpusVersion: result.corpusVersion,
  generatedAt: new Date().toISOString(),
  casesMeasured: result.casesMeasured,
  runs,
};

const outDir = path.join(ROOT, "benchmark", "published");
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, `${result.corpusVersion}.json`);
await fs.writeFile(outPath, JSON.stringify(artifact, null, 2));
console.log(`Published ${runs.length} run(s) for ${result.corpusVersion} → ${outPath}`);
