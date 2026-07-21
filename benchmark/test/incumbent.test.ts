import { describe, it, expect } from "vitest";
import {
  CliIncumbentAdapter,
  parseSarifRuleIds,
  runIncumbentBenchmark,
  type CommandRunner,
  type BenchmarkCase,
} from "../src/index.js";

// A fake incumbent: flags "exposed-secret" on the vulnerable case, nothing on the clean one,
// and (noisily) a false positive on the clean case for "tool-poisoning".
const fakeRunner: CommandRunner = async (_cmd, args) => {
  const dir = args[args.length - 1] ?? "";
  const results: { ruleId: string }[] = [];
  if (dir.includes("vuln")) results.push({ ruleId: "exposed-secret" });
  if (dir.includes("clean")) results.push({ ruleId: "tool-poisoning" }); // FP
  return { stdout: JSON.stringify({ runs: [{ results }] }), code: 0 };
};

const cases: BenchmarkCase[] = [
  { caseId: "c1", classId: "exposed-secret", label: "vulnerable", dir: "/corpus/vuln-secret" },
  { caseId: "c2", classId: "exposed-secret", label: "clean", dir: "/corpus/clean-secret" },
  { caseId: "c3", classId: "tool-poisoning", label: "clean", dir: "/corpus/clean-tp" },
];

describe("incumbent benchmark adapter (FR-018/T080)", () => {
  it("parses SARIF ruleIds into flagged classes", () => {
    const sarif = JSON.stringify({ runs: [{ results: [{ ruleId: "a" }, { ruleId: "b" }, { ruleId: "a" }] }] });
    expect(parseSarifRuleIds(sarif).sort()).toEqual(["a", "b"]);
    expect(parseSarifRuleIds("not json")).toEqual([]);
  });

  it("runs a CLI incumbent across the corpus and scores it beside Gatepass", async () => {
    const adapter = new CliIncumbentAdapter({
      name: "mcp-scanner@1.4",
      command: "mcp-scanner",
      args: ["scan", "--sarif", "{dir}"],
      parse: parseSarifRuleIds,
      runner: fakeRunner,
    });
    const bench = await runIncumbentBenchmark(adapter, "corpus-v1", cases);

    expect(bench.tool).toBe("mcp-scanner@1.4");
    expect(bench.corpusVersion).toBe("corpus-v1");
    // exposed-secret: caught the vuln (TP) and stayed quiet on the clean case → 100% TP / 0% FP
    const secret = bench.perClass.find((c) => c.classId === "exposed-secret")!;
    expect(secret.tpRate).toBe(1);
    expect(secret.fpRate).toBe(0);
    // tool-poisoning: false-positived on the clean case → non-zero FP (the "noise" story)
    const tp = bench.perClass.find((c) => c.classId === "tool-poisoning")!;
    expect(tp.fpRate).toBeGreaterThan(0);
  });
});
