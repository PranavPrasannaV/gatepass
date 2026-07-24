import { z } from "zod";

/**
 * Compliance Check — a single rule check result (pass or fail).
 * This is the compliance-domain equivalent of a security Finding.
 * It carries a suggested code-level fix for every failing check.
 */

export const COMPLIANCE_DOMAINS = ["wcag", "ccpa", "app_store", "google_play", "eu_ai_act"] as const;
export type ComplianceDomain = (typeof COMPLIANCE_DOMAINS)[number];

export const COMPLIANCE_SEVERITIES = ["critical", "warning", "info"] as const;
export type ComplianceSeverity = (typeof COMPLIANCE_SEVERITIES)[number];

export const COMPLIANCE_STATUSES = ["pass", "fail", "not_applicable", "manual_review"] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

/** A single compliance rule definition */
export interface ComplianceRule {
  id: string;
  domain: ComplianceDomain;
  title: string;
  description: string;
  severity: ComplianceSeverity;
  standard: string; // e.g. "WCAG 2.2 AA 2.5.8", "CCPA §1798.120"
  scannable: boolean; // true = can auto-check, false = requires manual review
  baselineVersion: string; // "2026.1" etc
}

/** Location in source code where a compliance issue was found */
export const complianceLocationSchema = z.object({
  path: z.string().min(1),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  snippet: z.string().optional(),
});
export type ComplianceLocation = z.infer<typeof complianceLocationSchema>;

/** A suggested code-level fix for a compliance issue */
export const complianceFixSchema = z.object({
  kind: z.enum(["diff", "file_create", "config_change", "code_change"]),
  description: z.string().min(1),
  diff: z.string().optional(),
  filePath: z.string().optional(),
  newContent: z.string().optional(),
});
export type ComplianceFix = z.infer<typeof complianceFixSchema>;

/** A single compliance check result */
export const complianceCheckSchema = z.object({
  ruleId: z.string().min(1),
  domain: z.enum(COMPLIANCE_DOMAINS),
  status: z.enum(COMPLIANCE_STATUSES),
  severity: z.enum(COMPLIANCE_SEVERITIES),
  title: z.string().min(1),
  description: z.string().min(1),
  locations: z.array(complianceLocationSchema).default([]),
  fix: complianceFixSchema.optional(),
});
export type ComplianceCheck = z.infer<typeof complianceCheckSchema>;

/** Aggregated compliance posture for a scan */
export const complianceResultSchema = z.object({
  scanId: z.string().min(1),
  timestamp: z.string().datetime(),
  totalChecks: z.number().int(),
  passCount: z.number().int(),
  failCount: z.number().int(),
  naCount: z.number().int(),
  manualCount: z.number().int(),
  score: z.number().min(0).max(100), // 0-100 compliance score
  byDomain: z.record(
    z.enum(COMPLIANCE_DOMAINS),
    z.object({
      total: z.number().int(),
      pass: z.number().int(),
      fail: z.number().int(),
      score: z.number().min(0).max(100),
    }),
  ),
  checks: z.array(complianceCheckSchema),
});
export type ComplianceResult = z.infer<typeof complianceResultSchema>;

/** Severity color mapping */
export const severityColor: Record<ComplianceSeverity, string> = {
  critical: "text-red-600 bg-red-50 border-red-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
};

export const severityDotColor: Record<ComplianceSeverity, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

/** Domain label and icon mapping */
export const domainMeta: Record<ComplianceDomain, { label: string; short: string; order: number }> = {
  wcag: { label: "Web Accessibility (WCAG 2.2)", short: "WCAG", order: 0 },
  ccpa: { label: "Privacy & Legal (CCPA/CPRA)", short: "CCPA", order: 1 },
  app_store: { label: "Apple App Store", short: "App Store", order: 2 },
  google_play: { label: "Google Play Store", short: "Play Store", order: 3 },
  eu_ai_act: { label: "EU AI Act", short: "EU AI", order: 4 },
};
