import { scoreTool, type CorpusCaseLabel, type Detection, type ToolBenchmark } from "./score.js";

/**
 * Incumbent-scanner adapters for the public precision benchmark (FR-018, T080). To publish
 * "Gatepass vs. incumbent" numbers we run a pinned incumbent (e.g. Cisco mcp-scanner, a
 * YARA-rule tool) against the same versioned corpus and score it identically.
 *
 * An adapter turns a corpus case directory into the set of vulnerability-class ids the
 * incumbent flagged. `CliIncumbentAdapter` shells out to the tool and parses its output; the
 * command runner and output parser are injectable so the scoring pipeline is testable without
 * the tool installed (real numbers require the pinned binary).
 */

export interface IncumbentAdapter {
  /** Tool name as it appears in the published benchmark (pin the version, e.g. "mcp-scanner@1.4"). */
  readonly name: string;
  /** Returns the vulnerability-class ids the incumbent flagged for a corpus case directory. */
  scan(caseDir: string): Promise<string[]>;
}

export type CommandRunner = (command: string, args: string[], cwd: string) => Promise<{ stdout: string; code: number }>;

/**
 * Production command runner: executes the incumbent binary via child_process. A non-zero
 * exit is not treated as failure — many scanners exit non-zero when they find issues — so
 * the caller relies on the parsed output, not the exit code.
 */
export function execCommandRunner(timeoutMs = 120_000): CommandRunner {
  return async (command, args, cwd) => {
    const { execFile } = await import("node:child_process");
    return new Promise((resolve) => {
      execFile(command, args, { cwd, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
        resolve({ stdout: stdout ?? "", code: err && "code" in err ? Number(err.code) || 1 : 0 });
      });
    });
  };
}

export interface CliAdapterConfig {
  name: string;
  command: string;
  /** Args template; `{dir}` is replaced with the case directory. */
  args: string[];
  /** Parse the tool's stdout into the flagged vulnerability-class ids. */
  parse: (stdout: string) => string[];
  runner: CommandRunner;
}

export class CliIncumbentAdapter implements IncumbentAdapter {
  readonly name: string;
  constructor(private readonly config: CliAdapterConfig) {
    this.name = config.name;
  }
  async scan(caseDir: string): Promise<string[]> {
    const args = this.config.args.map((a) => a.replace("{dir}", caseDir));
    const { stdout } = await this.config.runner(this.config.command, args, caseDir);
    return this.config.parse(stdout);
  }
}

/** Parser for SARIF output: collects each result's ruleId as a flagged class. */
export function parseSarifRuleIds(stdout: string): string[] {
  try {
    const sarif = JSON.parse(stdout) as { runs?: { results?: { ruleId?: string }[] }[] };
    const ids = new Set<string>();
    for (const run of sarif.runs ?? []) for (const r of run.results ?? []) if (r.ruleId) ids.add(r.ruleId);
    return [...ids];
  } catch {
    return [];
  }
}

/** A corpus case the incumbent will be run against. */
export interface BenchmarkCase extends CorpusCaseLabel {
  dir: string;
}

/**
 * Run an incumbent adapter across the labeled corpus and score it (same scoring as Gatepass),
 * yielding a ToolBenchmark ready to publish beside Gatepass's numbers.
 */
export async function runIncumbentBenchmark(
  adapter: IncumbentAdapter,
  corpusVersion: string,
  cases: readonly BenchmarkCase[],
): Promise<ToolBenchmark> {
  const detections: Detection[] = [];
  for (const c of cases) {
    const flaggedClassIds = await adapter.scan(c.dir);
    detections.push({ caseId: c.caseId, flaggedClassIds });
  }
  const labels: CorpusCaseLabel[] = cases.map(({ caseId, classId, label }) => ({ caseId, classId, label }));
  return scoreTool(adapter.name, corpusVersion, labels, detections);
}
