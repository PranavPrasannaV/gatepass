# Tasks: Gatepass — Precision AppSec Platform for the AI-Native Stack

**Input**: Design documents from `specs/001-gatepass-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Corpus fixtures + precision measurement are MANDATORY for every detection rule
(Constitution I, II, V). Parity and tier-integrity tests are mandated by contracts. Generic
TDD tasks are not generated beyond those.

**Organization**: Phases 3–7 map to user stories US1–US5 (priority order). Each story is
independently completable and testable once Phase 2 lands.

## Format: `[ID] [P?] [Story?] Description with file path`

**Status markers**: `[ ]` not started · `[X]` complete & verified · `[~]` partially done
(the MVP vertical slice implemented a real, tested core; inline notes say exactly what is done
vs. deferred). See `validation/us1.md` for the executed evidence.

## Phase 1: Setup

- [X] T001 Initialize git repository and pnpm+Turborepo monorepo skeleton (apps/web, apps/api, apps/workers, packages/{engine,detectors,semantic,rules-registry,findings,github,evidence,shared}, cli/, runner/, corpus/, benchmark/, infra/) with root package.json, turbo.json, tsconfig.base.json
- [~] T002 [P] Configure toolchain: ESLint+Prettier configs, Vitest workspace config in vitest.workspace.ts, GitHub Actions CI skeleton in .github/workflows/ci.yml — PARTIAL: Vitest config done; ESLint/Prettier/CI workflow pending
- [X] T003 [P] Local infrastructure: docker-compose.yml (Postgres 16, Redis), .env.example, pnpm scripts (db:migrate, dev) in package.json
- [X] T004 [P] Define corpus fixture format and directory convention in corpus/README.md and corpus/schema/case.schema.json (labeled cases: class_id, label, public flag — per data-model CorpusCase)

## Phase 2: Foundational (blocking prerequisites)

- [ ] T005 Database schema migration 0001 (Organization, User, Membership, Repository, Scan, AuditEvent tables with org RLS policies) in packages/shared/db/migrations/ per data-model.md
- [ ] T006 Database schema migration 0002 (Finding with tier CHECK constraint — verified⇒reproduction NOT NULL∧confidence NULL; research⇒confidence NOT NULL — SuggestedFix, Dispute, VulnerabilityClass, Rule, CorpusCase index, BenchmarkRun, FleetServer, EvidenceExport, QuestionnaireDraft, RunnerToken) in packages/shared/db/migrations/
- [~] T007 [P] Canonical findings schema `gatepass.findings/1` with tier validation rules 1–5 and SARIF 2.1.0 serializer in packages/findings/src/ per contracts/findings-schema.md, including redaction linter for reproduction steps — DONE except SARIF serializer (schema + tier validation + redaction linter built and tested)
- [ ] T008 [P] Shared platform library: config loader, OpenTelemetry setup, crypto helpers, and the audited outbound writer (every external write → AuditEvent) in packages/shared/src/
- [X] T009 [P] Vulnerability-class registry with lifecycle enforcement (research → corpus_ready → active → demoted; definition+corpus required before active) in packages/rules-registry/src/
- [~] T010 Corpus harness: fixture loader, per-class TP/FP measurement, `pnpm corpus measure --corpus <tag>` CLI in corpus/harness/, plus CI job in .github/workflows/ci.yml that fails any rule lacking fixtures (Constitution gate). Harness MUST also execute the reproduction of every verified-class fixture finding and fail CI on any non-confirmable reproduction (SC-002) — DONE except CI workflow YAML (harness + measurement + reproduction verification + gate logic built and passing)
- [~] T011 Engine core: ScanContext, file-tree ingestion, tree-sitter parser integration (TS/JS, Python, Go, SQL) and JSON/YAML/TOML config parsers in packages/engine/src/parsing/ — PARTIAL: ScanContext + file ingestion built; tree-sitter AST parsing deferred (current detectors use line/regex + JSON parsing)
- [~] T012 Engine surface graph: surface model (app_code, agent_code, mcp_server, tool_defs, permission_scopes), surface extraction pipeline, and cross-surface reference resolution in packages/engine/src/surfaces/ — PARTIAL: multi-valued surface classification built; cross-surface reference resolution deferred to T025
- [ ] T013 Fastify API skeleton: server bootstrap, RFC 7807 errors, session auth via GitHub OAuth, org RBAC middleware (admin/member/viewer), org/repo/settings endpoints (GET/PATCH per contracts/api.md §orgs) in apps/api/src/
- [ ] T014 [P] Scan orchestrator: BullMQ queues, per-org concurrency fairness, retries/timeouts, scan state machine (queued→running→completed|failed|timed_out) with stage timings in apps/workers/src/orchestrator/
- [ ] T015 [P] Scan executor sandbox wrapper: containerized execution profile (read-only FS, egress allow-list) with local subprocess mode for dev in apps/workers/src/executor/ and infra/sandbox/
- [ ] T015a [P] Baseline encryption IaC: encrypted-at-rest RDS/S3/Redis (KMS-managed keys), TLS enforced on all endpoints, artifact-bucket default encryption in infra/base/ (FR-026)
- [ ] T016 [P] GitHub App base: app manifest with contents:read/pull_requests:write/checks:write/metadata:read only, webhook receiver (installation, push, pull_request), authenticated clone service in packages/github/src/ per contracts/github-integration.md
- [ ] T017 [P] Next.js dashboard shell: GitHub sign-in, org switcher, repo list wired to API in apps/web/src/

**Checkpoint**: Foundation ready — user stories can begin

## Phase 3: User Story 1 — Scan a Repository and Get Trustworthy Findings (P1) 🎯 MVP

**Goal**: Connected repo → single scan across all five surfaces → two-tier findings (verified
with reproductions, research with confidence), including cross-surface findings.

**Independent Test**: quickstart.md Scenario 1 — seeded vulnerable repo yields every planted
verified issue with a working reproduction and every research issue with confidence; zero
tier mislabels (SC-003).

### Corpus & fixtures for US1 (mandatory)

- [X] T018 [P] [US1] Seed evaluation repo with planted issues (exposed secret, missing RLS, unauth MCP transport, unbounded tool param, poisoned tool description, over-permissioned loop, scoped-tool/unscoped-DB-client cross-surface case) in corpus/eval-repos/vulnerable-nextjs-mcp/
- [~] T019 [P] [US1] Corpus fixtures (vulnerable + clean cases) for all seven verified classes in corpus/cases/verified/{exposed-secret,rls-gap,cors,unpinned-dep,unauth-mcp-transport,unbounded-tool-param,missing-schema-validation}/ — DONE for the 2 implemented verified classes (exposed-secret, unauth-mcp-transport); remaining 5 pending their detectors
- [~] T020 [P] [US1] Corpus fixtures for research classes in corpus/cases/research/{tool-poisoning,hbv,confused-deputy,over-permissioned-loop}/ and cross-surface cases in corpus/cases/cross-surface/ — DONE for tool-poisoning; remaining research classes + cross-surface pending their analyzers

### Implementation for US1

- [ ] T021 [P] [US1] Framework detection (Next.js, Supabase, Firebase, FastAPI, Go) writing Repository.frameworks_detected in packages/engine/src/frameworks/; unsupported frameworks emit an explicit "framework checks not applicable" status in scan results (spec edge case), never a silent skip
- [~] T022 [US1] Verified detectors: exposed-secrets (bundles/artifacts) and unpinned/hallucinated dependencies, each emitting reproduction objects, in packages/detectors/src/{secrets,dependencies}/ — DONE: exposed-secrets (6 patterns, bundle-aware, reproductions, redaction-checked); dependencies detector deferred
- [ ] T023 [US1] Verified detectors: framework-aware RLS/security-rule gaps (Supabase/Firebase) and CORS misconfiguration in packages/detectors/src/{tenant-isolation,cors}/
- [~] T024 [US1] Verified detectors: unauthenticated MCP transports, unbounded tool parameters, missing schema validation in packages/detectors/src/mcp/ — DONE: unauth-mcp-transport (file-level auth detection, reproductions); unbounded-param + missing-schema deferred
- [ ] T025 [US1] Cross-surface correlation pass (tool scope vs. backing client permissions across surface graph) emitting multi-surface findings in packages/engine/src/correlate/
- [ ] T026 [US1] LLM gateway client: Gatepass-owned accounts, zero-retention headers, per-org disable flag with static-fallback signal in packages/semantic/src/gateway/
- [~] T027 [US1] Research-tier analyzers (tool poisoning, HBV, confused-deputy, over-permissioned loops) with claude-haiku-4-5 pre-filter + claude-sonnet-5 analysis in packages/semantic/src/analyzers/ — PARTIAL: tool-poisoning heuristic pre-filter with calibrated confidence built; LLM gateway + remaining classes deferred
- [ ] T028 [US1] Confidence calibration against corpus labels (score mapping, display threshold) in packages/semantic/src/calibration/ measured via corpus harness
- [~] T029 [US1] End-to-end hosted scan pipeline: clone→parse→surfaces→detect→semantic→findings persistence with fingerprinting/dedupe in apps/workers/src/pipeline/ — DONE as library pipeline (parse→surfaces→detect→validate with fingerprinting/dedupe/redaction in packages/detectors/pipeline.ts); DB persistence + worker/clone deferred
- [ ] T030 [US1] Scan & findings API: POST scans, GET scan status/stage timings, GET findings (+filters incl. include_suppressed to reveal below-threshold research findings — spec edge case) and findings.sarif per contracts/api.md in apps/api/src/routes/scans.ts
- [ ] T031 [US1] Dispute endpoint + suppression on unchanged fingerprints (POST /findings/:id/dispute) feeding precision metrics in apps/api/src/routes/findings.ts
- [ ] T032 [P] [US1] Dashboard findings view: tier badges, reproduction display, confidence always visible for research tier (FR-010), dispute action in apps/web/src/app/findings/
- [X] T033 [P] [US1] OSS CLI `gatepass scan <path> --output findings.json` embedding engine+detectors (semantic off unless authed) in cli/src/; document the CLI contract (flags, exit codes, output modes) in specs/001-gatepass-platform/contracts/cli.md
- [X] T034 [US1] US1 validation: run quickstart Scenario 1 + Scenario 7 (LLM disable) against eval repo; record results in specs/001-gatepass-platform/validation/us1.md

**Checkpoint**: MVP — a repo can be scanned and trusted findings delivered

## Phase 4: User Story 2 — Fix Findings in the Developer's Workflow (P2)

**Goal**: PR review comments with suggested diffs, opt-in agent guidance, CI gate that blocks
but never rewrites, fail-open by default.

**Independent Test**: quickstart.md Scenario 2 — PR with planted issue gets one review with
suggestion; gate blocks when configured; outage → neutral check (fail-open) unless opted
fail-closed; AuditEvent shows zero repo writes.

- [ ] T035 [US2] PR webhook → incremental scan (diff against last full-scan surface graph) in apps/workers/src/pipeline/incremental.ts
- [ ] T036 [US2] Suggested-fix generator producing unified diffs for verified detector classes in packages/detectors/src/fixes/
- [ ] T037 [US2] PR review commenter: one review per scan, per-finding comments with tier badge + ```suggestion``` blocks, via audited writer in packages/github/src/review.ts
- [ ] T038 [US2] CI gate Check Run: threshold matrix (off/block_verified/block_threshold), failure/success/neutral conclusions incl. fail-open "scan unavailable" annotation and per-repo fail_closed per contracts/github-integration.md in packages/github/src/checkrun.ts; define the block_threshold config schema (severity × count) in contracts/github-integration.md as part of this task
- [ ] T039 [P] [US2] Agent-loop guidance: structured fix guidance format + GET endpoint returning 403 unless repo agent_loop_enabled (FR-014) in apps/api/src/routes/agent-guidance.ts and packages/detectors/src/fixes/guidance.ts
- [ ] T040 [P] [US2] VS Code extension (minimal): findings annotations from findings.json / API in ide/vscode/
- [ ] T041 [P] [US2] Repo remediation settings UI (gate mode, failure mode, agent-loop opt-in) in apps/web/src/app/settings/
- [ ] T042 [US2] No-write guarantee test: integration test asserting the GitHub client can perform no contents-write operation and all outbound writes appear in AuditEvent (SC-005) in packages/github/test/no-write.test.ts
- [ ] T043 [US2] US2 validation: run quickstart Scenario 2 end-to-end; record in specs/001-gatepass-platform/validation/us2.md

**Checkpoint**: Findings arrive in PRs; gate blocks without rewriting

## Phase 5: User Story 3 — Public Precision Benchmark (P3)

**Goal**: Versioned public corpus, reproducible published TP/FP per class vs. pinned
incumbents, release gate on precision regression, responsible-disclosure reports.

**Independent Test**: quickstart.md Scenario 4 — two runs on same corpus tag are identical; a
regressed rule blocks release; published page shows per-class numbers per tool.

- [ ] T044 [P] [US3] Corpus versioning workflow: immutable `corpus-vN` tags, public-subset mirror script to open repo in corpus/scripts/publish.ts
- [ ] T045 [US3] Benchmark harness: run Gatepass CLI + pinned incumbent scanner containers (mcp-scanner, YARA-based tool) against a corpus tag, score against labels, emit per-class TP/FP JSON in benchmark/src/
- [ ] T046 [US3] BenchmarkRun persistence + public API endpoints (GET /public/benchmark, /public/benchmark/:corpusVersion — immutable once published) in apps/api/src/routes/public.ts
- [ ] T047 [P] [US3] Public benchmark page (per-class table, per-tool comparison, corpus tag + raw JSON download, history) in apps/web/src/app/benchmark/
- [ ] T048 [US3] Release precision gate: CI job comparing candidate measurement vs. last published run; block on regression unless affected rules demoted (default_ruleset=false) in .github/workflows/release.yml (FR-019)
- [ ] T048a [P] [US3] Scheduled benchmark cadence: monthly automated benchmark run + publish workflow (pinned incumbent versions, current corpus tag) in .github/workflows/benchmark-monthly.yml (SC-007)
- [ ] T049 [P] [US3] Responsible-disclosure workflow: maintainer notification tracking, disclosure-window state machine, public server-scan report publishing (post-disclosure only) in apps/api/src/routes/reports.ts and packages/shared/src/disclosure/
- [ ] T050 [US3] US3 validation: run quickstart Scenario 4 incl. deliberate-regression fixture; record in specs/001-gatepass-platform/validation/us3.md

**Checkpoint**: The trust asset is live and reproducible

## Phase 6: User Story 4 — Compliance Evidence & Questionnaires (P4)

**Goal**: Scan posture → SOC 2/ISO evidence in Vanta/Drata; questionnaire answers drafted
strictly from posture with human review gate.

**Independent Test**: quickstart.md Scenario 5 — evidence lands in sandbox citing scan_id;
unanswerable questions flagged not guessed; no-posture export returns 409.

- [ ] T051 [P] [US4] Control map v1 (posture checks → SOC 2 CC-series / ISO Annex A per contracts/evidence-export.md) + posture snapshot evaluator in packages/evidence/src/controls/
- [ ] T052 [US4] Vanta and Drata exporters via their public evidence APIs, EvidenceExport persistence with external IDs, 409 no_posture_data guard (FR-023) in packages/evidence/src/exporters/
- [ ] T053 [US4] Questionnaire ingestion (CSV/XLSX/SIG-lite subset), posture-cited answer drafting, needs_human_input flagging, review-before-export workflow in packages/evidence/src/questionnaire/ and apps/api/src/routes/questionnaires.ts; enumerate the supported SIG-lite sections in contracts/evidence-export.md as part of this task
- [ ] T054 [P] [US4] Evidence & questionnaire UI: integration connect, export history with traceability links, draft review flow in apps/web/src/app/compliance/
- [ ] T055 [US4] US4 validation: run quickstart Scenario 5 against Vanta sandbox; record in specs/001-gatepass-platform/validation/us4.md

**Checkpoint**: Deal-unblocking evidence rides scan posture

## Phase 7: User Story 5 — Internal MCP Fleet Scanning (P5)

**Goal**: Register internal MCP servers as a fleet; scan before production; continuous
rescans on change; fleet posture view; self-hosted runner for code-never-leaves scanning.

**Independent Test**: quickstart.md Scenarios 3 & 6 — runner findings byte-identical to
hosted; fleet of 3 servers shows correct aggregate; config change triggers rescan.

- [ ] T056 [P] [US5] Fleet registry: server registration, config_hash change detection → rescan trigger, posture rollup in apps/api/src/routes/fleet.ts and apps/workers/src/fleet/
- [ ] T057 [P] [US5] Fleet posture dashboard (per-server results + aggregate view) in apps/web/src/app/fleet/
- [ ] T058 [US5] Self-hosted runner binary: embed engine+detectors, handshake with version floor (426 upgrade_required), config fetch, heartbeat in runner/src/ per contracts/runner-protocol.md
- [ ] T059 [US5] Runner results endpoint: schema-validated findings/posture-only upload (reject any payload with file contents), RunnerToken auth + revocation, AuditEvent per upload in apps/api/src/routes/runner.ts
- [ ] T060 [US5] Hosted↔runner parity CI test: same ruleset + input tree ⇒ byte-identical fingerprints (FR-006a) in packages/engine/test/parity.test.ts
- [ ] T061 [US5] US5 validation: run quickstart Scenarios 3 and 6; record in specs/001-gatepass-platform/validation/us5.md

**Checkpoint**: Platform-team buyer served; hybrid execution proven

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T062 [P] Plan-tier gating middleware (Free/Team/Scale feature flags per FR-025) enforced across API routes in apps/api/src/middleware/plan-tier.ts
- [ ] T063 [P] SLO instrumentation: per-scan stage-timing dashboards, p95 scan latency + 99.9% availability alerts, public status page config in infra/observability/
- [ ] T064 [P] Rate limiting (per-org token, 429 + Retry-After) in apps/api/src/middleware/rate-limit.ts
- [ ] T065 [P] Scale-tier SSO/SCIM via WorkOS in apps/api/src/auth/sso.ts
- [ ] T066 [P] Artifact TTL enforcement + retention jobs (30-day default, evidence override) in apps/workers/src/retention/
- [ ] T067 Self-scan CI: Gatepass scans its own repo with production ruleset; critical findings block release (Constitution: scanner passes its own scan) in .github/workflows/self-scan.yml
- [ ] T068 [P] Load validation against launch envelope (50K scans/day synthetic, 2M-LOC repo, 500-server fleet; assert SC-010 latencies) in infra/loadtest/
- [ ] T069 [P] Documentation: README, CLI docs, runner install guide, disclosure policy page in docs/
- [ ] T070 Full quickstart re-run (Scenarios 1–7) + constitution re-verification (tier labels, approval flows, no silent writes) + timed connect-to-first-findings onboarding walkthrough asserting the 15-minute target (SC-004); record in specs/001-gatepass-platform/validation/final.md

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phases 3–7 (priority order) → Phase 8
- **US1 (Phase 3)** depends only on Phase 2 — the MVP slice
- **US2** consumes US1's pipeline (incremental scan, fixes for detector classes)
- **US3** consumes US1's corpus + CLI; independent of US2
- **US4** consumes US1's posture snapshots; independent of US2/US3
- **US5** consumes US1's engine (runner embeds it); independent of US2–US4
- Within phases, [P] tasks touch disjoint files and may run in parallel

## Parallel Execution Examples

- Phase 2: T007, T008, T009 together; then T014, T015, T016, T017 together after T005/T006
- US1: T018, T019, T020 (fixtures) in parallel; T022–T024 after T019; T032, T033 in parallel at the end
- Post-US1: US2, US3, US4, US5 phases can proceed in parallel by separate contributors

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1)**: a scannable repo with trustworthy two-tier
findings via dashboard and CLI. Ship that, validate with design partners, then US2 (PR
remediation) as the retention driver, US3 (benchmark) as the marketing/trust driver, US4/US5
as the monetization expanders. Stop at any checkpoint for an independently deliverable slice.
