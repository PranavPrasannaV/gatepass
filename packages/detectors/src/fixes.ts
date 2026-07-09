import type { Finding } from "@gatepass/findings";

/**
 * Suggested-fix generation (FR-012). Produces an advisory patch the developer approves —
 * Gatepass never applies it. Returns `undefined` for classes without a safe auto-suggestion
 * (e.g. exposed secrets, which require rotation, not a code edit).
 */

export interface SuggestedFix {
  kind: "diff" | "agent_guidance";
  content: string;
}

export function generateSuggestedFix(finding: Finding): SuggestedFix | undefined {
  switch (finding.classId) {
    case "cors-misconfig":
      return {
        kind: "diff",
        content:
          "// Replace the wildcard origin with an explicit allow-list, and never combine\n" +
          "// a wildcard origin with credentials.\n" +
          'const allowed = ["https://app.example.com"];',
      };
    case "rls-gap": {
      const table = finding.explanation.match(/Table "(\w+)"/)?.[1] ?? "your_table";
      return {
        kind: "diff",
        content:
          `alter table ${table} enable row level security;\n` +
          `create policy tenant_isolation on ${table}\n` +
          `  using (tenant_id = auth.uid());`,
      };
    }
    case "unpinned-dependency":
      return {
        kind: "diff",
        content: '// Pin this dependency to an exact, reviewed version (e.g. "1.2.3") instead of a range.',
      };
    case "unbounded-tool-param":
      return {
        kind: "agent_guidance",
        content:
          "Add a bound to this tool parameter: for strings set `maxLength` (or `enum`/`pattern`), " +
          "for arrays set `maxItems`, for numbers set `maximum`.",
      };
    case "missing-schema-validation":
      return {
        kind: "agent_guidance",
        content:
          "Declare a typed JSON schema for every tool parameter (at minimum a `type`), and validate input before use.",
      };
    default:
      return undefined; // e.g. exposed-secret → rotate the credential, not a code diff
  }
}
