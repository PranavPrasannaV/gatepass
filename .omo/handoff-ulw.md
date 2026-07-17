# Gatepass — Ultrawork Handoff

> This captures remaining work requiring human intervention after the last ultrawork pass.
> For full project context, read [HANDOFF.md](../HANDOFF.md).

---

## 1. What was completed this ultrawork pass

- **ESLint config fixed** (`.next/` ignored) — lint now 0 errors, 0 warnings
- **Fixed unused variable warnings** in `page.tsx`, `pipeline.ts`, `tier-integrity.test.ts`, `gateway.test.ts`
- **Rate limiting middleware (T064) implemented** — in-memory token-bucket per org with `Retry-After` + `X-RateLimit-*` headers, 8 tests passing
- **Updated validation docs** — `validation/build-status.md` and `validation/us1.md` reflect current numbers
- **Subagent test expansion is in-flight** — reported separately

---

## 2. Open tasks requiring human intervention

Tasks are grouped by the type of intervention needed. Each traces back to `specs/001-gatepass-platform/tasks.md`.

### 2.1 Needs live infrastructure

These tasks cannot be completed without real services, credentials, or a cloud environment. They are the primary blocker for closing the gap.

| Task | What it is | Blocker |
|------|-----------|---------|
| **T077** | Wire Postgres persistence (run migrations 0001/0002, replace in-memory store) | Running Postgres 16 instance |
| **T072** | Webhook-triggered continuous + incremental scanning (push/PR events) | GitHub App with webhook endpoint |
| **T073** | PR review posting via live Octokit through audited writer | GitHub App install token |
| **T074** | CI-gate Check Run posting via live Octokit | GitHub App install token |
| **T075/T095** | LLM gateway transport — Anthropic API calls for research-tier findings | Anthropic API key |
| **T076** | GitHub OAuth sign-in + per-role RBAC enforcement across API routes | GitHub App OAuth credentials |
| **T083** | Vanta/Drata evidence push via their public APIs | Vanta/Drata sandbox + API key |
| **T086** | Encryption-at-rest/TLS IaC, artifact TTL jobs, per-scan container isolation | Cloud deploy target (ECS/RDS/S3/Redis) |
| **T089** | Full scan orchestrator (BullMQ queues, per-org concurrency, retries) | Redis for BullMQ |
| **T091** | Load validation against launch envelope (50K scans/day, 2M-LOC, 500-server fleet) | Cloud deploy + load-gen infra |
| **T092** | SLO instrumentation (stage-timing dashboards, p95 + 99.9% alerts, status page) | Observability stack (OTel collector, Grafana) |
| **T063** | SLO instrumentation in infra/observability/ | Same as T092 |
| **T065** | Scale-tier SSO/SCIM via WorkOS | WorkOS account + API key |

**Recommended order**: Postgres first (T077), then API routes can hit real data. GitHub App (T072–T074, T076) next. Anthropic key (T075/T095) after that. Everything else stacks on top.

### 2.2 Needs design or code decisions

These require someone to make a call on scope, approach, or whether they're in the product.

| Task | What it is | Decision needed |
|------|-----------|-----------------|
| **T098** | Upgrade detectors from regex/line to tree-sitter AST parsing (TS/JS, Python, Go) | Significant effort. Detectors already pass with regex. Is the precision improvement worth it now, or defer to post-launch? |
| **T078** | VS Code extension for findings annotations | New product surface. Design the annotation UX before building. |
| **T080** | Benchmark incumbent-scanner adapters (pin mcp-scanner, YARA tools) + public benchmark page | Needs pinned container versions, public page design |
| **T068** | Load validation framework (synthetic 50K scans/day, 2M-LOC, 500-server fleet) | Define test harness, success criteria, go/no-go thresholds |
| **T070** | Full quickstart re-run (Scenarios 1–7) + constitution re-verification + 15-minute onboarding walkthrough | End-to-end validation pass; needs all infra above to be live first |

### 2.3 Dashboard and compliance pages

These are UI work that may or may not be in scope for the initial launch. They consume the API that already exists.

| Task | What it is |
|------|-----------|
| **T032** | Findings detail view — tier badges, reproduction display, confidence for research tier, dispute action |
| **T041** | Repo remediation settings UI — gate mode, failure mode, agent-loop opt-in |
| **T047** | Public benchmark page — per-class table, per-tool comparison, corpus tag + raw JSON download, history |
| **T054** | Evidence & questionnaire UI — integration connect, export history, draft review flow |
| **T057** | Fleet posture dashboard — per-server results + aggregate view |
| **T039** | Agent-guidance endpoint — structured fix guidance format, 403 unless `agent_loop_enabled` |

### 2.4 Documentation

| Task | What it is |
|------|-----------|
| **T069** | README, CLI docs, runner install guide, disclosure policy page in `docs/` |

### 2.5 Partial tasks still open

These have partial implementations but need completion:

| Task | Partial | What remains |
|------|---------|-------------|
| **T066** | Artifact TTL + retention logic exists (tested) | Scheduling to a live job runner |
| **T084** | CSV + SIG-lite ingestion done | XLSX ingestion deferred (spreadsheet parser needed) |
| **T022** | exposed-secrets + unpinned-dependency done | Remaining verified detectors if any new classes added |
| **T026** | LlmGateway built (zero-retention, per-org disable, offline fallback) | Live Anthropic transport |
| **T027** | tool-poisoning heuristic pre-filter built | LLM gateway integration for remaining research classes |

---

## 3. How to continue

### Option A: Spec-Kit loop (recommended)

```
/speckit-converge    # assess code vs spec/plan/tasks, append remaining work
/speckit-implement   # execute open tasks, run tests/corpus/self-scan
```

Repeat until converge reports "Converged."

### Option B: Tackle by dependency group

1. **Infra first**: Postgres (T077) → API hits real data → Redis (T089)
2. **Integration**: GitHub App (T072–T074, T076) → webhooks → PR reviews live
3. **LLM**: Anthropic key (T075/T095) → research-tier findings use model analysis
4. **UI**: Dashboard pages (T032, T041, T047, T054, T057) once API is on real DB
5. **Compliance**: Vanta/Drata (T083) once evidence pipeline has real posture data
6. **Polish**: Load tests (T091), SLO (T092), docs (T069), full quickstart (T070)

### Verification gate (run after every change)

```bash
pnpm test && pnpm lint && pnpm format:check && pnpm corpus:measure
```

All four must pass. No exceptions. This is the Constitution's "measured precision" ethos applied to the build process itself.
