# Incumbent benchmark — Gatepass vs. the field

Public precision comparison (FR-018, SC-007): real, pinned incumbent scanners run against
the same versioned corpus Gatepass is measured on, scored by the **identical** `scoreTool`
pipeline. Reproduce with:

```bash
pip install semgrep && winget install Gitleaks.Gitleaks AquaSecurity.Trivy
pnpm benchmark:incumbent
```

## Latest results (2026-07-22, corpus-v1, 24 cases / 12 classes)

| Tool | Classes detected | Overall TP rate | Overall FP rate |
|---|---|---|---|
| **Gatepass** (`pnpm corpus:measure`) | **12 / 12** | **100%** | **0%** |
| Semgrep 1.170.1 (`p/security-audit` + `p/secrets` + `p/default`, 216 applicable rules) | **1 / 12** | 8.3% | 0% |
| Gitleaks 8.30.1 | **1 / 12** | 8.3% | 0% |
| Trivy 0.72.0 (`secret` + `misconfig` scanners) | **0 / 12** | 0% | 0% |
| Snyk Agent Scan 0.4.3 (née Invariant `mcp-scan`) | n/a — cannot scan source trees (see below) | — | — |

Semgrep's and Gitleaks' single detection was the AWS access key in the `exposed-secret`
case. No incumbent detected any agentic-infrastructure class — tool poisoning, confused
deputy, unauthenticated MCP transport, over-permissioned loops, cross-surface scope
mismatch, hidden-behavior vagueness, unbounded tool params — nor any of the AI-native
app-code classes (RLS gap, CORS misconfig, missing schema validation, unpinned dependency).

**The MCP-specific incumbent cannot participate at all**: Snyk Agent Scan (Invariant Labs'
`mcp-scan`, acquired by Snyk) scans *live MCP client configs and running servers* — its own
CLI usage is "Scan one or more MCP config files". Pointed at a repository's source tree
(including a raw MCP tool-definition file), it produces nothing. It is a runtime/deploy-time
guard; it cannot gate a pull request before the code ships. That pre-merge gap is the
category Gatepass occupies.

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
