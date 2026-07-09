import type { Detector, DetectorFinding, ScanContext } from "@gatepass/engine";
import { lineAtIndex } from "@gatepass/engine";

/**
 * Verified detectors over MCP tool definitions:
 *  - `unbounded-tool-param`: a string/array/number parameter with no bound
 *    (maxLength/maxItems/maximum/enum), which an over-eager model can exploit.
 *  - `missing-schema-validation`: a tool whose parameters lack a declared type/schema.
 * Both are deterministic properties of the tool-definition surface.
 */

interface ToolDef {
  name?: string;
  parameters?: Record<string, unknown>;
  inputSchema?: { properties?: Record<string, unknown> };
}

function toolStartLine(content: string, name: string | undefined): number {
  if (!name) return 1;
  const idx = content.indexOf(`"${name}"`);
  return idx >= 0 ? lineAtIndex(content, idx) : 1;
}

function paramEntries(tool: ToolDef): [string, Record<string, unknown>][] {
  const props = tool.parameters ?? tool.inputSchema?.properties ?? {};
  return Object.entries(props).filter(([, v]) => v && typeof v === "object") as [string, Record<string, unknown>][];
}

function isUnbounded(schema: Record<string, unknown>): boolean {
  const type = schema["type"];
  if (schema["enum"]) return false;
  if (type === "string") return schema["maxLength"] === undefined && schema["pattern"] === undefined;
  if (type === "array") return schema["maxItems"] === undefined;
  if (type === "number" || type === "integer") return schema["maximum"] === undefined;
  return false;
}

export const unboundedToolParamDetector: Detector = {
  classIds: ["unbounded-tool-param"],
  tier: "verified",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      if (!file.surfaces.includes("tool_defs")) continue;
      let parsed: { tools?: ToolDef[] };
      try {
        parsed = JSON.parse(file.content);
      } catch {
        continue;
      }
      for (const tool of parsed.tools ?? []) {
        const line = toolStartLine(file.content, tool.name);
        for (const [param, schema] of paramEntries(tool)) {
          if (!isUnbounded(schema)) continue;
          findings.push({
            tier: "verified",
            classId: "unbounded-tool-param",
            severity: "medium",
            surfaces: file.surfaces,
            locations: [{ path: file.relPath, startLine: line, endLine: line, surface: "tool_defs" }],
            explanation:
              `Tool "${tool.name}" parameter "${param}" in ${file.relPath} declares no bound ` +
              `(maxLength/maxItems/maximum/enum). An over-permissioned model can pass arbitrary values.`,
            reproduction: {
              kind: "inspection",
              steps: [
                `Open ${file.relPath} near line ${line} (tool "${tool.name}").`,
                `Observe parameter "${param}" of type "${schema["type"]}" with no size/range constraint.`,
              ],
              expected: `The parameter accepts unbounded input.`,
            },
          });
        }
      }
    }
    return findings;
  },
};

export const missingSchemaValidationDetector: Detector = {
  classIds: ["missing-schema-validation"],
  tier: "verified",
  run(ctx: ScanContext): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const file of ctx.files) {
      if (!file.surfaces.includes("tool_defs")) continue;
      let parsed: { tools?: ToolDef[] };
      try {
        parsed = JSON.parse(file.content);
      } catch {
        continue;
      }
      for (const tool of parsed.tools ?? []) {
        const params = paramEntries(tool);
        const hasSchema = params.length > 0;
        const allTyped = params.every(([, s]) => typeof s["type"] === "string");
        if (hasSchema && allTyped) continue;
        const line = toolStartLine(file.content, tool.name);
        findings.push({
          tier: "verified",
          classId: "missing-schema-validation",
          severity: "medium",
          surfaces: file.surfaces,
          locations: [{ path: file.relPath, startLine: line, endLine: line, surface: "tool_defs" }],
          explanation:
            `Tool "${tool.name}" in ${file.relPath} ${hasSchema ? "has parameters without declared types" : "declares no parameter schema"}. ` +
            `Inputs reach the tool without validation.`,
          reproduction: {
            kind: "inspection",
            steps: [
              `Open ${file.relPath} near line ${line} (tool "${tool.name}").`,
              hasSchema ? `Observe a parameter with no "type" field.` : `Observe no "parameters"/"inputSchema" for this tool.`,
            ],
            expected: `Unvalidated input reaches the tool handler.`,
          },
        });
      }
    }
    return findings;
  },
};
