import {
  pgTable,
  text,
  timestamp,
  bigint,
  pgEnum,
  numeric,
  integer,
  boolean,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────
export const planTierEnum = pgEnum("plan_tier", ["free", "team", "scale"]);
export const memberRoleEnum = pgEnum("member_role", ["admin", "member", "viewer"]);
export const gateModeEnum = pgEnum("gate_mode", ["off", "block_verified", "block_threshold"]);
export const gateFailureModeEnum = pgEnum("gate_failure_mode", ["fail_open", "fail_closed"]);
export const scanTriggerEnum = pgEnum("scan_trigger", ["push", "pr", "manual", "schedule", "fleet_change"]);
export const scanExecModeEnum = pgEnum("scan_exec_mode", ["hosted", "runner", "cli"]);
export const scanStatusEnum = pgEnum("scan_status", ["queued", "running", "completed", "failed", "timed_out"]);
export const findingTierEnum = pgEnum("finding_tier", ["verified", "research"]);
export const findingSeverityEnum = pgEnum("finding_severity", ["critical", "high", "medium", "low"]);
export const findingStatusEnum = pgEnum("finding_status", ["open", "fixed", "disputed", "suppressed"]);
export const classStatusEnum = pgEnum("class_status", ["research", "corpus_ready", "active", "demoted"]);
export const disputeResolutionEnum = pgEnum("dispute_resolution", ["pending", "accepted_fp", "rejected"]);
export const fleetPostureEnum = pgEnum("fleet_posture", ["unscanned", "passing", "findings_open", "critical"]);

// ── Tables ─────────────────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  planTier: planTierEnum("plan_tier").notNull().default("free"),
  llmAnalysisEnabled: boolean("llm_analysis_enabled").notNull().default(true),
  agentLoopEnabled: boolean("agent_loop_enabled").notNull().default(false),
  ssoConnectionId: text("sso_connection_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  githubUserId: bigint("github_user_id", { mode: "number" }).notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.orgId, t.userId] }),
  }),
);

export const repositories = pgTable("repositories", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  githubRepoId: bigint("github_repo_id", { mode: "number" }).notNull().unique(),
  name: text("name").notNull(),
  frameworksDetected: text("frameworks_detected").array().notNull().default([]),
  surfacesPresent: text("surfaces_present").array().notNull().default([]),
  gateMode: gateModeEnum("gate_mode").notNull().default("off"),
  gateFailureMode: gateFailureModeEnum("gate_failure_mode").notNull().default("fail_open"),
  agentLoopEnabled: boolean("agent_loop_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scans = pgTable("scans", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  repositoryId: text("repository_id").references(() => repositories.id, { onDelete: "cascade" }),
  fleetServerId: text("fleet_server_id"),
  trigger: scanTriggerEnum("trigger").notNull(),
  executionMode: scanExecModeEnum("execution_mode").notNull(),
  rulesetVersion: text("ruleset_version").notNull(),
  commitSha: text("commit_sha"),
  prNumber: integer("pr_number"),
  status: scanStatusEnum("status").notNull().default("queued"),
  stageTimings: text("stage_timings").notNull().default("{}"),
  postureSnapshot: text("posture_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  seq: integer("seq").primaryKey().generatedByDefaultAsIdentity(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  subject: text("subject").notNull().default("{}"),
});

export const findings = pgTable(
  "findings",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    scanId: text("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    tier: findingTierEnum("tier").notNull(),
    classId: text("class_id").notNull(),
    severity: findingSeverityEnum("severity").notNull(),
    locations: text("locations").notNull(), // jsonb stored as text for simplicity
    surfaces: text("surfaces").array().notNull(),
    reproduction: text("reproduction"),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    explanation: text("explanation").notNull(),
    status: findingStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    scanIdx: index("findings_scan_idx").on(t.scanId),
    fingerprintUniq: uniqueIndex("findings_fingerprint_idx").on(t.scanId, t.fingerprint),
  }),
);

export const suggestedFixes = pgTable("suggested_fixes", {
  id: text("id").primaryKey(),
  findingId: text("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  content: text("content").notNull(), // jsonb
  deliveredVia: text("delivered_via"),
});

export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),
  findingId: text("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason"),
  resolution: disputeResolutionEnum("resolution").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vulnerabilityClasses = pgTable("vulnerability_classes", {
  id: text("id").primaryKey(),
  tierTarget: findingTierEnum("tier_target").notNull(),
  definition: text("definition").notNull(),
  taxonomyRefs: text("taxonomy_refs").notNull().default("[]"),
  status: classStatusEnum("status").notNull().default("research"),
  corpusCaseCount: integer("corpus_case_count").notNull().default(0),
});

export const rules = pgTable("rules", {
  id: text("id").primaryKey(),
  classId: text("class_id")
    .notNull()
    .references(() => vulnerabilityClasses.id),
  rulesetVersionIntroduced: text("ruleset_version_introduced").notNull(),
  defaultRuleset: boolean("default_ruleset").notNull().default(false),
  measuredTpRate: numeric("measured_tp_rate"),
  measuredFpRate: numeric("measured_fp_rate"),
  measuredAgainstCorpus: text("measured_against_corpus"),
});

export const benchmarkRuns = pgTable("benchmark_runs", {
  id: text("id").primaryKey(),
  corpusVersion: text("corpus_version").notNull(),
  tool: text("tool").notNull(),
  results: text("results").notNull(), // jsonb
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const fleetServers = pgTable("fleet_servers", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  endpointOrRepo: text("endpoint_or_repo").notNull(),
  lastScanId: text("last_scan_id").references(() => scans.id),
  posture: fleetPostureEnum("posture").notNull().default("unscanned"),
  configHash: text("config_hash"),
});

export const evidenceExports = pgTable("evidence_exports", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  scanId: text("scan_id")
    .notNull()
    .references(() => scans.id),
  platform: text("platform").notNull(),
  controlMapVersion: text("control_map_version").notNull(),
  items: text("items").notNull(), // jsonb
  status: text("status").notNull().default("pending"),
});

export const questionnaireDrafts = pgTable("questionnaire_drafts", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  sourceFormat: text("source_format").notNull(),
  answers: text("answers").notNull(), // jsonb
  reviewStatus: text("review_status").notNull().default("draft"),
});

export const runnerTokens = pgTable("runner_tokens", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  minRulesetVersion: text("min_ruleset_version").notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

// ── Compliance Tables ──────────────────────────────────────────────
export const complianceDomainEnum = pgEnum("compliance_domain", [
  "wcag",
  "ccpa",
  "app_store",
  "google_play",
  "eu_ai_act",
]);
export const complianceSeverityEnum = pgEnum("compliance_severity", ["critical", "warning", "info"]);
export const complianceStatusEnum = pgEnum("compliance_status", ["pass", "fail", "not_applicable", "manual_review"]);
export const complianceFixKindEnum = pgEnum("compliance_fix_kind", [
  "diff",
  "file_create",
  "config_change",
  "code_change",
]);

/** Per-scan compliance posture result */
export const complianceScans = pgTable("compliance_scans", {
  id: text("id").primaryKey(),
  scanId: text("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0–100
  totalChecks: integer("total_checks").notNull(),
  passCount: integer("pass_count").notNull(),
  failCount: integer("fail_count").notNull(),
  byDomain: text("by_domain").notNull(), // jsonb — per-domain breakdown
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Individual compliance check result */
export const complianceChecks = pgTable("compliance_checks", {
  id: text("id").primaryKey(),
  complianceScanId: text("compliance_scan_id")
    .notNull()
    .references(() => complianceScans.id, { onDelete: "cascade" }),
  ruleId: text("rule_id").notNull(),
  domain: complianceDomainEnum("domain").notNull(),
  status: complianceStatusEnum("status").notNull(),
  severity: complianceSeverityEnum("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  locations: text("locations"), // jsonb array
  fixKind: complianceFixKindEnum("fix_kind"),
  fixDescription: text("fix_description"),
  fixDiff: text("fix_diff"),
  fixFilePath: text("fix_file_path"),
  fixNewContent: text("fix_new_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
