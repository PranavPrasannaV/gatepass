# Build Status — Gatepass Platform

**Date**: 2026-07-09 | **Ruleset**: 2026.07.0

This records what is built-and-verified vs. deferred after the "build to completion" pass.
Everything marked ✅ was executed; nothing is claimed complete without evidence.

## Verification gate (all executed)

- **Unit/integration tests**: **77 passing** across 11 files (`pnpm test`)
- **Typecheck**: all 12 packages `tsc --noEmit` clean
- **Corpus precision gate**: **9 classes, 100% TP / 0% FP**, all reproductions confirmable,
  overall FP 0.0% ≤ 10% bar (`pnpm corpus:measure`)
- **Self-scan**: product source is **CLEAN** — the scanner passes its own scan
- **API integration**: a real HTTP server drives scan → findings → SARIF → gate → dispute →
  evidence → plan-tier-403 (6 tests)

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

## Honest summary

The **analysis core — the product's actual moat (precision + cross-surface + two-tier
integrity)** — is real, tested, and passes its own gates. The platform is wired end-to-end
and runnable via the API and CLI. What remains is primarily the network/infra edge (live
third-party calls, deployment, UI), which cannot be genuinely completed without credentials
and running infrastructure, and which would be dishonest to mark done as stubs.
