import type { FindingsDocument, Finding, Severity } from "./schema.js";

/**
 * SARIF 2.1.0 serializer (contracts/findings-schema.md). Tier and confidence are carried
 * in `properties` so GitHub code-scanning can ingest findings without losing Gatepass's
 * tier distinction.
 */

function sarifLevel(sev: Severity): "error" | "warning" | "note" {
  if (sev === "critical" || sev === "high") return "error";
  if (sev === "medium") return "warning";
  return "note";
}

export function toSarif(doc: FindingsDocument): unknown {
  const rules = new Map<string, { id: string; name: string }>();
  for (const f of doc.findings) {
    if (!rules.has(f.classId)) rules.set(f.classId, { id: f.classId, name: f.classId });
  }

  const results = doc.findings.map((f: Finding) => ({
    ruleId: f.classId,
    level: sarifLevel(f.severity),
    message: { text: f.explanation },
    locations: f.locations.map((l) => ({
      physicalLocation: {
        artifactLocation: { uri: l.path },
        region: { startLine: l.startLine, endLine: l.endLine },
      },
      logicalLocations: [{ name: l.surface, kind: "surface" }],
    })),
    partialFingerprints: { gatepassFingerprint: f.fingerprint },
    properties: {
      tier: f.tier,
      severity: f.severity,
      ...(f.tier === "research" ? { confidence: f.confidence } : {}),
    },
  }));

  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "Gatepass",
            informationUri: "https://gatepass.dev",
            semanticVersion: doc.scan.rulesetVersion,
            rules: [...rules.values()].map((r) => ({ id: r.id, name: r.name })),
          },
        },
        results,
      },
    ],
  };
}
