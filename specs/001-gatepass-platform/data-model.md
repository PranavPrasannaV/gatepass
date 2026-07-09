# Data Model: Gatepass Platform

**Date**: 2026-07-09 | **Plan**: [plan.md](plan.md)

PostgreSQL 16; all tenant tables carry `org_id` with row-level security. `PK` = primary key,
`FK` = foreign key. Timestamps (`created_at`, `updated_at`) implied on all tables.

## Tenancy & Identity

### Organization
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name, slug | text | slug unique |
| plan_tier | enum(free, team, scale) | gates features (FR-025) |
| llm_analysis_enabled | boolean default true | FR-011a per-org disable |
| sso_connection_id | text nullable | Scale tier (WorkOS) |

### User
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| github_user_id | bigint unique | auth via GitHub (FR-027) |
| email, display_name | text | |

### Membership
| Field | Type | Notes |
|---|---|---|
| org_id, user_id | FK, composite PK | |
| role | enum(admin, member, viewer) | RBAC (FR-027) |

## Repositories & Scanning

### Repository
| Field | Type | Notes |
|---|---|---|
| id | uuid PK; org_id FK | |
| github_repo_id | bigint unique | |
| frameworks_detected | text[] | nextjs, supabase, firebase, fastapi, go |
| surfaces_present | text[] | app_code, agent_code, mcp_server, tool_defs, permission_scopes |
| gate_mode | enum(off, block_verified, block_threshold) | FR-016 |
| gate_failure_mode | enum(fail_open, fail_closed) default fail_open | FR-016a |
| agent_loop_enabled | boolean default false | FR-014 opt-in |

### Scan
| Field | Type | Notes |
|---|---|---|
| id | uuid PK; org_id, repository_id FK | repository_id nullable when fleet-server scan |
| fleet_server_id | FK nullable | exactly one of repository_id / fleet_server_id set |
| trigger | enum(push, pr, manual, schedule, fleet_change) | FR-006 |
| execution_mode | enum(hosted, runner, cli) | FR-006a |
| ruleset_version | text | pins engine+rules for reproducibility |
| commit_sha, pr_number | text/int nullable | |
| status | enum(queued, running, completed, failed, timed_out) | |
| stage_timings | jsonb | queue/clone/parse/detect/semantic/report (R9) |
| posture_snapshot | jsonb | input to evidence export |

**State transitions**: queued → running → completed | failed | timed_out. Failed/timed-out
gated scans resolve the check per `gate_failure_mode`.

## Findings

### Finding
| Field | Type | Notes |
|---|---|---|
| id | uuid PK; org_id, scan_id FK | |
| fingerprint | text | stable across scans (dedupe/suppression) |
| tier | enum(verified, research) | closed enum (FR-007) |
| class_id | FK → VulnerabilityClass | |
| severity | enum(critical, high, medium, low) | |
| locations | jsonb | file/line/surface refs; multi-location for cross-surface |
| surfaces | text[] | ≥2 entries marks a cross-surface finding (FR-002) |
| reproduction | jsonb **NOT NULL when tier=verified** | DB CHECK constraint (FR-008) |
| confidence | numeric(4,3) **NOT NULL when tier=research** | CHECK constraint (FR-009) |
| explanation | text | plain-language, always present |
| status | enum(open, fixed, disputed, suppressed) | FR-011 |

**Integrity (Principle II)**: `CHECK ((tier='verified' AND reproduction IS NOT NULL AND
confidence IS NULL) OR (tier='research' AND confidence IS NOT NULL))` — tier honesty is a
database invariant, not a convention.

### SuggestedFix
| Field | Type | Notes |
|---|---|---|
| id | uuid PK; finding_id FK | |
| kind | enum(diff, agent_guidance) | FR-012/FR-014 |
| content | jsonb | unified diff or structured guidance |
| delivered_via | enum(pr_comment, ide, agent_loop) nullable | |

### Dispute
| Field | Type | Notes |
|---|---|---|
| id | uuid PK; finding_id FK; user_id FK | |
| reason | text | |
| resolution | enum(pending, accepted_fp, rejected) | feeds precision metrics (FR-011) |

## Rules, Classes, Corpus

### VulnerabilityClass
| Field | Type | Notes |
|---|---|---|
| id | text PK | e.g. `tool-poisoning`, `hbv`, `exposed-secret` |
| tier_target | enum(verified, research) | |
| definition | text | written class definition (Principle V) |
| taxonomy_refs | jsonb | OWASP Agentic Top 10 mapping etc. |
| status | enum(research, corpus_ready, active, demoted) | lifecycle order enforced |

### Rule
| Field | Type | Notes |
|---|---|---|
| id | text PK; class_id FK | |
| ruleset_version_introduced | text | |
| default_ruleset | boolean | demotion flips this (FR-019) |
| measured_tp_rate, measured_fp_rate | numeric | vs. corpus version below |
| measured_against_corpus | text | e.g. `corpus-v3` |

### CorpusCase (lives in `corpus/` repo; indexed in DB for measurement joins)
| Field | Type | Notes |
|---|---|---|
| id | text PK | |
| corpus_version_added | text | immutable tags (FR-017) |
| class_id | FK | |
| label | enum(vulnerable, clean) | ground truth |
| public | boolean | public subset mirrors to open repo |

### BenchmarkRun
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| corpus_version | text | |
| tool | text | `gatepass`, `mcp-scanner@x.y`, … (pinned versions) |
| results | jsonb | per-class TP/FP (FR-018) |
| published_at | timestamptz nullable | published runs are immutable |

## Fleet

### FleetServer
| Field | Type | Notes |
|---|---|---|
| id | uuid PK; org_id FK | |
| name, endpoint_or_repo | text | internal MCP server identity |
| last_scan_id | FK nullable | |
| posture | enum(unscanned, passing, findings_open, critical) | fleet view aggregate (FR-024) |
| config_hash | text | change detection → rescan trigger |

## Evidence & Questionnaires

### EvidenceExport
| Field | Type | Notes |
|---|---|---|
| id | uuid PK; org_id FK; scan_id FK | traceable to scan (SC-008) |
| platform | enum(vanta, drata) | |
| control_map_version | text | SOC2/ISO mapping version |
| items | jsonb | exported evidence items + external IDs |
| status | enum(pending, delivered, failed) | |

### QuestionnaireDraft
| Field | Type | Notes |
|---|---|---|
| id | uuid PK; org_id FK | |
| source_format | enum(csv, xlsx, sig_lite) | |
| answers | jsonb | each answer cites scan/posture IDs (FR-022) |
| review_status | enum(draft, reviewed, exported) | human review gate |

## Audit & Operations

### AuditEvent (append-only)
| Field | Type | Notes |
|---|---|---|
| id | bigserial PK; org_id FK nullable | |
| actor | text | user, system component, or runner token |
| action | text | every outbound write recorded (SC-005) |
| subject | jsonb | PR comment ID, check run ID, evidence item… |

### RunnerToken
| Field | Type | Notes |
|---|---|---|
| id | uuid PK; org_id FK | |
| token_hash | text | org-scoped self-hosted runner auth (R10) |
| min_ruleset_version | text | version floor |
| revoked_at | timestamptz nullable | |

## Relationships (summary)

Organization 1—n Membership n—1 User; Organization 1—n Repository 1—n Scan 1—n Finding
1—n SuggestedFix / Dispute; VulnerabilityClass 1—n Rule; Rule n—n CorpusCase (via
measurement); Organization 1—n FleetServer 1—n Scan; Scan 1—n EvidenceExport;
Organization 1—n QuestionnaireDraft / RunnerToken / AuditEvent.
