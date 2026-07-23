# Gatepass Competitive Benchmark

Ran Gatepass against every category of competitor we can execute locally, scored through the
**identical** pipeline (`benchmark/src/score.ts`) on the same labeled corpus. This is the
honest picture — including the one result that complicates our story, because pretending
otherwise would not survive a YC technical diligence call.

Date: 2026-07-23 · Corpus: `corpus-v1` (24 cases, 12 vulnerability classes, one vulnerable +
one clean fixture per class).

## TL;DR

| Tool | Category | Classes detected | Recall | Per-class FP rate | Notes |
|---|---|---|---|---|---|
| **Gatepass** | AI-native AppSec (ours) | **12 / 12** | **100%** | **0%** | Deterministic; every verified finding carries a machine-checked reproduction |
| **Claude (blind LLM scanner)** | Frontier LLM baseline | **12 / 12** | 100% | 0% | **2 cross-class misattributions** (see below); non-deterministic; taxonomy was provided |
| Semgrep 1.170.1 | General SAST (216 sec. rules) | 1 / 12 | 8.3% | 0% | Only the AWS key |
| Gitleaks 8.30.1 | Secret scanner | 1 / 12 | 8.3% | 0% | Only the AWS key |
| Trivy 0.72.0 | Secret + IaC misconfig | 0 / 12 | 0% | 0% | Nothing |
| Snyk Agent Scan 0.4.3 (`mcp-scan`) | MCP-specific | n/a | — | — | Cannot scan source trees — runtime config scanner only |

Reproduce the CLI tools: `pip install semgrep && winget install Gitleaks.Gitleaks AquaSecurity.Trivy && pnpm benchmark:incumbent`.
The Claude run is a captured point-in-time measurement (LLMs are non-deterministic), documented below.

## The result that matters most: Claude ties us on detection here

A frontier LLM (Claude), handed the 12-class taxonomy and pointed at each stripped-down
sample, detected **all 12 classes with 100% recall and no per-class false positives** — the
same top-line as Gatepass on this corpus. We are **not** going to claim "we find things LLMs
can't." On clean, textbook fixtures with the answer categories provided, a good LLM finds
them too. Anyone technical will confirm this in five minutes, so our story cannot depend on
denying it.

**What separates Gatepass is not detection on toy inputs. It is four things an LLM cannot
give you**, each of which this same benchmark already hints at:

1. **Determinism.** Gatepass returns byte-identical findings every run. Claude does not — its
   output varies with temperature, context, and model version. **You cannot gate a pull
   request, or publish a reproducible precision number, on a coin flip.** The entire
   `pnpm corpus:measure` gate and the public benchmark exist *because* results are
   deterministic. An LLM scanner has no stable number to publish.

2. **Machine-verified evidence.** Gatepass's `verified` tier requires a reproduction whose
   cited file and line are confirmed to exist in the scanned tree (`corpus/harness/measure.ts`
   fails the run otherwise). Claude asserts; it does not prove. At scale, "the model said so"
   is not an artifact a security team or auditor accepts.

3. **The cross-class noise is already visible.** Even on this trivial corpus, Claude produced
   **2 misattributions**: it flagged `unbounded-tool-param` on a `hbv` case (extra, wrong
   class) and flagged `unbounded-tool-param` on a **clean** tool-description case (a real
   false positive that our per-class scoring doesn't even penalize, because that class has
   its own separate fixtures). On 24 hand-built samples that is small. On a million-line
   monorepo, attribution drift and spurious flags are exactly where LLM scanners drown teams
   in noise — and precision is the whole product.

4. **Cost and latency at CI scale.** The Claude run cost ~110K tokens across three agents,
   ~75s each, for **24 tiny files**. Gatepass scans the same set in milliseconds, for free,
   deterministically. Per-PR, per-repo, on every push, the LLM approach is cost- and
   latency-prohibitive; the deterministic engine is not.

**Honest framing for the deck:** our moat versus *incumbent scanners* is raw detection (they
find 0–1 of 12; we find 12). Our moat versus a *raw frontier LLM* is determinism,
reproducible evidence, precision on real noisy code, and zero marginal cost per scan — the
things that make it a **product you can gate CI on**, not a smart answer you have to re-check.

## Methodology

**Corpus.** `corpus-v1`: 24 cases across 12 classes (app-code: exposed-secret, cors-misconfig,
unpinned-dependency, missing-schema-validation, rls-gap; MCP/agent: unauth-mcp-transport,
unbounded-tool-param, tool-poisoning, confused-deputy, hbv, over-permissioned-loop,
cross-surface-scope-mismatch). Each class has one vulnerable and one clean fixture. It is our
corpus, authored from published MCP/agent vulnerability research — a stated limitation.

**Identical scoring.** Every tool goes through `scoreTool`: for a vulnerable case of class X,
a true positive requires flagging X; for a clean case of class X, flagging X is a false
positive. Same TP/FP/FN definitions for all tools.

**CLI incumbents.** Corpus staged to a temp dir with ignores disabled (fixtures live in
`dist/`, which scanners skip by default), scanned once, SARIF rule-ids mapped generously onto
our classes (any plausibly-matching rule counts). See `benchmark/INCUMBENT.md`.

**Claude blind protocol (this run).** Each case's `tree/` was copied to an opaque
`sample-NN/` directory (labels and `case.json` removed), MD5-ordered so vulnerable and clean
samples interleave with no positional hint. Three independent Claude agents — with no
knowledge of Gatepass, the answer key, or which samples were vulnerable — were each given the
12-class taxonomy and a batch of 8 samples, and asked to act as a scanner and list which
classes (if any) each sample exhibits, explicitly told that some samples are clean. Results
were scored against the private manifest. This measures "what if you just pointed an LLM at
it," which is the real alternative a buyer weighs.

## Per-class detail (detection: ✓ = at least one true positive)

| Class | Gatepass | Claude | Semgrep | Gitleaks | Trivy |
|---|:--:|:--:|:--:|:--:|:--:|
| exposed-secret | ✓ | ✓ | ✓ | ✓ | — |
| cors-misconfig | ✓ | ✓ | — | — | — |
| unpinned-dependency | ✓ | ✓ | — | — | — |
| missing-schema-validation | ✓ | ✓ | — | — | — |
| rls-gap | ✓ | ✓ | — | — | — |
| unauth-mcp-transport | ✓ | ✓ | — | — | — |
| unbounded-tool-param | ✓ | ✓ | — | — | — |
| tool-poisoning | ✓ | ✓ | — | — | — |
| confused-deputy | ✓ | ✓ | — | — | — |
| hbv | ✓ | ✓ | — | — | — |
| over-permissioned-loop | ✓ | ✓ | — | — | — |
| cross-surface-scope-mismatch | ✓ | ✓ | — | — | — |
| **Total** | **12/12** | **12/12** | **1/12** | **1/12** | **0/12** |

Gatepass and Claude both cleared every class; Claude added 2 spurious cross-class flags that
Gatepass did not. The three production SAST/secret tools detect only the hardcoded key, and
none of the eight agentic-infrastructure classes.

## Threats to validity (stated plainly)

- **Our corpus, our taxonomy.** We wrote the fixtures and we handed Claude the exact class
  list. Both favor high scores. A fair follow-up is a large third-party repo where neither
  holds — we did a partial version of this (Gatepass found real issues in
  `modelcontextprotocol/servers` and `nextjs/saas-starter`); we have not yet run the LLM
  baseline at that scale, where its recall and false-positive profile would be the real test.
- **Fixtures are unambiguous by construction.** Difficulty here is a lower bound. Real code is
  noisier, larger, and adversarial.
- **Claude numbers are non-reproducible.** Re-running may differ. That non-reproducibility is
  itself one of the core reasons an LLM cannot be the CI gate.
- **Generous incumbent mapping.** We credited incumbents for any plausibly-matching rule; the
  raw rule hits are preserved in `benchmark/reports/incumbents.json`.

## Bottom line

Against the tools a company would actually buy today (Semgrep, Gitleaks, Trivy, Snyk's MCP
scanner), Gatepass is in a different category on the AI-native attack surface: 12/12 vs 0–1/12.
Against the "just use an LLM" alternative, Gatepass matches detection on easy inputs and wins
on the axes that make it a shippable CI gate — determinism, verifiable evidence, precision at
scale, and zero per-scan cost. That is the defensible position, and it is the true one.
