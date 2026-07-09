# Implementation Plan: Gatepass — Precision AppSec Platform for the AI-Native Stack

**Branch**: `001-gatepass-platform` (repo not yet under git) | **Date**: 2026-07-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-gatepass-platform/spec.md`

## Summary

Build the Gatepass platform: a multi-surface security scanner (app code + agentic
infrastructure) with two-tier findings, delivered through a single analysis engine shipped
three ways — hosted scan workers, an open-source CLI, and a self-hosted runner — plus GitHub
PR remediation, a fail-open CI gate, a versioned public precision benchmark, and compliance
evidence export. Architecture centers on one deterministic engine + rule corpus so hosted and
self-hosted scans produce identical findings for the same ruleset version (FR-006a), with an
LLM-assisted semantic layer (zero-retention) for research-tier classes.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 22 LTS (platform, engine, CLI); rule fixtures
polyglot (TS/JS, Python, Go, SQL, JSON/YAML)
**Primary Dependencies**: tree-sitter (multi-language parsing), GitHub App APIs (Octokit),
Anthropic Claude API (research-tier semantic analysis, zero-retention), Next.js (dashboard),
Fastify (API), BullMQ on Redis (scan queue), Drizzle ORM
**Storage**: PostgreSQL 16 (primary data, RLS-enabled), S3-compatible object storage
(scan artifacts, encrypted, TTL-bound), Redis (queue/cache)
**Testing**: Vitest (unit/integration), corpus harness (rule fixtures + precision
measurement, runs in CI), Playwright (dashboard e2e)
**Target Platform**: Linux containers (hosted workers on AWS ECS Fargate, one isolated
container per scan); CLI/runner: macOS/Linux/Windows binaries via Node SEA or Bun compile
**Project Type**: Monorepo (pnpm + Turborepo): web + api + workers + cli + shared packages
**Performance Goals**: p95 incremental PR scan < 5 min; p95 full scan < 30 min (repos to
2M LOC / 5 GB); 50K scans/day; 99.9% scan-service availability
**Constraints**: No writes to customer repos/CI ever (write-scope-free GitHub permissions
where possible); scan workers have no outbound network except allow-listed endpoints;
self-hosted runner uploads findings/posture only; LLM calls only via Gatepass accounts with
zero-retention, per-org disable flag
**Scale/Scope**: Launch envelope — 1,000 orgs, 10,000 repos, 50,000 scans/day, fleets to 500
MCP servers (spec SC-010)

## Constitution Check

*GATE: evaluated pre-Phase 0 and re-evaluated post-Phase 1 design.
Source: `.specify/memory/constitution.md` v1.0.0*

| Gate | Principle | Pass? |
|------|-----------|-------|
| Corpus harness is a first-class package; every rule ships fixtures + measured TP/FP in CI; benchmark regression job blocks release | I. Precision Is the Product | [x] |
| Findings schema encodes tier as a closed enum; `verified` requires a non-null reproduction object at the schema level; research tier requires confidence score — enforced by contract validation | II. Two-Tier Finding Integrity | [x] |
| GitHub App requests read + PR-comment + checks scopes only (no contents:write); no code-mutation code paths exist; gate implemented as a Check Run that blocks/fail-open per FR-016a | III. Workflow Remediation | [x] |
| Single scan context ingests all five surfaces; correlation pass runs across surface graphs; engine design doc forbids per-surface silos | IV. Cross-Surface Context | [x] |
| Vulnerability classes are registry entries: definition → corpus examples → analyzer → measurement, enforced by corpus harness schema; corpus repo is versioned/tagged immutable | V. Research-Fed Corpus | [x] |
| Scope limited to scanner/remediation/benchmark/evidence-export; evidence generated only from scan posture records; no services features | VI. Pure Software / Evidence as Feature | [x] |
| Per-scan container isolation; artifact TTLs; encryption in transit/at rest; LLM zero-retention + per-org opt-out; Gatepass scans its own repos in CI | Security & Trust Constraints | [x] |

**Pre-Phase 0 result**: PASS — no violations, Complexity Tracking not required.
**Post-Phase 1 result**: PASS — design artifacts conform (findings schema enforces tier
integrity; runner protocol transmits findings only; benchmark pipeline versioned).

## Project Structure

### Documentation (this feature)

```text
specs/001-gatepass-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── findings-schema.md
│   ├── api.md
│   ├── runner-protocol.md
│   ├── github-integration.md
│   └── evidence-export.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── web/                 # Next.js dashboard (findings, fleet view, benchmark pages)
├── api/                 # Fastify API (auth, orgs, repos, scans, findings, exports)
└── workers/             # Scan orchestrator + scan executors (containerized)

packages/
├── engine/              # Analysis core: parsers, surface graphs, correlation pass
├── detectors/           # Verified-class deterministic checkers (+ reproductions)
├── semantic/            # Research-tier analyzers (LLM-assisted, confidence scoring)
├── rules-registry/      # Vulnerability-class registry (definition→fixture→analyzer link)
├── findings/            # Findings schema, tier validation, SARIF/JSON serializers
├── github/              # GitHub App integration (webhooks, PR comments, check runs)
├── evidence/            # SOC2/ISO mapping, Vanta/Drata exporters, questionnaire drafts
└── shared/              # Config, telemetry, crypto, common types

cli/                     # Open-source scanner CLI (free tier) — embeds engine+detectors
runner/                  # Self-hosted runner (Scale tier) — engine + results uploader
ide/
└── vscode/              # VS Code extension (findings annotations)

docs/                    # Product docs: CLI, runner install, disclosure policy

corpus/                  # Versioned labeled corpus + fixtures (public subset mirrored)
benchmark/               # Benchmark harness: runs Gatepass + incumbents against corpus
infra/                   # IaC (ECS, RDS, S3, Redis, queues), per-scan sandbox profiles
```

**Structure Decision**: pnpm/Turborepo monorepo. The engine and detectors are dependency-free
of platform services so the CLI and runner embed them unchanged — this is what makes
hosted/self-hosted finding parity (FR-006a) structurally true rather than aspirational.

## Complexity Tracking

No constitution violations to justify. (Section intentionally empty.)
