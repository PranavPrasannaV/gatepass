import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import {
  extractTarGz,
  createTarGz,
  TarSlipError,
  TarballRepoFetcher,
  LocalDirFetcher,
  type TarballDownloader,
} from "../src/index.js";

const tmpDirs: string[] = [];
async function tmp() {
  const d = await fs.mkdtemp(path.join(os.tmpdir(), "gp-tar-"));
  tmpDirs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of tmpDirs.splice(0)) await fs.rm(d, { recursive: true, force: true });
});

describe("tar.gz extraction (clone-and-scan)", () => {
  it("round-trips files through create → extract", async () => {
    const tar = createTarGz({ "src/index.ts": "export const x = 1;", "README.md": "# hi" });
    const dir = await tmp();
    const written = await extractTarGz(tar, dir);
    expect(written.sort()).toEqual(["README.md", "src/index.ts"]);
    expect(await fs.readFile(path.join(dir, "src/index.ts"), "utf8")).toBe("export const x = 1;");
  });

  it("strips leading components (GitHub tarball top dir)", async () => {
    const tar = createTarGz({ "owner-repo-abc123/src/app.ts": "code", "owner-repo-abc123/package.json": "{}" });
    const dir = await tmp();
    await extractTarGz(tar, dir, { stripComponents: 1 });
    expect(await fs.readFile(path.join(dir, "src/app.ts"), "utf8")).toBe("code");
  });

  it("REJECTS a tar-slip path-traversal entry (scanner must not be exploitable)", async () => {
    const tar = createTarGz({ "../../etc/evil": "pwned" });
    const dir = await tmp();
    await expect(extractTarGz(tar, dir)).rejects.toThrow(TarSlipError);
  });

  it("rejects a non-gzip buffer", async () => {
    const dir = await tmp();
    await expect(extractTarGz(Buffer.from("not a gzip"), dir)).rejects.toThrow();
  });
});

describe("TarballRepoFetcher", () => {
  it("downloads → extracts → exposes a workspace, then cleans up", async () => {
    const download: TarballDownloader = async () => ({
      body: createTarGz({ "repo-sha/mcp/tools.json": '{"tools":[]}', "repo-sha/src/a.ts": "x" }),
      sha: "deadbeef",
    });
    const fetcher = new TarballRepoFetcher(download);
    const ws = await fetcher.fetch("acme/app", "main");
    expect(await fs.readFile(path.join(ws.dir, "src/a.ts"), "utf8")).toBe("x");
    expect(ws.sha).toBe("deadbeef");
    await ws.cleanup();
    await expect(fs.access(ws.dir)).rejects.toBeTruthy(); // gone after cleanup
  });
});

describe("LocalDirFetcher", () => {
  it("returns the given directory unchanged", async () => {
    const ws = await new LocalDirFetcher().fetch("corpus/eval-repos/vulnerable-nextjs-mcp", "main");
    expect(ws.dir).toBe("corpus/eval-repos/vulnerable-nextjs-mcp");
    await ws.cleanup(); // no-op
  });
});
