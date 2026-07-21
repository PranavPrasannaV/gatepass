# Phase 0 Research: Gatepass Platform

**Date**: 2026-07-09 | **Plan**: [plan.md](plan.md)

All Technical Context unknowns resolved. Format per decision: Decision / Rationale /
Alternatives considered.

## R1. Engine language & parsing strategy

- **Decision**: TypeScript on Node 22; tree-sitter grammars for TS/JS, Python, Go, SQL;
  dedicated config parsers for JSON/YAML/TOML (MCP configs, tool definitions, IaC snippets).
- **Rationale**: The supported stack (Next.js/Supabase/Firebase/FastAPI/Go) skews JS/TS-heavy;
  tree-sitter gives fast, incremental, error-tolerant parsing across all five languages with
  one integration surface. TypeScript keeps engine, CLI, workers, and web in one toolchain —
  critical for a small team shipping one engine three ways.
- **Alternatives**: Rust engine (faster, but slower iteration and a second toolchain; can port
  hot paths later behind the same findings contract); building on Semgrep as a library
  (rule expressiveness capped, cedes the cross-surface correlation layer that is the moat).

## R2. One engine, three distributions

- **Decision**: `packages/engine` + `packages/detectors` are pure libraries (no DB/network
  imports). Hosted workers, the OSS CLI, and the self-hosted runner all embed them; a scan is
  fully described by `(ruleset version, corpus of inputs, config)`.
- **Rationale**: FR-006a requires identical findings hosted vs. self-hosted. Parity by
  construction (same compiled artifact) beats parity by testing. Also makes the public
  benchmark reproducible by third parties via the CLI.
- **Alternatives**: Separate hosted analyzer service with richer analysis than the CLI —
  rejected: violates FR-006a and undermines benchmark trust.

## R3. Research-tier semantic layer

- **Decision**: LLM-assisted analyzers in `packages/semantic` call NVIDIA NIM
  (default model `z-ai/glm-5.2`) through a Gatepass-owned OpenAI-compatible gateway
  (`createNimTransport` → `https://integrate.api.nvidia.com/v1/chat/completions`,
  `Authorization: Bearer $NVIDIA_API_KEY`). Prompts operate on extracted artifacts (tool
  definitions, permission scopes, code slices from the surface graph), not whole repos.
  Confidence scoring calibrated against corpus labels; per-org disable flag falls back to
  static heuristics with reduced-coverage warning (FR-011a). The `LlmTransport` seam keeps
  the provider swappable.
- **Rationale**: Tool poisoning/HBV/confused-deputy detection is semantic by nature (spec §
  problem statement); calibration against the labeled corpus is what turns LLM output into a
  measured confidence score rather than vibes — Principle II. Provider choice is operational
  (NIM GLM 5.2); abstraction preserves future swaps.
- **Alternatives**: Static-only (fails precision bar on semantic classes); customer-supplied
  keys (non-reproducible benchmark, inconsistent precision — rejected in clarification Q2);
  self-hosted open-weights model (operational burden; revisit for the self-hosted runner if
  enterprise demand materializes); Anthropic Claude (prior default; replaced by NIM for live wiring).

## R4. Scan execution & isolation

- **Decision**: One container per scan (ECS Fargate), read-only filesystem except workspace,
  no outbound network except allow-listed endpoints (GitHub clone, artifact store, LLM
  gateway). Orchestrator (BullMQ on Redis) handles queueing, retries, timeouts, and per-org
  concurrency fairness. Incremental scans diff against the last full-scan surface graph.
- **Rationale**: Customer code is hostile-by-assumption input for a security vendor;
  container-per-scan is the minimum credible isolation story and is what our own security
  questionnaire answers will claim. Incremental scanning is required to hit p95 < 5 min on
  PRs against 2M-LOC repos.
- **Alternatives**: Firecracker microVMs (stronger isolation, more ops burden — revisit at
  Scale-tier enterprise demand); shared long-lived workers (rejected: cross-tenant risk).

## R5. Platform services & data

- **Decision**: Fastify API + Next.js dashboard; PostgreSQL 16 via Drizzle ORM with
  row-level security keyed by org; S3 artifacts with per-object TTL (default 30 days,
  evidence-retention override); Redis for queue/cache. Auth: GitHub OAuth (NextAuth) +
  GitHub App installation for repo access; org RBAC roles admin/member/viewer mirroring
  GitHub repo visibility (FR-027); WorkOS for SAML/SCIM at Scale tier.
- **Rationale**: Boring, scalable-to-envelope choices (SC-010 is comfortably within a single
  Postgres + queue architecture); RLS-in-Postgres eats our own dogfood on tenant isolation —
  the very class we scan for.
- **Alternatives**: Supabase as backend (attractive dogfooding but couples product to a
  scanned framework); microservices (premature at launch envelope).

## R6. GitHub integration & CI gate

- **Decision**: GitHub App with `contents:read`, `pull_requests:write` (comments/review
  suggestions only), `checks:write`, `metadata:read`. PR findings delivered as review
  comments with suggested-change blocks; CI gate is a Check Run whose conclusion enforces the
  configured threshold; on scan failure/timeout the check reports neutral (fail-open) unless
  the repo opts into fail-closed (FR-016a). SARIF export supports code-scanning ingestion.
- **Rationale**: `pull_requests:write` is required for review comments but grants no commit
  capability — scope-level enforcement of FR-015/Principle III. Check Runs are the native
  block-without-rewrite primitive.
- **Alternatives**: GitHub Action-only integration (simpler, but no App-level continuous
  scanning or fleet posture; Action is still offered as the runner's CI wrapper).

## R7. Corpus, precision measurement, and public benchmark

- **Decision**: `corpus/` holds labeled cases (public subset mirrored to an open repo);
  immutable tags `corpus-vN`. Corpus harness runs every rule against fixtures in CI and
  computes per-class TP/FP; a release job compares against last published numbers and blocks
  on regression (FR-019). `benchmark/` runs Gatepass CLI and incumbent scanners
  (e.g., Cisco mcp-scanner, YARA-based tools) in pinned containers against a corpus tag and
  publishes a static results page + raw JSON.
- **Rationale**: Principles I and V made executable. Pinned incumbent versions + immutable
  corpus tags = reproducible published numbers (SC-007).
- **Alternatives**: Third-party benchmark hosting (less control over cadence); private corpus
  (rejected: the public benchmark is the trust asset).

## R8. Evidence export & questionnaire drafting

- **Decision**: `packages/evidence` maintains a control map (SOC 2 CC-series, ISO 27001
  Annex A → posture checks derived from scan results); pushes evidence via Vanta/Drata
  public APIs on scan completion; questionnaire autofill ingests common formats (CSV/XLSX,
  SIG-lite subset) and drafts answers strictly from posture records with citation links —
  no posture data, no draft (FR-023).
- **Rationale**: Rides compliance platforms' ingestion motion (one-pager §3); traceability
  requirement (SC-008) satisfied by citing scan IDs in every drafted answer.
- **Alternatives**: Building compliance workflows in-product (constitution Principle VI
  forbids drifting into a compliance company).

## R9. Observability & audit

- **Decision**: OpenTelemetry traces/metrics/logs across api/workers; per-scan trace with
  stage timings (queue→clone→parse→detect→semantic→report) feeding the p95 SLOs; immutable
  audit log of every outbound write (PR comments, check runs, evidence pushes) proving
  SC-005's "zero repo mutations" claim; status page for the 99.9% availability target.
- **Rationale**: The SLOs in SC-010/SC-011 are unenforceable without stage-level timing;
  the audit log is the evidence backing our own trust claims.
- **Alternatives**: Ad-hoc logging (cannot prove SC-005; rejected).

## R10. Self-hosted runner distribution

- **Decision**: Single static binary (Node SEA) + container image; authenticates with
  org-scoped runner tokens; uploads findings/posture JSON only (runner protocol contract);
  refuses to run if its embedded ruleset version is older than the org's minimum pin.
- **Rationale**: FR-006a results-parity plus a version floor keeps fleet posture comparable
  across hosted and self-hosted scans.
- **Alternatives**: Helm-chart full platform (that's the rejected self-hosted-everything
  option from clarification Q1).
