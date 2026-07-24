import type { ScanContext } from "@gatepass/engine";
import type { ComplianceLocation } from "./compliance-schema.js";

/**
 * Several compliance checks legitimately reason over the whole repository (e.g. "is tamper-
 * evident logging implemented anywhere?"). Those scanners concatenate file contents — but the
 * first implementation then reported line numbers from the CONCATENATED buffer against a fake
 * path like `compliance:logging`, so no reported location could ever be opened.
 *
 * `combineFiles` keeps the convenience of a single buffer while preserving an offset map, so a
 * hit at combined-line N resolves back to the real file and its real line.
 */

export interface CombinedSource {
  /** All file contents joined with newlines. */
  content: string;
  /** Resolve a 1-indexed line in `content` to the originating file and its 1-indexed line. */
  resolve(combinedLine: number): ComplianceLocation;
  /** True when there were no files to combine. */
  isEmpty: boolean;
}

/** Marker used when a finding is about the ABSENCE of something and implicates no single file. */
export const REPO_WIDE = "(repository-wide)";

export function combineFiles(files: readonly { relPath: string; content: string }[]): CombinedSource {
  const segments: { path: string; startLine: number; lineCount: number }[] = [];
  const parts: string[] = [];
  let cursor = 1; // 1-indexed line counter into the combined buffer

  for (const f of files) {
    const lineCount = f.content.split(/\n/).length;
    segments.push({ path: f.relPath, startLine: cursor, lineCount });
    parts.push(f.content);
    cursor += lineCount; // the join adds exactly one newline between files
  }

  return {
    content: parts.join("\n"),
    isEmpty: files.length === 0,
    resolve(combinedLine: number): ComplianceLocation {
      for (const seg of segments) {
        if (combinedLine >= seg.startLine && combinedLine < seg.startLine + seg.lineCount) {
          return { path: seg.path, startLine: combinedLine - seg.startLine + 1 };
        }
      }
      return { path: REPO_WIDE };
    },
  };
}

/** Convenience for scanners that only care about a subset of files. */
export function combineMatching(ctx: ScanContext, pattern: RegExp): CombinedSource {
  return combineFiles(ctx.files.filter((f) => pattern.test(f.relPath)));
}

/**
 * Generated output and vendored dependencies must never drive a compliance verdict. A live
 * scan of the dashboard reported a contrast failure inside a minified React DOM chunk under
 * `.next/` — noise the developer cannot act on, and exactly the false-positive class this
 * product exists to avoid.
 *
 * NOTE: this filter is compliance-specific on purpose. The security engine deliberately DOES
 * scan `dist/` (a secret shipped in a built bundle is a real finding), so this must not be
 * hoisted into the shared engine.
 */
const EXCLUDED_DIR = /(^|\/)(\.next|node_modules|\.turbo|coverage|\.git|out|build|dist)(\/|$)/;
const MINIFIED = /\.min\.(js|css)$/;

export function isComplianceRelevant(relPath: string): boolean {
  const p = relPath.replace(/\\/g, "/");
  return !EXCLUDED_DIR.test(p) && !MINIFIED.test(p);
}

export function complianceRelevantFiles<T extends { relPath: string }>(files: readonly T[]): T[] {
  return files.filter((f) => isComplianceRelevant(f.relPath));
}

/**
 * Rewrite a check's locations from combined-buffer line numbers to real file:line pairs.
 * Locations that carry no line (pure absence findings) are left as-is.
 */
export function resolveLocations<T extends { locations: ComplianceLocation[] }>(checks: T[], src: CombinedSource): T[] {
  for (const check of checks) {
    check.locations = check.locations.map((loc) =>
      loc.startLine === undefined ? loc : { ...src.resolve(loc.startLine), snippet: loc.snippet },
    );
  }
  return checks;
}
