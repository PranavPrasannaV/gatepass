import { describe, it, expect } from "vitest";
import { diffFindings, findingsInFiles, type Finding } from "../src/index.js";

function f(fp: string, path = "a.ts"): Finding {
  return {
    fingerprint: fp,
    tier: "verified",
    classId: "exposed-secret",
    severity: "high",
    surfaces: ["app_code"],
    locations: [{ path, startLine: 1, endLine: 1, surface: "app_code" }],
    explanation: "x",
    reproduction: { kind: "inspection", steps: ["s"], expected: "e" },
  };
}

describe("findings diff (incremental / PR scanning)", () => {
  it("classifies added / removed / unchanged by fingerprint", () => {
    const base = [f("a"), f("b")];
    const head = [f("b"), f("c")];
    const d = diffFindings(base, head);
    expect(d.added.map((x) => x.fingerprint)).toEqual(["c"]);
    expect(d.removed.map((x) => x.fingerprint)).toEqual(["a"]);
    expect(d.unchanged.map((x) => x.fingerprint)).toEqual(["b"]);
  });

  it("a PR that introduces nothing new has no added findings (fair gate)", () => {
    const base = [f("a"), f("b")];
    const head = [f("a"), f("b")];
    expect(diffFindings(base, head).added).toHaveLength(0);
  });

  it("restricts findings to changed files", () => {
    const findings = [f("a", "src/x.ts"), f("b", "src/y.ts"), f("c", "dist/z.js")];
    const inDiff = findingsInFiles(findings, ["src/y.ts", "dist/z.js"]);
    expect(inDiff.map((x) => x.fingerprint).sort()).toEqual(["b", "c"]);
  });
});
