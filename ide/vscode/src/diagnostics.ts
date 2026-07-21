import { isCrossSurface, type Finding, type FindingsDocument } from "@gatepass/findings";

/**
 * Findings → editor diagnostics (FR-013, T040/T078). This is the pure conversion the VS Code
 * extension uses to turn a Gatepass findings document into editor "Problems". Kept free of the
 * `vscode` API so it is unit-testable; extension.ts maps these descriptors onto vscode
 * Diagnostic objects. Research-tier findings always surface their confidence and never render
 * with error severity — the two-tier honesty carries into the IDE (Principle II).
 */

export type DiagSeverity = "error" | "warning" | "information";

export interface DiagnosticDescriptor {
  /** Repo-relative file path (0-based ranges are computed by the extension). */
  path: string;
  startLine: number;
  endLine: number;
  severity: DiagSeverity;
  message: string;
  source: "Gatepass";
  code: string;
}

function severityOf(f: Finding): DiagSeverity {
  if (f.tier === "research") return "information";
  return f.severity === "critical" || f.severity === "high" ? "error" : "warning";
}

export function findingToDiagnostic(f: Finding): DiagnosticDescriptor {
  const loc = f.locations[0]!;
  const xs = isCrossSurface(f) ? " [cross-surface]" : "";
  const conf = f.tier === "research" ? ` (research · ${Math.round(f.confidence * 100)}% confidence)` : " (verified)";
  return {
    path: loc.path,
    startLine: loc.startLine,
    endLine: loc.endLine,
    severity: severityOf(f),
    source: "Gatepass",
    code: f.classId,
    message: `${f.classId}${xs}${conf}: ${f.explanation}`,
  };
}

export function findingsToDiagnostics(doc: FindingsDocument): DiagnosticDescriptor[] {
  return doc.findings.map(findingToDiagnostic);
}
