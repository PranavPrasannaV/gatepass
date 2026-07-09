import { inflateRawSync, deflateRawSync } from "node:zlib";
import type { QuestionnaireItem } from "./questionnaire.js";

/**
 * Dependency-free XLSX (.xlsx) support for questionnaire ingestion (FR-022, T097).
 *
 * An .xlsx is a ZIP of XML. This module implements the small slice needed: a ZIP
 * reader (stored + deflate entries), a minimal ZIP/xlsx writer (used to build test
 * fixtures and exports), and OOXML cell extraction that handles inline strings
 * (`t="inlineStr"`) and shared strings (`t="s"`). No third-party parser is required.
 */

// ---------- CRC32 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------- ZIP read ----------
interface ZipEntry {
  name: string;
  data: Buffer;
}

export function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  // Find End Of Central Directory (0x06054b50), scanning back from the end.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    // Local header: 30 fixed bytes + name + extra.
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    out.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    off += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

// ---------- ZIP write (deflate) ----------
export function zip(entries: ZipEntry[]): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const deflated = deflateRawSync(e.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(8, 8); // method: deflate
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(deflated.length, 18);
    lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    local.push(lh, nameBuf, deflated);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(deflated.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + deflated.length;
  }
  const localBuf = Buffer.concat(local);
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

// ---------- XLSX ----------
function xmlUnescape(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Extract rows (as string cells) from an .xlsx buffer. */
export function readXlsxRows(buf: Buffer): string[][] {
  const files = unzip(buf);
  const sharedXml = files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared: string[] = [];
  for (const m of sharedXml.matchAll(/<si>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/si>/g))
    shared.push(xmlUnescape(m[1] ?? ""));

  // First worksheet
  const sheetName = [...files.keys()].find((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
  const sheet = sheetName ? files.get(sheetName)!.toString("utf8") : "";
  const rows: string[][] = [];
  for (const rowM of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cM of (rowM[1] ?? "").matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cM[1] ?? "";
      const inner = cM[2] ?? "";
      const type = attrs.match(/\bt="([^"]*)"/)?.[1];
      if (type === "s") {
        const idx = parseInt(inner.match(/<v>(\d+)<\/v>/)?.[1] ?? "-1", 10);
        cells.push(shared[idx] ?? "");
      } else if (type === "inlineStr") {
        cells.push(xmlUnescape(inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? ""));
      } else {
        cells.push(xmlUnescape(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? ""));
      }
    }
    rows.push(cells);
  }
  return rows;
}

/** Parse an .xlsx questionnaire into items (reuses the CSV header conventions). */
export function parseXlsxQuestionnaire(buf: Buffer): QuestionnaireItem[] {
  const rows = readXlsxRows(buf);
  if (rows.length < 2) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const idCol = header.indexOf("id");
  const qCol = header.findIndex((h) => h.includes("question"));
  const useQ = qCol >= 0 ? qCol : header.length - 1;
  return rows
    .slice(1)
    .map((cols, i) => ({
      id: idCol >= 0 && cols[idCol]?.trim() ? cols[idCol]!.trim() : `q${i + 1}`,
      question: (cols[useQ] ?? "").trim(),
    }))
    .filter((item) => item.question.length > 0);
}

/** Build a minimal valid .xlsx (inline strings) from a grid — used for exports and tests. */
export function buildXlsx(rows: string[][]): Buffer {
  const sheetRows = rows
    .map((cells, r) => {
      const cs = cells
        .map((v, c) => `<c r="${colLetter(c)}${r + 1}" t="inlineStr"><is><t>${xmlEscape(v)}</t></is></c>`)
        .join("");
      return `<row r="${r + 1}">${cs}</row>`;
    })
    .join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  return zip([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes) },
    { name: "_rels/.rels", data: Buffer.from(rootRels) },
    { name: "xl/workbook.xml", data: Buffer.from(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(wbRels) },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheet) },
  ]);
}

function colLetter(n: number): string {
  let s = "";
  n += 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
