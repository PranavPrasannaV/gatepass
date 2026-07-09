import type { QuestionnaireItem } from "./questionnaire.js";

/**
 * Questionnaire ingestion (FR-022). Parses common security-questionnaire formats into the
 * neutral QuestionnaireItem shape the drafter consumes. CSV and a SIG-lite subset are
 * supported here; XLSX ingestion (which needs a spreadsheet parser) reuses the same output.
 */

export type SourceFormat = "csv" | "sig_lite";

/** Minimal RFC-4180-ish CSV row splitter (handles quoted fields with embedded commas). */
function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  out.push(field);
  return out;
}

/**
 * Parse a CSV questionnaire. Expects a header row; uses an `id` column if present, otherwise
 * generates ids. Picks the first column whose header contains "question" as the prompt.
 */
export function parseCsvQuestionnaire(csv: string): QuestionnaireItem[] {
  const rows = csv.split(/\r?\n/).filter((l) => l.trim().length > 0).map(parseCsvRow);
  if (rows.length < 2) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const idCol = header.indexOf("id");
  const qCol = header.findIndex((h) => h.includes("question"));
  const useQ = qCol >= 0 ? qCol : header.length - 1;
  return rows.slice(1).map((cols, i) => ({
    id: idCol >= 0 && cols[idCol]?.trim() ? cols[idCol]!.trim() : `q${i + 1}`,
    question: (cols[useQ] ?? "").trim(),
  })).filter((item) => item.question.length > 0);
}

/**
 * SIG-lite subset ingestion. Accepts the SIG-lite "Ques" rows expressed as CSV with columns
 * including a question id and question text; supported sections are the security-relevant
 * ones Gatepass has posture for (Application Security, Access Control, Threat Management).
 */
export const SUPPORTED_SIG_LITE_SECTIONS = ["Application Security", "Access Control", "Threat Management"] as const;

export function parseSigLite(csv: string): QuestionnaireItem[] {
  // SIG-lite export is CSV-shaped; reuse the CSV parser and keep supported sections only.
  const rows = csv.split(/\r?\n/).filter((l) => l.trim().length > 0).map(parseCsvRow);
  if (rows.length < 2) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const idCol = header.findIndex((h) => h.includes("num") || h === "id" || h.includes("ques #"));
  const qCol = header.findIndex((h) => h.includes("question") || h.includes("ques"));
  const sectionCol = header.findIndex((h) => h.includes("section") || h.includes("category"));
  const supported = new Set(SUPPORTED_SIG_LITE_SECTIONS.map((s) => s.toLowerCase()));
  return rows.slice(1)
    .filter((cols) => sectionCol < 0 || supported.has((cols[sectionCol] ?? "").trim().toLowerCase()))
    .map((cols, i) => ({
      id: idCol >= 0 && cols[idCol]?.trim() ? cols[idCol]!.trim() : `sig${i + 1}`,
      question: (cols[qCol >= 0 ? qCol : header.length - 1] ?? "").trim(),
    }))
    .filter((item) => item.question.length > 0);
}

export function ingest(format: SourceFormat, content: string): QuestionnaireItem[] {
  return format === "sig_lite" ? parseSigLite(content) : parseCsvQuestionnaire(content);
}
