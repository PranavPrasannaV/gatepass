# Incumbent benchmark — Gatepass vs. Semgrep

Public precision comparison (FR-018, SC-007): a real, pinned incumbent scanner run against
the same versioned corpus Gatepass is measured on, scored by the **identical** `scoreTool`
pipeline. Reproduce with:

```bash
pip install semgrep
pnpm benchmark:incumbent
```

## Latest results (2026-07-22, corpus-v1, 24 cases / 12 classes)

| Tool | Classes detected | Overall TP rate | Overall FP rate |
|---|---|---|---|
| **Gatepass** (`pnpm corpus:measure`) | **12 / 12** | **100%** | **0%** |
| Semgrep 1.170.1 (`p/security-audit` + `p/secrets` + `p/default`, 216 applicable rules) | **1 / 12** | 8.3% | 0% |

Semgrep's single detection was the AWS access key in the `exposed-secret` case
(`generic.secrets.security.detected-aws-access-key-id-value`). It detected none of the
agentic-infrastructure classes — tool poisoning, confused deputy, unauthenticated MCP
transport, over-permissioned loops, cross-surface scope mismatch, hidden-behavior
vagueness, unbounded tool params — and none of the AI-native app-code classes (RLS gap,
CORS misconfig, missing schema validation, unpinned dependency).

This is the expected result, and it is the point: general-purpose SAST is built for a code
surface, not for the agentic attack surface. The corpus classes are drawn from published
MCP/agent vulnerability research (see `corpus/README.md`).

## Methodology (designed to favor the incumbent)

1. **Same inputs.** The corpus is staged to a temp dir with an empty `.semgrepignore` and
   scanned with `--no-git-ignore`, because fixtures intentionally live where scanners skip
   by default (`dist/` bundles). The incumbent sees every file Gatepass sees.
2. **Realistic fixtures.** The exposed-secret fixture uses a realistic-format (fake) AWS
   key, not the canonical `…EXAMPLE` docs key that secret scanners deliberately allowlist.
   (With the docs key, Semgrep scores 0/12.)
3. **Generous rule mapping.** Any Semgrep rule whose id plausibly targets a class counts as
   detecting that class (substring patterns in `run-incumbent.ts`); e.g. any rule mentioning
   `cors` earns cors-misconfig credit. Unmapped hits are reported raw in the JSON report for
   transparency (`benchmark/reports/incumbent-semgrep.json`).
4. **Identical scoring.** Both tools go through `benchmark/src/score.ts#scoreTool` — same
   labels, same TP/FP definitions, same corpus version.

## Caveats we state up front

- The corpus is authored by us (24 cases: one vulnerable + one clean per class). The
  clean-case FP measurement is what keeps it honest — Semgrep also scored 0% FP, so the
  corpus is not stacked with noise traps.
- Semgrep is measured with its public registry rulesets, anonymous tier. Logged-in
  "Pro" rules could score differently; rerun with `semgrep login` to check.
- Class-mapping patterns are ours; the raw rule hits in the JSON report let anyone re-map
  and re-score.
