import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildScanContext } from "../src/index.js";

async function ctxFor(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "gp-sctx-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const abs = join(dir, rel);
      mkdirSync(join(abs, ".."), { recursive: true });
      writeFileSync(abs, content);
    }
    return await buildScanContext(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("buildScanContext", () => {
  it("builds a context from a directory with scannable files", async () => {
    const ctx = await ctxFor({
      "src/app.ts": "console.log('hello')",
      "src/utils.ts": "export const foo = 1",
    });
    expect(ctx.files).toHaveLength(2);
    expect(ctx.files.map((f) => f.relPath)).toEqual(expect.arrayContaining(["src/app.ts", "src/utils.ts"]));
  });

  it("ignores node_modules directory", async () => {
    const ctx = await ctxFor({
      "src/app.ts": "console.log('hello')",
      "node_modules/lodash/index.js": "module.exports = {}",
    });
    expect(ctx.files).toHaveLength(1);
    expect(ctx.files[0].relPath).toBe("src/app.ts");
  });

  it("ignores .git directory", async () => {
    const ctx = await ctxFor({
      "src/app.ts": "console.log('hello')",
      ".git/config": "[core]\n\trepositoryformatversion = 0",
    });
    expect(ctx.files).toHaveLength(1);
    expect(ctx.files[0].relPath).toBe("src/app.ts");
  });

  it("skips files larger than 5MB", async () => {
    const ctx = await ctxFor({
      "small.ts": "console.log('hello')",
      "large.js": Buffer.alloc(6 * 1024 * 1024, "x").toString(),
    });
    expect(ctx.files).toHaveLength(1);
    expect(ctx.files[0].relPath).toBe("small.ts");
  });

  it("surfaces are classified per file", async () => {
    const ctx = await ctxFor({
      "src/app.ts": "console.log('hello')",
      "mcp/tools.json": '{"name":"get_data"}',
      ".env": "SECRET=abc",
    });
    const appFile = ctx.files.find((f) => f.relPath === "src/app.ts");
    expect(appFile?.surfaces).toEqual(["app_code"]);

    const mcpFile = ctx.files.find((f) => f.relPath === "mcp/tools.json");
    expect(mcpFile?.surfaces).toEqual(expect.arrayContaining(["tool_defs", "mcp_server", "agent_code"]));

    const envFile = ctx.files.find((f) => f.relPath.endsWith(".env"));
    expect(envFile?.surfaces).toContain("app_code");
  });

  it("surfacesPresent aggregates all unique surfaces across files", async () => {
    const ctx = await ctxFor({
      "src/app.ts": "console.log('hello')",
      "mcp/tools.json": '{"name":"get_data"}',
      ".env": "SECRET=abc",
    });
    expect(ctx.surfacesPresent).toEqual(expect.arrayContaining(["app_code", "tool_defs", "mcp_server", "agent_code"]));
    // No duplicates — each surface appears once
    expect(new Set(ctx.surfacesPresent).size).toBe(ctx.surfacesPresent.length);
  });

  it("sorts files alphabetically by relPath", async () => {
    const ctx = await ctxFor({
      "z/app.ts": "// last",
      "a/app.ts": "// first",
      "m/app.ts": "// middle",
    });
    const relPaths = ctx.files.map((f) => f.relPath);
    expect(relPaths).toEqual(["a/app.ts", "m/app.ts", "z/app.ts"]);
  });

  it("includes root as resolved absolute path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gp-sctx-"));
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src", "app.ts"), "console.log('hello')");
      const ctx = await buildScanContext(dir);
      expect(ctx.root).toBe(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads file content correctly", async () => {
    const ctx = await ctxFor({ "greeting.ts": "export const msg = 'hello';" });
    expect(ctx.files[0].content).toBe("export const msg = 'hello';");
  });

  it("ignores coverage and vendor directories", async () => {
    const ctx = await ctxFor({
      "src/app.ts": "console.log('hello')",
      "coverage/lcov.info": "SF:src/app.ts",
      "vendor/bundle.js": "var x = 1;",
    });
    expect(ctx.files).toHaveLength(1);
    expect(ctx.files[0].relPath).toBe("src/app.ts");
  });

  it("includes manifest files like go.mod and Dockerfile", async () => {
    const ctx = await ctxFor({
      "go.mod": "module example.com/app\n\ngo 1.23",
      Dockerfile: "FROM node:22",
    });
    expect(ctx.files).toHaveLength(2);
    expect(ctx.files.map((f) => f.relPath)).toEqual(expect.arrayContaining(["go.mod", "Dockerfile"]));
  });
});
