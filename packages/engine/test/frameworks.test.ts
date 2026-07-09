import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildScanContext, detectFrameworks, classifySurfaces } from "../src/index.js";

async function ctxFor(files: Record<string, string>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gp-fw-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content);
  }
  const ctx = await buildScanContext(dir);
  await fs.rm(dir, { recursive: true, force: true });
  return ctx;
}

describe("framework detection (FR-003)", () => {
  it("detects Next.js + Supabase from package.json", async () => {
    const ctx = await ctxFor({
      "package.json": JSON.stringify({ dependencies: { next: "14.0.0", "@supabase/supabase-js": "2.0.0" } }),
    });
    const fw = detectFrameworks(ctx);
    expect(fw).toContain("nextjs");
    expect(fw).toContain("supabase");
  });

  it("detects FastAPI from Python imports and Go from go.mod", async () => {
    const ctx = await ctxFor({ "main.py": "from fastapi import FastAPI", "go.mod": "module x\n\ngo 1.23" });
    const fw = detectFrameworks(ctx);
    expect(fw).toContain("fastapi");
    expect(fw).toContain("go");
  });

  it("returns nothing for an unsupported stack", async () => {
    const ctx = await ctxFor({ "index.html": "<html></html>" });
    expect(detectFrameworks(ctx)).toEqual([]);
  });
});

describe("surface classification (Principle IV)", () => {
  it("classifies MCP tool defs and server impl into multiple surfaces", () => {
    expect(classifySurfaces("mcp/tools.json")).toEqual(expect.arrayContaining(["tool_defs", "mcp_server"]));
    expect(classifySurfaces("mcp/server.ts")).toEqual(expect.arrayContaining(["mcp_server", "agent_code"]));
    expect(classifySurfaces("src/app.ts")).toContain("app_code");
  });
});
