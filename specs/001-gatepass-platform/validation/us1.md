# US1 Validation — Scan a Repository and Get Trustworthy Findings

**Date**: 2026-07-16 | **Ruleset**: 2026.07.0 | **Scope**: MVP vertical slice

## What was built and verified

Running, tested code for the constitutional core of the scanner:

- `@gatepass/findings` — canonical schema with tier integrity enforced (verified ⇒
  reproduction, research ⇒ confidence, no third state). **11 tests pass.**
- `@gatepass/rules-registry` — vulnerability-class lifecycle (cannot activate without corpus
  + measured precision). **5 tests pass.**
- `@gatepass/engine` — scan context, file ingestion, multi-valued surface classification.
- `@gatepass/detectors` — 2 verified detectors (exposed-secret, unauth-mcp-transport) with
  reproductions + 1 research detector (tool-poisoning, confidence-scored); deterministic
  pipeline with fingerprinting, redaction linter, schema validation.
- `@gatepass/corpus-harness` — measures per-class TP/FP **and verifies every verified
  reproduction is confirmable** (the G1 fix / SC-002); doubles as the CI gate.
- `@gatepass/cli` — `gatepass scan` end-to-end.

## Evidence

**Test suite** — `pnpm test`: **139+ passing** across 20+ files (full platform).
**Typecheck** — all 14 packages `tsc --noEmit`: **clean**.

**Corpus measurement** — `pnpm corpus:measure --corpus corpus-v1`:

```
Class                      Vuln  Clean   TP   FN   FP   TP-rate  FP-rate
exposed-secret                1      1    1    0    0   100.0%    0.0%
tool-poisoning                1      1    1    0    0   100.0%    0.0%
unauth-mcp-transport          1      1    1    0    0   100.0%    0.0%
Overall FP rate: 0.0%  (target ≤ 10% — SC-001)
Corpus gate: PASS ✓
```

**Eval-repo scan** (quickstart Scenario 1) — `pnpm scan corpus/eval-repos/vulnerable-nextjs-mcp`:

- VERIFIED (2): exposed-secret (critical, Anthropic key in shipped bundle); unauth-mcp-transport
  (high) — each with a reproduction.
- RESEARCH (1): tool-poisoning (medium, 57% confidence).
- Tiers correctly separated; confidence shown only for research; **zero tier mislabels**.

**Scenario 7 (LLM disable, FR-011a)** — `--no-semantic` drops the research tier and prints the
"static-only, reduced coverage" notice.

## Honestly deferred (not yet built)

- Verified detectors for RLS/security-rule gaps, CORS, unpinned/hallucinated deps, unbounded
  tool params, missing schema validation (tasks T023–T024 remainder).
- True cross-surface correlation pass (T025) — the `isCrossSurface` helper is implemented and
  deliberately returns false until a detector emits multi-surface locations, so nothing
  overclaims.
- LLM-backed semantic analysis (T026–T027) — current tool-poisoning detector is the heuristic
  pre-filter; the Claude gateway is not wired.
- Platform services (API, DB, workers, dashboard), remediation, benchmark publishing, evidence
  export, fleet, runner — Phases 4–8.

The slice that exists is real, runnable, and passes its own gates. Nothing here is stubbed to
look complete.
