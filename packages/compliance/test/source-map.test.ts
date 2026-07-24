import { describe, it, expect } from "vitest";
import { combineFiles, REPO_WIDE, isComplianceRelevant, complianceRelevantFiles } from "../src/source-map.js";

describe("build-artifact exclusion", () => {
  it("excludes generated and vendored output a developer cannot act on", () => {
    // Regression: a live scan reported a contrast failure inside a minified React DOM chunk
    // under .next/ — unactionable noise.
    for (const p of [
      ".next/static/chunks/vendor.js",
      "apps/web/.next/server/app/page.js",
      "node_modules/react/index.js",
      "coverage/lcov-report/index.html",
      "dist/bundle.js",
      "build/main.css",
      "src/styles.min.css",
    ]) {
      expect(isComplianceRelevant(p), `${p} should be excluded`).toBe(false);
    }
  });

  it("keeps real source files", () => {
    for (const p of ["src/app/page.tsx", "apps/web/src/globals.css", "app/login.tsx", "styles/theme.scss"]) {
      expect(isComplianceRelevant(p), `${p} should be kept`).toBe(true);
    }
  });

  it("filters a file list", () => {
    const files = [{ relPath: "src/a.ts" }, { relPath: ".next/b.js" }, { relPath: "node_modules/c.js" }];
    expect(complianceRelevantFiles(files).map((f) => f.relPath)).toEqual(["src/a.ts"]);
  });
});

describe("combineFiles line mapping", () => {
  const files = [
    { relPath: "a.ts", content: "a1\na2\na3" }, // combined lines 1-3
    { relPath: "b.ts", content: "b1\nb2" }, // combined lines 4-5
    { relPath: "c.ts", content: "c1" }, // combined line 6
  ];
  const src = combineFiles(files);

  it("concatenates content in order", () => {
    expect(src.content).toBe("a1\na2\na3\nb1\nb2\nc1");
  });

  it("resolves the first line of the first file", () => {
    expect(src.resolve(1)).toEqual({ path: "a.ts", startLine: 1 });
  });

  it("resolves an interior line of the first file", () => {
    expect(src.resolve(3)).toEqual({ path: "a.ts", startLine: 3 });
  });

  it("resolves across a file boundary", () => {
    expect(src.resolve(4)).toEqual({ path: "b.ts", startLine: 1 });
    expect(src.resolve(5)).toEqual({ path: "b.ts", startLine: 2 });
  });

  it("resolves the final file", () => {
    expect(src.resolve(6)).toEqual({ path: "c.ts", startLine: 1 });
  });

  it("every combined line maps to the text actually on that line", () => {
    const combinedLines = src.content.split("\n");
    const byPath = Object.fromEntries(files.map((f) => [f.relPath, f.content.split("\n")]));
    for (let i = 1; i <= combinedLines.length; i++) {
      const loc = src.resolve(i);
      expect(byPath[loc.path]![loc.startLine! - 1]).toBe(combinedLines[i - 1]);
    }
  });

  it("falls back to a clearly non-file marker when out of range", () => {
    expect(src.resolve(999)).toEqual({ path: REPO_WIDE });
  });

  it("handles an empty file set", () => {
    const empty = combineFiles([]);
    expect(empty.isEmpty).toBe(true);
    expect(empty.resolve(1)).toEqual({ path: REPO_WIDE });
  });
});
