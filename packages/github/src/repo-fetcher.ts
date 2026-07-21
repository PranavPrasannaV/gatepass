import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractTarGz } from "./tar.js";
import { getInstallationToken, type GitHubAppConfig } from "./auth.js";

/**
 * Repo fetching for clone-and-scan (§clone). Turns a GitHub repo + ref into a local
 * workspace the scan engine can read, then cleans it up. This is the bridge that lets
 * Gatepass scan a real GitHub repository instead of only a local path.
 *
 * Fetching uses the tarball API (contents:read only — no clone credentials, no write scope),
 * consistent with Principle III. The download step is injectable so the extract + scan flow
 * is unit-testable without a live token.
 */

export interface RepoWorkspace {
  /** Directory containing the extracted repo files (top dir stripped). */
  dir: string;
  /** The resolved commit SHA, if known. */
  sha?: string;
  cleanup(): Promise<void>;
}

export interface RepoFetcher {
  fetch(repo: string, ref: string): Promise<RepoWorkspace>;
}

/** Downloads a repo tarball as a Buffer. Injectable for tests. */
export type TarballDownloader = (repo: string, ref: string) => Promise<{ body: Buffer; sha?: string }>;

const MAX_TARBALL_BYTES = 512 * 1024 * 1024; // 512 MB safety cap

/** Production downloader: fetch the tarball with a GitHub App installation token. */
export function githubTarballDownloader(config: GitHubAppConfig, fetchImpl: typeof fetch = fetch): TarballDownloader {
  return async (repo, ref) => {
    const { token } = await getInstallationToken(config);
    const url = `https://api.github.com/repos/${repo}/tarball/${ref}`;
    const res = await fetchImpl(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`tarball download failed for ${repo}@${ref} (${res.status})`);
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_TARBALL_BYTES) throw new Error(`tarball for ${repo} exceeds size cap`);
    const sha =
      res.headers
        .get("etag")
        ?.replace(/[^0-9a-f]/gi, "")
        .slice(0, 40) || undefined;
    return { body: Buffer.from(ab), sha };
  };
}

/** Fetches by downloading + extracting a tarball into a temp workspace. */
export class TarballRepoFetcher implements RepoFetcher {
  constructor(private readonly download: TarballDownloader) {}

  async fetch(repo: string, ref: string): Promise<RepoWorkspace> {
    const { body, sha } = await this.download(repo, ref);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gatepass-scan-"));
    try {
      await extractTarGz(body, dir, { stripComponents: 1 });
    } catch (err) {
      await fs.rm(dir, { recursive: true, force: true });
      throw err;
    }
    return {
      dir,
      sha,
      cleanup: () => fs.rm(dir, { recursive: true, force: true }),
    };
  }
}

/** Dev/test fetcher: scans an existing local directory (no download, no cleanup). */
export class LocalDirFetcher implements RepoFetcher {
  async fetch(repo: string, _ref?: string): Promise<RepoWorkspace> {
    return { dir: repo, cleanup: async () => {} };
  }
}
