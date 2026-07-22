import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadDotEnv } from "../src/index.js";

let tmpFile: string | undefined;
afterEach(async () => {
  if (tmpFile) await fs.rm(tmpFile, { force: true });
  tmpFile = undefined;
});

async function envFile(content: string): Promise<string> {
  tmpFile = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "gp-env-")), ".env");
  await fs.writeFile(tmpFile, content);
  return tmpFile;
}

describe("loadDotEnv", () => {
  it("parses KEY=VALUE lines, skipping comments, blanks, and empty values", async () => {
    const file = await envFile("# comment\nFOO=bar\n\nEMPTY=\nQUOTED=\"with spaces\"\n");
    const env: NodeJS.ProcessEnv = {};
    const set = loadDotEnv(file, env);
    expect(set.sort()).toEqual(["FOO", "QUOTED"]);
    expect(env.FOO).toBe("bar");
    expect(env.QUOTED).toBe("with spaces");
    expect(env.EMPTY).toBeUndefined();
  });

  it("never overrides variables already set in the environment (shell/CI wins)", async () => {
    const file = await envFile("FOO=from-file\n");
    const env: NodeJS.ProcessEnv = { FOO: "from-shell" };
    expect(loadDotEnv(file, env)).toEqual([]);
    expect(env.FOO).toBe("from-shell");
  });

  it("is a no-op when the file does not exist", () => {
    const env: NodeJS.ProcessEnv = {};
    expect(loadDotEnv("Z:\\definitely\\missing\\.env", env)).toEqual([]);
    expect(env).toEqual({});
  });

  it("keeps = signs inside values (connection strings)", async () => {
    const file = await envFile("URL=postgres://u:p@h/db?sslmode=require\n");
    const env: NodeJS.ProcessEnv = {};
    loadDotEnv(file, env);
    expect(env.URL).toBe("postgres://u:p@h/db?sslmode=require");
  });
});
