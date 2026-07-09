# Gatepass — Agent Context

Precision AppSec platform for the AI-native stack: scans AI-generated app code and agentic
infrastructure (MCP servers, tool definitions, permission scopes) with two-tier findings,
developer-workflow remediation, a public precision benchmark, and compliance evidence export.

## Governance

- **Constitution**: `.specify/memory/constitution.md` (v1.0.0) — six principles are
  non-negotiable: precision measured & published; verified findings require reproductions;
  never write to customer code/CI; cross-surface analysis; research-fed versioned corpus;
  pure software (no services tier). Read it before designing anything.
- **Active feature**: `specs/001-gatepass-platform/` (spec.md → plan.md → research.md,
  data-model.md, contracts/, quickstart.md). `.specify/feature.json` points here.

## Stack (decided in plan phase — see specs/001-gatepass-platform/research.md)

- TypeScript 5.x / Node 22, pnpm + Turborepo monorepo
- Analysis engine: tree-sitter parsing (TS/JS, Python, Go, SQL) + config parsers;
  `packages/engine` + `packages/detectors` are pure libraries embedded identically by hosted
  workers, OSS CLI, and self-hosted runner (finding parity is by construction)
- Research-tier semantic analysis: Anthropic Claude via Gatepass gateway, zero-retention,
  per-org disable flag
- Platform: Fastify API, Next.js dashboard, PostgreSQL 16 (Drizzle, org RLS), Redis/BullMQ,
  S3 artifacts with TTL; per-scan container isolation (ECS Fargate)
- GitHub App: contents:read, pull_requests:write, checks:write — never contents:write
- Corpus in `corpus/` with immutable tags; benchmark harness in `benchmark/`

## Hard rules for code in this repo

1. Findings tier is a closed enum; `verified` ⇒ reproduction present (DB CHECK + schema
   validation in `packages/findings`). Never bypass.
2. No code path may write to customer repositories or CI config. All outbound writes go
   through the audited writer (AuditEvent).
3. Every rule/analyzer change ships corpus fixtures + precision measurement or it does not
   merge.
4. CI gate fails open by default (neutral check + annotation); fail-closed is per-repo
   opt-in.
5. Runner uploads findings/posture JSON only — the schema must never grow a field that can
   carry source code.
