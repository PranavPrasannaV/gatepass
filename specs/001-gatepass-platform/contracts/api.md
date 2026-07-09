# Contract: Platform API (REST, `/v1`)

Auth: session (dashboard) or org-scoped API keys; runner endpoints use runner tokens.
All responses JSON; errors RFC 7807. RBAC: viewer=read, member=read+dispute+scan,
admin=settings+tokens+exports.

## Orgs, repos, settings

| Method & Path | Purpose | Notes |
|---|---|---|
| GET /orgs/:org | Org profile, plan tier | |
| GET /orgs/:org/repos | Connected repos + scan settings | mirrors GitHub visibility (FR-027) |
| PATCH /orgs/:org/repos/:repo | Set gate_mode, gate_failure_mode, agent_loop_enabled | admin; FR-014/016/016a |
| PATCH /orgs/:org/settings | llm_analysis_enabled etc. | admin; FR-011a |

## Scans & findings

| Method & Path | Purpose | Notes |
|---|---|---|
| POST /orgs/:org/repos/:repo/scans | Trigger on-demand scan | FR-006 |
| GET /scans/:id | Status + stage timings | |
| GET /scans/:id/findings | Findings (canonical schema) | filter: tier, class, severity, status |
| GET /scans/:id/findings.sarif | SARIF export | |
| POST /findings/:id/dispute | Open dispute | FR-011 |
| POST /findings/:id/agent-guidance | Fetch structured fix guidance | 403 unless repo agent_loop_enabled (FR-014) |

## Fleet (Scale tier)

| Method & Path | Purpose | Notes |
|---|---|---|
| POST /orgs/:org/fleet/servers | Register MCP server | FR-024 |
| GET /orgs/:org/fleet | Aggregated posture view | per-server + rollup |
| POST /orgs/:org/fleet/servers/:id/rescan | Manual rescan | change-detection also triggers |

## Evidence & questionnaires (Scale tier)

| Method & Path | Purpose | Notes |
|---|---|---|
| POST /orgs/:org/integrations/vanta\|drata | Connect platform | admin |
| GET /orgs/:org/evidence-exports | Export history + traceability | every item cites scan_id (SC-008) |
| POST /orgs/:org/questionnaires | Upload questionnaire (csv/xlsx/sig-lite) | drafts answers from posture only (FR-022/023) |
| GET /orgs/:org/questionnaires/:id | Drafts for human review | review_status workflow |

## Public (no auth)

| Method & Path | Purpose | Notes |
|---|---|---|
| GET /public/benchmark | Latest published benchmark results | per-class TP/FP per tool per corpus tag (FR-018) |
| GET /public/benchmark/:corpusVersion | Historical, immutable | SC-007 reproducibility |
| GET /public/reports/:slug | Public server-scan reports | post-disclosure only (FR-020) |

**Availability**: 99.9% SLO on scan-critical paths (SC-011). Rate limits per org token;
429 with Retry-After.
