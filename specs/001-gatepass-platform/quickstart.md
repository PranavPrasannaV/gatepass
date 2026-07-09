# Quickstart: Validating the Gatepass Platform

Runnable end-to-end scenarios proving the feature works. Details live in
[data-model.md](data-model.md) and [contracts/](contracts/) — this is the validation guide.

## Prerequisites

- Node 22 + pnpm; Docker (Postgres 16, Redis via `docker compose up -d`)
- `pnpm install && pnpm db:migrate && pnpm dev` (api + web + worker)
- A GitHub test org with the Gatepass App (dev credentials) installed
- Seeded evaluation repo: `corpus/eval-repos/vulnerable-nextjs-mcp` — contains planted
  issues: exposed secret, missing RLS, unauthenticated MCP transport, unbounded tool
  parameter (verified classes) + poisoned tool description, over-permissioned loop
  (research classes) + one cross-surface case (scoped tool / unscoped DB client)

## Scenario 1 — Two-tier scan (US1 / SC-003)

```bash
pnpm cli scan corpus/eval-repos/vulnerable-nextjs-mcp --output findings.json
```

**Expect**: every planted verified-class issue reported with `tier=verified` and a
non-null `reproduction`; research-class issues with `tier=research` + `confidence`;
the cross-surface finding lists both surfaces; zero tier mislabels; redaction linter
passes (no secret values in output).

## Scenario 2 — PR remediation + gate (US2)

1. Open a PR against the connected test repo introducing an exposed secret.
2. **Expect**: one review with a finding comment + ```suggestion``` diff; repo untouched by
   Gatepass (verify via AuditEvent log — no write actions besides comment/check).
3. With `gate_mode=block_verified`: check run concludes **failure**, merge blocked.
4. Stop the worker mid-scan (simulate outage), re-trigger:
   **Expect** check concludes **neutral** with "scan unavailable" (fail-open default);
   set `gate_failure_mode=fail_closed`, repeat → **failure** (FR-016a).

## Scenario 3 — Hosted/runner parity (FR-006a)

```bash
pnpm runner scan corpus/eval-repos/vulnerable-nextjs-mcp --token $RUNNER_TOKEN
```

**Expect**: findings fingerprints byte-identical to Scenario 1 for the same ruleset
version; results upload passes schema validation; an upload payload containing file
contents is rejected (runner-protocol guarantee 1).

## Scenario 4 — Corpus precision + benchmark reproducibility (US3 / SC-007)

```bash
pnpm corpus measure --corpus corpus-v1        # per-class TP/FP for all rules
pnpm benchmark run --corpus corpus-v1         # gatepass + pinned incumbents
pnpm benchmark run --corpus corpus-v1         # second run
```

**Expect**: measurement fails CI if any rule lacks fixtures; two benchmark runs on the same
tag produce identical numbers; a deliberately regressed rule (test fixture) blocks the
release job.

## Scenario 5 — Evidence export + questionnaire (US4 / SC-008)

1. Connect Vanta sandbox; complete a scan.
   **Expect**: mapped evidence items appear in sandbox, each citing `scan_id`.
2. `POST /orgs/:org/questionnaires` with the sample SIG-lite CSV.
   **Expect**: agent-security questions drafted with posture citations; unanswerable
   questions flagged `needs_human_input`, never guessed; export blocked until
   `review_status=reviewed`.
3. Delete scan data, retry export → `409 no_posture_data` (FR-023).

## Scenario 6 — Fleet (US5 / SC-009)

Register 3 sample MCP servers (2 vulnerable, 1 clean) via `POST /fleet/servers`.
**Expect**: per-server results + aggregated posture; change one server's `config_hash`
→ automatic rescan; fleet view updates.

## Scenario 7 — LLM boundary (FR-011a)

Set `llm_analysis_enabled=false` for the org; rerun Scenario 1 hosted.
**Expect**: research-tier results carry a "static-only, reduced coverage" notice; gateway
logs show zero LLM calls for that org.
