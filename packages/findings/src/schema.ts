import { z } from "zod";

/**
 * Canonical Gatepass findings schema `gatepass.findings/1`.
 * See specs/001-gatepass-platform/contracts/findings-schema.md.
 *
 * The tier invariant (Constitution Principle II) is enforced here as a schema
 * refinement, not a convention: `verified` REQUIRES a reproduction and forbids a
 * confidence score; `research` REQUIRES a confidence score. Any producer or consumer
 * that parses through this schema cannot construct a mislabeled finding.
 */

export const TIERS = ["verified", "research"] as const;
export type Tier = (typeof TIERS)[number];

export const SURFACES = ["app_code", "agent_code", "mcp_server", "tool_defs", "permission_scopes"] as const;
export type Surface = (typeof SURFACES)[number];

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const locationSchema = z.object({
  path: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  surface: z.enum(SURFACES),
});
export type Location = z.infer<typeof locationSchema>;

export const reproductionSchema = z.object({
  kind: z.enum(["command", "http", "inspection"]),
  steps: z.array(z.string().min(1)).min(1),
  expected: z.string().min(1),
});
export type Reproduction = z.infer<typeof reproductionSchema>;

export const suggestedFixSchema = z.object({
  kind: z.enum(["diff", "agent_guidance"]),
  content: z.string().min(1),
});

const findingBase = z.object({
  fingerprint: z.string().min(1),
  classId: z.string().min(1),
  severity: z.enum(SEVERITIES),
  surfaces: z.array(z.enum(SURFACES)).min(1),
  locations: z.array(locationSchema).min(1),
  explanation: z.string().min(1),
  suggestedFix: suggestedFixSchema.optional(),
});

/** Verified tier: reproduction REQUIRED, confidence FORBIDDEN. */
export const verifiedFindingSchema = findingBase.extend({
  tier: z.literal("verified"),
  reproduction: reproductionSchema,
  confidence: z.undefined().optional(),
});

/** Research tier: confidence REQUIRED (0..1), reproduction FORBIDDEN. */
export const researchFindingSchema = findingBase.extend({
  tier: z.literal("research"),
  confidence: z.number().min(0).max(1),
  reproduction: z.undefined().optional(),
});

export const findingSchema = z.discriminatedUnion("tier", [verifiedFindingSchema, researchFindingSchema]);
export type Finding = z.infer<typeof findingSchema>;

export const scanMetaSchema = z.object({
  id: z.string().min(1),
  rulesetVersion: z.string().min(1),
  executionMode: z.enum(["hosted", "runner", "cli"]),
  commitSha: z.string().optional(),
  surfacesScanned: z.array(z.enum(SURFACES)),
});

export const findingsDocumentSchema = z.object({
  schema: z.literal("gatepass.findings/1"),
  scan: scanMetaSchema,
  findings: z.array(findingSchema),
});
export type FindingsDocument = z.infer<typeof findingsDocumentSchema>;

/**
 * A finding is cross-surface (FR-002) only when its *locations* span two or more distinct
 * surfaces — i.e. detecting it required correlating evidence across surfaces. A single
 * location in a file that merely classifies into several surfaces is NOT cross-surface;
 * that would overclaim the correlation capability.
 */
export function isCrossSurface(finding: Finding): boolean {
  return new Set(finding.locations.map((l) => l.surface)).size >= 2;
}
