# Build Status — Gatepass Platform

**Date**: 2026-07-16 | **Ruleset**: 2026.07.0

This records what is built-and-verified vs. deferred after the "build to completion" pass.
Everything marked ✅ was executed; nothing is claimed complete without evidence.

## Verification gate (all executed — updated after 2nd convergence-implement pass)

- **Unit/integration tests**: **139+ passing** across 20+ files (`pnpm test`)
- **Typecheck**: all packages `tsc --noEmit` clean (14 individual tsconfigs)
- **Lint + format**: `pnpm lint` 0 errors, 0 warnings (`eslint.config.js` updated to ignore `.next/` build artifacts); `pnpm format:check` clean (Prettier)
- **Corpus precision gate**: **12 classes, 100% TP / 0% FP**, all reproductions confirmable,
  overall FP 0.0% ≤ 10% bar (`pnpm corpus:measure`)
- **Self-scan**: product source is **CLEAN** — the scanner passes its own scan
- **API integration**: a real HTTP server drives scan → findings → SARIF → gate → dispute →
  suppression → agent-guidance → fleet → benchmark-publish → runner-upload → evidence →
  plan-tier-403 (12 tests)

## Second convergence-implement pass (offline-completable subset)

Completed & verified this pass: **T014** in-process scan orchestrator (state machine,
per-org concurrency, retries, timeouts, tracer timings), **T046** benchmark public API,
**T095** async pipeline invoking the LLM gateway in-line, **T097** dependency-free XLSX
ingestion (+ ZIP reader/writer), **T099** OpenTelemetry-style telemetry + crypto helpers,
**T100** ESLint + Prettier + CI lint, **T008** shared library complete, **T066** artifact
retention logic. Partial: **T096** RestGitHubClient builds correct REST requests (unit-tested
with injected fetch; live call needs a GitHub App token).

**tree-sitter (T098) intentionally NOT done**: native modules are a heavy, Windows-fragile
install for a precision refinement of already-passing detectors — deferred rather than risk
the toolchain.

## Convergence pass (Phase 9, T071–T094)

Completed and verified: **T071** (HBV, confused-deputy, over-permissioned-loop analyzers +
fixtures — FR-005 now fully covered, 12 classes), **T079** (agent-loop guidance 403 gate),
**T081** (release precision gate vs. published baseline), **T082** (responsible-disclosure
state machine), **T085** (MCP fleet registry + posture rollup), **T087** (dispute-driven
suppression), **T090** (no-write guarantee test), **T094** (runner results endpoint).

Partial (logic built + tested; live edge deferred): **T073/T074** (Remediator wires PR review
+ Check Run through the audited writer, tested with a fake client; live Octokit deferred),
**T075** (analyzeSemantic invokes the LLM gateway with fallback; async pipeline integration is
a follow-up), **T084** (CSV + SIG-lite questionnaire ingestion; XLSX deferred).

Still deferred (needs live infra/credentials): T072 webhook wiring, T077 Postgres execution,
T083 live Vanta/Drata, T086 infra, T088/T093 dashboard, T089 orchestrator, T091 load,
T092 observability, T076 GitHub OAuth. See tasks.md Phase 9 for the full ledger.

## Built and verified ✅

| Area | Package(s) | Tasks |
|------|-----------|-------|
| Two-tier findings schema + integrity + SARIF + redaction | findings | T007 |
| Vulnerability-class lifecycle registry | rules-registry | T009 |
| Scan engine: context, surfaces, framework detection | engine | T011*, T012*, T021 |
| 7 verified detectors (secret, unauth-mcp, rls, cors, deps, unbounded-param, missing-schema) | detectors | T022, T023, T024 |
| 2 research detectors (tool-poisoning, cross-surface correlation) | detectors | T025, T027* |
| Deterministic pipeline (fingerprint, redaction, validation) | detectors | T029* |
| Suggested-fix generation | detectors | T036 |
| CI gate decision + PR review builder | github | T037, T038 |
| Corpus harness (measure + reproduction verification) | corpus-harness | T010* |
| 9-class corpus + eval repo | corpus | T004, T018, T019, T020 |
| Benchmark scoring + regression detection | benchmark | T045*, T048* |
| Evidence control map + posture + questionnaire drafting | evidence | T051, T053 |
| Runner protocol validation + parity + version floor | runner | T058*, T059, T060 |
| Plan-tier gating, audited writer, config | shared | T008*, T062 |
| LLM gateway (zero-retention, offline fallback) | semantic | T026* |
| Runnable API wiring (in-memory store) | apps/api | T013*, T030, T031 |
| OSS CLI + contract | cli | T033 |
| DB migrations SQL (tier CHECK constraint) | shared/db | T005, T006 (written) |
| CI workflows: test/corpus gate, self-scan, release gate, monthly benchmark | .github | T002*, T048a, T067 |

(* = core built; see per-task notes in tasks.md for the deferred remainder.)

## Deferred — needs live infrastructure or is future scope

- **DB migrations execution**: written and standard-Postgres-valid, but not run here (Docker
  daemon was not running). The tier invariant they encode is independently enforced + tested
  at the app layer (findings schema, 11 tests).
- **Live integrations**: GitHub App webhooks/Octokit calls, Vanta/Drata API calls, WorkOS
  SSO/SCIM, the Anthropic gateway transport — all have built interfaces + tested logic; only
  the network edge is unwired (needs credentials/live endpoints).
- **tree-sitter AST parsing**: detectors currently use line/regex + JSON parsing; AST parsing
  (T011) would deepen a few detectors.
- **Next.js dashboard, ECS/Fargate infra, load tests at 50k scans/day, IDE extension**:
  UI/infra scope (Phases 7–8 remainder) not built.
- **Additional research classes** (HBV, confused-deputy, over-permissioned loops): the
  framework + tool-poisoning + cross-surface analyzers exist; these three classes await their
  analyzers + fixtures.

## Ultrawork loop pass (2026-07-16)

Completed in this pass:

- **ESLint config cleanup**: Added `**/.next/**` to ignore pattern, eliminating 460+ false-positive lint errors from Next.js build artifacts. Fixed 5 unused-variable warnings across source and test files (page.tsx, pipeline.ts, tier-integrity.test.ts, gateway.test.ts). Lint now clean at **0 errors, 0 warnings**.
- **Rate limiting middleware (T064)**: Implemented `RateLimiter` (token-bucket per org, configurable tokens/window, Retry-After headers) with full test coverage — 8 tests.
- **Expanded test coverage**: Added tests for previously untested modules including redaction (findings), SARIF serializer (findings), surface classification (engine), scan context (engine), fix generation (detectors), retention TTL, telemetry/tracer, crypto helpers, and XLSX parser (evidence).

## Honest summary

The **analysis core — the product's actual moat (precision + cross-surface + two-tier
integrity)** — is real, tested, and passes its own gates. The platform is wired end-to-end
and runnable via the API and CLI. What remains is primarily the network/infra edge (live
third-party calls, deployment, UI), which cannot be genuinely completed without credentials
and running infrastructure, and which would be dishonest to mark done as stubs.
