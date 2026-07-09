<!--
Sync Impact Report
==================
- Version change: (none) → 1.0.0 (initial ratification)
- Modified principles: none (initial document)
- Added sections: Core Principles (I–VI), Security & Trust Constraints,
  Development Workflow & Quality Gates, Governance
- Removed sections: none
- Templates:
  - ✅ .specify/templates/plan-template.md (created; Constitution Check gates map to Principles I–VI)
  - ✅ .specify/templates/spec-template.md (created; success criteria require measurable precision
    targets where findings are involved)
  - ✅ .specify/templates/tasks-template.md (created; task types include rule-corpus fixtures and
    benchmark regression tasks per Principles I, II, V)
- Follow-up TODOs: none
- Source: GATEPASS_ONEPAGER_V4.md (product one-pager, v4 synthesis)
-->

# Gatepass Constitution

Gatepass is the precision application-security platform for the AI-native stack: it scans
AI-generated application code and agentic infrastructure (MCP servers, tool definitions,
permission scopes, autonomous loops) together, and delivers fixes inside the developer's own
workflow. This constitution encodes the non-negotiable rules that every feature, rule, and
release MUST satisfy.

## Core Principles

### I. Precision Is the Product

Measured precision is the brand and the moat. The reference tools in this category run at a
~78% false-positive rate; Gatepass exists to beat that bar publicly and continuously.

- Every detection rule MUST have a measured true-positive/false-positive rate against a
  versioned test corpus before it ships to any default ruleset.
- The public precision benchmark (Gatepass vs. incumbent scanners on an open, versioned corpus
  of MCP servers) MUST be kept current; a release that would regress published precision
  numbers MUST NOT ship until the regression is fixed or the affected rules are demoted.
- Precision claims in product, marketing, and docs MUST cite the benchmark; unmeasured claims
  are forbidden.

Rationale: in a field crowded with noise machines, trust is won by publishing numbers others
won't. One inflated claim destroys the asset.

### II. Two-Tier Finding Integrity

Findings are honestly separated into two tiers, and the boundary is never blurred.

- **Verified findings** MUST be deterministically checkable and MUST ship with a concrete
  reproduction (exposed secrets, RLS/security-rule gaps, CORS misconfigurations,
  unpinned/hallucinated dependencies, unauthenticated MCP transports, unbounded tool
  parameters, missing schema validation). No reproduction, no "verified" label.
- **Research-tier findings** (tool poisoning, hallucination-based vulnerabilities,
  confused-deputy chains, over-permissioned loops) MUST carry a confidence score and a
  plain-language explanation, and MUST NOT be presented with verified-tier certainty.
- Tier assignment is a property of the check, not of severity or sales pressure; promoting a
  research-tier class to verified requires a deterministic checker plus corpus evidence.

Rationale: the tier separation is the product's honesty contract with developers; inflating
confidence converts Gatepass into the noise it was built to replace.

### III. Remediation in the Developer's Workflow — Never Behind Their Back

Gatepass suggests; humans approve.

- Remediation MUST arrive where developers already work: PR comments with suggested diffs, IDE
  annotations, or opt-in structured fix guidance fed to the developer's own coding agent.
- Gatepass MUST NOT silently mutate code, CI configuration, or repositories. No unsolicited PR
  floods.
- A CI gate MAY block a merge; it MUST NOT rewrite code.
- Agent-loop fix guidance is strictly opt-in and pre-commit, inside the developer's own loop,
  with a human reviewing final output.

Rationale: developer trust is the distribution channel; a tool that edits behind your back is
uninstalled, not renewed.

### IV. Cross-Surface Context

The differentiated findings only exist when surfaces are analyzed together.

- The analysis engine MUST support correlating application code, agent code, MCP server
  implementations, tool definitions, and permission scopes in a single scan context (e.g., a
  scoped-looking tool backed by an unscoped database client).
- Analysis MUST be framework-aware for the supported AI-native stack (Next.js, Supabase,
  Firebase, FastAPI, Go) rather than generic pattern matching.
- New scanners or rule packs MUST declare which surfaces they read and MUST NOT be designed in
  a way that forecloses cross-surface correlation.

Rationale: single-surface tools structurally cannot see these findings; cross-surface context
is an architectural moat only if the architecture preserves it.

### V. Research-Fed Corpus

The agentic vulnerability taxonomy is ~12 months old and still being written; the moat is
discovering and operationalizing classes first.

- Internal security research exists to grow the rule corpus and the benchmark — it is a
  first-class engineering activity, not a side project, and MUST NOT be sold as services.
- Every new vulnerability class MUST enter the system as: (1) a written class definition,
  (2) corpus examples (real or constructed), (3) a rule or analyzer, (4) measured precision —
  in that order.
- The benchmark corpus MUST be versioned; rule changes MUST be traceable to corpus versions.
- Outcome data (which findings enterprise security reviews actually probe) SHOULD feed ruleset
  priority and the questionnaire product.

Rationale: rules are commodity only when vulnerability classes are settled; sustained research
is what generic rule-writers don't do.

### VI. Pure Software; Evidence Is a Feature, Not the Company

- The business model is pure software (Free / Team / Scale tiers); a services tier MUST NOT be
  introduced.
- Compliance capability is limited to exporting scan posture as SOC 2/ISO-mapped evidence into
  platforms like Vanta/Drata via API and auto-drafting security-questionnaire answers; Gatepass
  MUST NOT position or build itself as a compliance platform.
- Evidence exports MUST derive from actual scan posture — never hand-authored attestations.
- Expansion rulesets (platform reviews, IP provenance) remain future options on the same
  engine; they MUST NOT dilute the core scanner-precision roadmap.

Rationale: focus is survival at seed stage; the compliance platforms ingest scanners and
should remain partners (or acquirers), not competitors.

## Security & Trust Constraints

Gatepass handles customers' most sensitive asset: their source code and agent configurations.

- Customer code and scan artifacts MUST be processed with least privilege, encrypted in
  transit and at rest, and MUST NOT be retained beyond what the scan and its evidence exports
  require.
- Customer code MUST NOT be used to train models or enrich the public corpus without explicit
  opt-in consent.
- The scanner MUST pass its own scan: Gatepass's own repositories, MCP servers, and agent
  loops are scanned with the production ruleset, and critical findings block release.
- Public server-scan reports MUST follow responsible disclosure norms; findings on third-party
  servers are disclosed to maintainers before publication.

## Development Workflow & Quality Gates

- Every rule/analyzer change MUST include corpus fixtures (positive and negative cases) and a
  precision measurement in CI; a rule without fixtures MUST NOT merge.
- Benchmark regression checks run in CI; published-precision regressions are release blockers
  (Principle I).
- Every feature spec MUST state which finding tier(s) it touches and which surfaces it reads
  (Principles II, IV); plans MUST pass the Constitution Check gates in
  `.specify/templates/plan-template.md` before implementation.
- Remediation features MUST document their approval flow (who sees, who approves, what is
  written where) before implementation (Principle III).
- Simplicity default: prefer the smallest design that satisfies the spec; added complexity
  MUST be justified in the plan's Complexity Tracking section.

## Governance

- **Authority**: This constitution supersedes all other development practices in this
  repository. Where a template, plan, or habit conflicts with it, the constitution wins.
- **Amendments**: Amendments are made by editing this file in a dedicated change (PR or
  equivalent) that includes: the rationale, the Sync Impact Report comment updated at the top
  of the file, and propagation of any affected guidance in `.specify/templates/*`.
- **Versioning**: Semantic versioning of the constitution —
  - MAJOR: principle removals or redefinitions that are backward-incompatible;
  - MINOR: new principle or section, or materially expanded guidance;
  - PATCH: clarifications and wording fixes with no semantic change.
- **Compliance review**: Every `/speckit-plan` run MUST evaluate the Constitution Check gates
  against Principles I–VI; violations require either redesign or an explicit, written
  justification in the plan's Complexity Tracking table. Reviews of merged work SHOULD verify
  runtime behavior matches the declared finding tiers and approval flows.

**Version**: 1.0.0 | **Ratified**: 2026-07-09 | **Last Amended**: 2026-07-09
