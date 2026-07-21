import { gunzipSync, gzipSync } from "node:zlib";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Dependency-free tar.gz support for fetching GitHub repo tarballs (clone-and-scan, T072/§clone).
 *
 * `extractTarGz` handles the ustar format GitHub emits (plus GNU longname and pax path
 * records) and guards against tar-slip path traversal — a scanner must not itself be
 * exploitable by a malicious archive. `createTarGz` builds a tarball (used by tests).
 */

const BLOCK = 512;

function readOctal(buf: Buffer, offset: number, length: number): number {
  const s = buf
    .toString("ascii", offset, offset + length)
    .replace(/\0.*$/, "")
    .trim();
  return s ? parseInt(s, 8) : 0;
}

function readString(buf: Buffer, offset: number, length: number): string {
  return buf.toString("utf8", offset, offset + length).replace(/\0.*$/, "");
}

export class TarSlipError extends Error {}

export interface ExtractOptions {
  /** Drop this many leading path components (GitHub tarballs wrap files in one top dir). */
  stripComponents?: number;
}

/** Extract a gzipped tar into destDir. Returns the list of written relative paths. */
export async function extractTarGz(input: Buffer, destDir: string, opts: ExtractOptions = {}): Promise<string[]> {
  const strip = opts.stripComponents ?? 0;
  const buf = gunzipSync(input);
  const destRoot = path.resolve(destDir);
  const written: string[] = [];

  let offset = 0;
  let longName: string | undefined;
  let paxPath: string | undefined;

  while (offset + BLOCK <= buf.length) {
    const header = buf.subarray(offset, offset + BLOCK);
    // Two consecutive zero blocks mark the end.
    if (header.every((b) => b === 0)) break;

    const rawName = readString(header, 0, 100);
    const size = readOctal(header, 124, 12);
    const typeFlag = String.fromCharCode(header[156] ?? 0);
    const prefix = readString(header, 345, 155);
    offset += BLOCK;
    const dataStart = offset;
    offset += Math.ceil(size / BLOCK) * BLOCK;

    // GNU long name / pax extended header apply to the NEXT entry.
    if (typeFlag === "L") {
      longName = readString(buf, dataStart, size).replace(/\0.*$/, "");
      continue;
    }
    if (typeFlag === "x" || typeFlag === "g") {
      const record = buf.toString("utf8", dataStart, dataStart + size);
      const m = record.match(/\d+ path=([^\n]+)\n/);
      if (m) paxPath = m[1];
      continue;
    }

    let name = paxPath ?? longName ?? (prefix ? `${prefix}/${rawName}` : rawName);
    longName = undefined;
    paxPath = undefined;
    if (!name) continue;

    // Apply strip-components.
    if (strip > 0) {
      const parts = name.split("/").slice(strip);
      if (parts.length === 0) continue;
      name = parts.join("/");
    }
    if (!name) continue;

    // Tar-slip guard: the resolved target must stay inside destRoot.
    const target = path.resolve(destRoot, name);
    if (target !== destRoot && !target.startsWith(destRoot + path.sep)) {
      throw new TarSlipError(`archive entry escapes destination: ${name}`);
    }

    if (typeFlag === "5") {
      await fs.mkdir(target, { recursive: true });
      continue;
    }
    // Regular file ('0', '\0', or '7').
    if (typeFlag === "0" || typeFlag === "\0" || typeFlag === "7") {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, buf.subarray(dataStart, dataStart + size));
      written.push(name);
    }
    // Symlinks/hardlinks/others are skipped (never followed) — defensive.
  }
  return written;
}

/** Build a ustar tarball from {name: contents} and gzip it (for tests/fixtures). */
export function createTarGz(files: Record<string, string | Buffer>): Buffer {
  const blocks: Buffer[] = [];
  for (const [name, contents] of Object.entries(files)) {
    const data = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
    const header = Buffer.alloc(BLOCK);
    header.write(name.slice(0, 100), 0, "ascii");
    header.write("0000644\0", 100, "ascii"); // mode
    header.write("0000000\0", 108, "ascii"); // uid
    header.write("0000000\0", 116, "ascii"); // gid
    header.write(data.length.toString(8).padStart(11, "0") + "\0", 124, "ascii"); // size
    header.write("00000000000\0", 136, "ascii"); // mtime
    header.write("        ", 148, "ascii"); // checksum placeholder (8 spaces)
    header.write("0", 156, "ascii"); // typeflag: regular file
    header.write("ustar\0", 257, "ascii");
    header.write("00", 263, "ascii");
    // Checksum = sum of all header bytes with the checksum field as spaces.
    let sum = 0;
    for (const b of header) sum += b;
    header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");
    blocks.push(header);
    const padded = Buffer.alloc(Math.ceil(data.length / BLOCK) * BLOCK);
    data.copy(padded);
    blocks.push(padded);
  }
  blocks.push(Buffer.alloc(BLOCK * 2)); // two zero blocks = end
  return gzipSync(Buffer.concat(blocks));
}
