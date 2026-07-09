import type { Finding } from "@gatepass/findings";
import type { ScanContext, ScanFile } from "./scan-context.js";

/** A detector inspects the scan context and yields findings for one or more classes. */
export interface Detector {
  /** Vulnerability class(es) this detector can emit. */
  readonly classIds: string[];
  readonly tier: "verified" | "research";
  run(ctx: ScanContext): DetectorFinding[];
}

/**
 * Detectors emit findings without a fingerprint; the pipeline assigns a stable
 * fingerprint. Verified detectors additionally return the raw secret values they matched
 * so the pipeline can run the redaction linter.
 */
export type DetectorFinding = Omit<Finding, "fingerprint"> & {
  /** Raw sensitive values matched (verified tier only) — used by the redaction linter. */
  rawSecrets?: string[];
};

export function fileHasSurface(file: ScanFile, surface: string): boolean {
  return file.surfaces.includes(surface as never);
}

/** 1-indexed line number of a character offset within content. */
export function lineAtIndex(content: string, index: number): number {
  let line = 1;
  const end = Math.min(index, content.length);
  for (let i = 0; i < end; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}
