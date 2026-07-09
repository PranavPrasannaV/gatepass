import type { Surface } from "@gatepass/findings";
import { promises as fs } from "node:fs";
import path from "node:path";
import { classifySurfaces } from "./surfaces.js";

export interface ScanFile {
  /** Repo-relative POSIX path. */
  relPath: string;
  absPath: string;
  content: string;
  surfaces: Surface[];
}

export interface ScanContext {
  root: string;
  files: ScanFile[];
  surfacesPresent: Surface[];
}

// NOTE: build output dirs (dist/build/.next) are intentionally NOT ignored — shipped
// bundles are a primary surface for exposed-secret findings. Only dependency/vcs dirs are
// skipped.
const IGNORED_DIRS = new Set([
  "node_modules", ".git", "coverage", "vendor", ".venv", "venv", "__pycache__",
]);

const SCANNABLE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|sql|json|ya?ml|toml|env|map)$/i;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

/**
 * Build a scan context by ingesting a repository tree. This is the single entry point
 * shared by hosted workers, the CLI, and the self-hosted runner — analysis is a pure
 * function of the context, which is what makes hosted/runner finding parity structural
 * (FR-006a).
 */
export async function buildScanContext(root: string): Promise<ScanContext> {
  const absRoot = path.resolve(root);
  const files: ScanFile[] = [];
  const surfacesPresent = new Set<Surface>();

  for await (const abs of walk(absRoot)) {
    const relPath = path.relative(absRoot, abs).replace(/\\/g, "/");
    if (!SCANNABLE.test(relPath) && !/(^|\/)\.env/.test(relPath)) continue;
    const stat = await fs.stat(abs);
    if (stat.size > MAX_FILE_BYTES) continue;
    const content = await fs.readFile(abs, "utf8");
    const surfaces = classifySurfaces(relPath);
    surfaces.forEach((s) => surfacesPresent.add(s));
    files.push({ relPath, absPath: abs, content, surfaces });
  }

  files.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return { root: absRoot, files, surfacesPresent: [...surfacesPresent] };
}
