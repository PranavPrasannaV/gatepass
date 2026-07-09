# Feature Specification: Gatepass — Precision AppSec Platform for the AI-Native Stack

**Feature Branch**: `001-gatepass-platform`
**Created**: 2026-07-09
**Status**: Draft
**Input**: User description: "Gatepass product one-pager (v4 synthesis) — the precision AppSec
platform for the AI-native stack: a scanner for AI-generated application code and agentic
infrastructure (MCP servers, tool definitions, permission scopes) with two-tier findings
(verified with reproductions, research-tier confidence-scored), developer-workflow remediation
(PR comments with suggested diffs, IDE annotations, opt-in coding-agent fix guidance, CI gate
that blocks but never rewrites), a public precision benchmark, and compliance evidence export
(Vanta/Drata, questionnaire autofill)."

## Clarifications

### Session 2026-07-09

- Q: Where does the scanner execute — does customer source code ever leave customer
  infrastructure? → A: Hybrid — Gatepass-hosted cloud scanning by default; a self-hosted /
  in-CI scan runner at Scale tier keeps code inside customer infrastructure and uploads only
  findings and posture data.
- Q: How is research-tier semantic analysis performed — is customer code/config ever sent to
  an LLM? → A: LLM-assisted semantic analysis via Gatepass-controlled model accounts under
  zero-data-retention agreements; disclosed, and disable-able per organization (static-only
  fallback with reduced research-tier coverage).
- Q: When a scan can't complete (outage/timeout) on a CI-gated PR, what happens? → A:
  Fail-open by default — merge allowed with a visible "scan unavailable" annotation; per-repo
  opt-in to fail-closed. Scan-service availability target: 99.9%.
- Q: What scale/performance envelope should launch be designed and tested against? → A:
  Growth envelope — 1,000 orgs; 10,000 connected repos; 50,000 scans/day; repos up to
  2M LOC / 5 GB; MCP fleets up to 500 servers; p95 incremental PR scan < 5 minutes; p95 full
  scan < 30 minutes.
- Q: What identity and access-control model does the platform use? → A: Sign in with GitHub
  at launch; org-level roles (admin / member / viewer); repository visibility mirrors GitHub
  permissions; SAML SSO + SCIM provisioning at Scale tier.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan a Repository and Get Trustworthy Findings (Priority: P1)

A developer at an AI-native startup connects a repository (majority AI-written code, one or
more MCP servers in it) and runs a scan. The scan analyzes application code, agent code, MCP
server implementations, tool definitions, and permission scopes together, and returns findings
separated into two honestly labeled tiers: **verified** findings, each with a concrete
reproduction the developer can run or inspect, and **research-tier** findings, each with a
confidence score and a plain-language explanation of the suspected agentic vulnerability
class.

**Why this priority**: This is the product. Without a scan that produces trustworthy,
tier-separated findings, no other capability (remediation, benchmark, evidence) has anything
to stand on.

**Independent Test**: Point the scanner at a deliberately vulnerable sample repository
containing known issues on both surfaces (e.g., an exposed secret, a missing tenant-isolation
rule, an unauthenticated MCP transport, and a poisoned tool description) and verify every
seeded verified-class issue is reported with a working reproduction and every seeded
research-class issue is reported with a confidence score — with zero tier mislabeling.

**Acceptance Scenarios**:

1. **Given** a repository containing an exposed secret in a build artifact, **When** the scan
   completes, **Then** the finding appears in the *verified* tier with a concrete reproduction
   showing where the secret is exposed and how to confirm it.
2. **Given** a repository containing an MCP server whose tool description embeds instructions
   that would redirect model behavior (tool poisoning), **When** the scan completes, **Then**
   the finding appears in the *research* tier with a confidence score and an explanation —
   never presented as deterministically confirmed.
3. **Given** a repository with a tool definition that looks narrowly scoped but is backed by
   an unscoped database client, **When** app code and agent config are scanned together,
   **Then** a cross-surface finding is produced that neither surface alone would have raised.
4. **Given** a scan of a repository using a supported framework (Next.js, Supabase, Firebase,
   FastAPI, Go), **When** framework-specific checks apply (e.g., RLS/security-rule gaps),
   **Then** findings reference the framework context rather than generic pattern matches.
5. **Given** a clean repository with no seeded issues, **When** the scan completes, **Then**
   the report contains no verified findings and any research-tier findings meet the published
   confidence threshold.

---

### User Story 2 - Fix Findings in the Developer's Own Workflow (Priority: P2)

A developer receives findings where they already work: as comments on their pull request with
suggested diffs they can approve, as annotations in their editor, and — strictly opt-in — as
structured fix guidance handed to their own coding agent (e.g., Claude Code, Cursor) so the
agent proposes a correction and the human reviews the final output. The team can also enable a
CI gate that blocks a merge when findings exceed a chosen threshold. Gatepass never edits code
or CI configuration on its own.

**Why this priority**: Findings without a fix path don't change security posture. The
remediation experience — suggest, never rewrite — is the trust contract that differentiates
the product.

**Independent Test**: Open a pull request into a connected repository that introduces a
verified-class issue; confirm a PR comment appears with a suggested diff, that nothing in the
repository was modified by Gatepass, that the CI gate (when enabled) blocks the merge, and
that approving the suggestion is a human action in the developer's own tooling.

**Acceptance Scenarios**:

1. **Given** a pull request that introduces a verified finding, **When** the scan completes,
   **Then** a PR comment appears containing the finding, its reproduction, and a suggested
   diff — and the branch's code remains untouched by Gatepass.
2. **Given** a team with the CI gate enabled at "block on verified findings", **When** a PR
   containing a verified finding is submitted, **Then** the merge is blocked with a clear
   explanation, and **no** code or CI configuration is rewritten.
3. **Given** a developer who has enabled agent-loop integration, **When** a finding is
   detected pre-commit, **Then** structured fix guidance is made available to the developer's
   coding agent inside the developer's own loop, and the correction is only applied after
   human review.
4. **Given** a developer who has NOT opted into agent-loop integration, **When** findings are
   detected, **Then** no fix guidance is sent to any coding agent.
5. **Given** a scan that produces many findings on one PR, **When** remediation is delivered,
   **Then** findings arrive as review feedback on that PR — never as a flood of unsolicited
   pull requests.

---

### User Story 3 - Trust the Tool via the Public Precision Benchmark (Priority: P3)

A security-conscious buyer evaluating Gatepass visits the public benchmark: continuously
published true-positive/false-positive rates for Gatepass and the incumbent agent scanners,
measured against a versioned open corpus of MCP servers. Anyone can inspect the corpus
version, the per-class results, and how the numbers have moved over time.

**Why this priority**: Measured precision is the brand. In a field where the reference tools
run at ~78% false positives, the benchmark is the trust asset that converts skeptics — but it
requires the scanner (US1) to exist first.

**Independent Test**: Publish a benchmark run against a tagged corpus version; verify the
published page shows Gatepass and at least one incumbent scanner's TP/FP rates per
vulnerability class, that the corpus version is identified and retrievable, and that re-running
the benchmark on the same corpus version reproduces the published numbers.

**Acceptance Scenarios**:

1. **Given** a tagged version of the open corpus, **When** a benchmark run completes, **Then**
   published results show true-positive and false-positive rates per vulnerability class for
   Gatepass and the compared incumbent tools.
2. **Given** a proposed release whose measured precision on the corpus is worse than the
   currently published numbers, **When** the release is evaluated, **Then** it is blocked
   until the regression is fixed or the affected rules are demoted out of the default ruleset.
3. **Given** a public server-scan report on a third-party MCP server, **When** the report
   contains findings, **Then** maintainers were notified before publication (responsible
   disclosure).

---

### User Story 4 - Export Compliance Evidence and Draft Questionnaire Answers (Priority: P4)

A founder facing an enterprise security review connects Gatepass to their compliance platform
(Vanta or Drata). Scan posture flows in as SOC 2/ISO-mapped evidence automatically. When an
enterprise prospect sends a security questionnaire with an AI-agent-security section, Gatepass
auto-drafts the answers from actual scan posture, and the founder reviews and sends them.

**Why this priority**: This monetizes the deal-unblocking moment and rides the compliance
platforms' existing motion — but it is derivative of real scan posture, so it depends on US1.

**Independent Test**: Connect a sandbox compliance-platform account, run a scan, and verify
mapped evidence items appear in the compliance platform; feed in a sample questionnaire and
verify drafted answers cite actual scan results, with every answer traceable to posture data.

**Acceptance Scenarios**:

1. **Given** a connected Vanta or Drata account, **When** a scan completes, **Then**
   SOC 2/ISO-mapped evidence derived from that scan's posture appears in the compliance
   platform without manual steps.
2. **Given** a security questionnaire containing agent-security questions, **When** the
   auto-draft runs, **Then** each drafted answer is derived from actual scan posture and is
   presented for human review before any external use.
3. **Given** no scan data exists for a repository, **When** evidence export is attempted,
   **Then** no evidence is fabricated — the export reports the absence of posture data.

---

### User Story 5 - Scan an Internal MCP Fleet Before Production (Priority: P5)

A platform team at a larger company adopting MCP registers their internal MCP servers as a
fleet. Every server is scanned before it is allowed to touch production data, the team sees a
fleet-wide posture view, and newly registered or changed servers are scanned continuously.

**Why this priority**: This is the second buyer (platform/infra teams) and the Scale-tier
expansion motion; it reuses the US1 scanner across many servers with fleet-level reporting.

**Independent Test**: Register a fleet of sample MCP servers (some vulnerable, some clean),
verify each receives an individual scan report, that the fleet view aggregates posture
correctly, and that a change to one server triggers a rescan of that server.

**Acceptance Scenarios**:

1. **Given** a registered fleet of internal MCP servers, **When** scanning completes, **Then**
   the team sees per-server results and an aggregated fleet posture view.
2. **Given** a server in the fleet that changes (new version or config), **When** the change
   is detected, **Then** that server is rescanned and the fleet view updates.

---

### Edge Cases

- **Unsupported framework**: A repository outside the supported framework set still receives
  surface-level and agentic checks; framework-specific checks are reported as "not applicable"
  rather than silently skipped.
- **Low-confidence research findings**: Research-tier findings below the display threshold are
  suppressed from default reports (available on request), never promoted to fill space.
- **Disputed finding**: A user marks a finding as a false positive; the dispute is recorded,
  feeds precision measurement, and suppresses recurrence on unchanged code — without deleting
  the audit trail.
- **Monorepo**: Multiple apps/servers in one repository are each attributed correctly;
  cross-surface correlation still works within the repo boundary.
- **Secrets in scan artifacts**: A reproduction for an exposed-secret finding must redact the
  secret value itself while remaining verifiable.
- **Benchmark gaming risk**: Corpus versions are immutable once tagged; results always name
  the corpus version so numbers cannot be quietly recomputed against easier corpora.
- **Third-party disclosure conflict**: If a maintainer does not respond within the disclosure
  window, publication follows the published responsible-disclosure policy rather than ad-hoc
  judgment.

## Requirements *(mandatory)*

### Functional Requirements

**Scanning & Analysis**

- **FR-001**: The system MUST scan application code, agent code, MCP server implementations,
  tool definitions, and permission scopes within a connected repository in a single scan
  context.
- **FR-002**: The system MUST correlate findings across surfaces, producing findings that
  require joint analysis of application code and agent configuration (e.g., a narrowly scoped
  tool backed by an unscoped data-access client).
- **FR-003**: The system MUST apply framework-aware checks for the supported stack (Next.js,
  Supabase, Firebase, FastAPI, Go), including tenant-isolation/security-rule gaps and
  framework-specific misconfigurations.
- **FR-004**: The system MUST detect, at minimum, the verified-class issues: exposed secrets,
  RLS/security-rule gaps, CORS misconfigurations, unpinned or hallucinated dependencies,
  unauthenticated MCP transports, unbounded tool parameters, and missing schema validation.
- **FR-005**: The system MUST detect, at minimum, the research-class issues: tool poisoning,
  hallucination-based vulnerabilities, confused-deputy chains, and over-permissioned
  autonomous loops.
- **FR-006**: The system MUST support continuous scanning (on push / on PR) for connected
  private repositories, and on-demand scans.
- **FR-006a**: The system MUST support two scan execution modes: Gatepass-hosted scanning
  (default) and a customer-operated scan runner (Scale tier) that executes entirely within
  customer infrastructure and transmits only findings and posture data — never source code.
  Both modes MUST produce identical findings for the same ruleset version and inputs.

**Finding Tiers & Integrity**

- **FR-007**: Every finding MUST be labeled either *verified* or *research-tier*; no third or
  blended state is presented to users.
- **FR-008**: Every verified finding MUST include a concrete reproduction demonstrating the
  issue; a finding without a reproduction MUST NOT carry the verified label.
- **FR-009**: Every research-tier finding MUST include a confidence score and a plain-language
  explanation of the suspected vulnerability class and its impact.
- **FR-010**: Research-tier findings MUST NOT be displayed with language or visuals implying
  deterministic certainty; confidence is always visible.
- **FR-011**: Users MUST be able to dispute a finding; disputes feed precision measurement and
  suppress repeat reports on unchanged code.
- **FR-011a**: Research-tier semantic analysis MAY submit customer code/config excerpts to
  language models operated under Gatepass-controlled accounts with zero-data-retention
  agreements; this MUST be disclosed, MUST be disable-able per organization (with static-only
  fallback and clearly reduced research-tier coverage), and model providers MUST NOT retain or
  train on customer data.

**Remediation**

- **FR-012**: The system MUST deliver findings on pull requests as review comments containing
  the finding, its evidence, and a suggested diff the developer can apply through their own
  tooling.
- **FR-013**: The system MUST provide editor annotations for findings in supported IDEs.
- **FR-014**: The system MUST offer opt-in, pre-commit structured fix guidance consumable by
  the developer's coding agent; this integration is off by default and requires explicit
  enablement per repository.
- **FR-015**: The system MUST NOT create commits, push code, modify CI configuration, or open
  pull requests in customer repositories under any circumstance.
- **FR-016**: The system MUST provide a CI gate that can block merges based on configurable
  thresholds (e.g., any verified finding); the gate blocks and explains — it never alters the
  change.
- **FR-016a**: When a gated scan cannot complete (service outage, timeout), the gate MUST
  fail open by default — allowing the merge with a visible "scan unavailable" annotation —
  with a per-repository opt-in to fail-closed behavior for strict environments (e.g.,
  pre-production MCP fleets).

**Precision Benchmark**

- **FR-017**: The system MUST maintain a versioned, publicly available corpus of MCP servers
  with known-labeled vulnerabilities; corpus versions are immutable once tagged.
- **FR-018**: The system MUST measure and publish true-positive and false-positive rates per
  vulnerability class for Gatepass and named incumbent scanners against identified corpus
  versions, on a continuing basis.
- **FR-019**: A release that regresses published precision MUST be blocked until fixed or the
  affected rules are demoted from the default ruleset.
- **FR-020**: Public scan reports of third-party servers MUST follow the published
  responsible-disclosure policy, including maintainer notification before publication.

**Compliance Evidence**

- **FR-021**: The system MUST export scan posture as SOC 2/ISO-mapped evidence to connected
  compliance platforms (Vanta, Drata) automatically after scans.
- **FR-022**: The system MUST auto-draft security-questionnaire answers from actual scan
  posture; every drafted answer is traceable to posture data and requires human review before
  external use.
- **FR-023**: Evidence and questionnaire outputs MUST NOT be produced in the absence of
  underlying scan data.

**Fleet & Access**

- **FR-024**: The system MUST support registering and continuously scanning a fleet of
  internal MCP servers with per-server results and an aggregated posture view.
- **FR-025**: The system MUST gate capabilities by plan tier: Free (open scanner, public
  server-scan reports), Team (private repos, continuous scanning, PR/IDE remediation,
  agent-loop integration), Scale (multi-repo, CI gating, evidence export, questionnaire
  autofill, MCP-fleet scanning).
- **FR-026**: Customer code and scan artifacts MUST be handled least-privilege, encrypted in
  transit and at rest, retained no longer than scans and enabled evidence exports require, and
  never used to train models or enrich the public corpus without explicit opt-in.
- **FR-027**: Users MUST authenticate via GitHub sign-in at launch; organizations MUST have
  role-based access (admin / member / viewer); a user's repository visibility inside Gatepass
  MUST mirror their GitHub repository permissions; SAML SSO and SCIM provisioning MUST be
  available at the Scale tier.

### Constitution Alignment *(mandatory — Gatepass)*

- **Finding tiers touched**: Both verified and research-tier. Tier integrity preserved via
  FR-007–FR-011 (reproduction required for verified; confidence always visible for research).
- **Surfaces read**: App code, agent code, MCP server implementations, tool definitions,
  permission scopes (FR-001–FR-002) — cross-surface correlation is a core requirement.
- **Writes to customer code or CI?**: No (FR-015). All remediation is suggest-and-approve
  (FR-012–FR-014); CI gate blocks but never rewrites (FR-016).
- **Precision impact**: Entire feature. All rules require corpus fixtures and measured TP/FP
  (FR-017–FR-019); published-precision regressions block release.

### Key Entities

- **Repository / Project**: A connected codebase; the scan boundary. Attributes: surfaces
  present, frameworks detected, plan tier, scan settings (CI gate, agent-loop opt-in).
- **Scan**: One analysis run over a repository or server at a point in time; produces findings
  and posture.
- **Finding**: A single reported issue. Attributes: tier (verified | research), vulnerability
  class, location(s), affected surfaces, reproduction (verified only), confidence score
  (research only), status (open, fixed, disputed, suppressed).
- **Reproduction**: The concrete, runnable/inspectable demonstration attached to a verified
  finding; redacts sensitive values.
- **Suggested Fix**: A proposed diff or structured fix guidance attached to a finding; applied
  only by the developer.
- **Rule / Analyzer**: A detection capability mapped to a vulnerability class, with corpus
  fixtures and measured precision; member of the default or extended ruleset.
- **Vulnerability Class**: A named entry in the taxonomy (e.g., tool poisoning, HBV,
  confused-deputy chain), with a written definition and corpus examples.
- **Corpus (versioned)**: The open, immutable-once-tagged set of labeled MCP servers used for
  precision measurement and the public benchmark.
- **Benchmark Result**: Published TP/FP rates per class per tool per corpus version, over
  time.
- **MCP Fleet / Server**: A registered internal server inventory item with per-server scan
  history and fleet-level posture aggregation.
- **Evidence Export**: A SOC 2/ISO-mapped posture artifact delivered to a compliance platform,
  traceable to specific scans.
- **Questionnaire Draft**: Auto-drafted answers to a security questionnaire, each traceable to
  posture data, pending human review.
- **Organization / User**: Account structures with plan tier and role-based access (admin /
  member / viewer); users authenticate via GitHub, and repository visibility mirrors GitHub
  permissions (SAML SSO/SCIM at Scale tier).
- **Scan Runner**: A customer-operated execution agent (Scale tier) that runs scans inside
  customer infrastructure and uploads only findings and posture data; versioned against the
  ruleset for reproducibility.

## Success Criteria *(mandatory)*

- **SC-001**: On the current tagged corpus version, Gatepass's overall false-positive rate is
  at or below 10% — measured and published beside incumbent scanners' rates (reference bar:
  ~78%).
- **SC-002**: 100% of findings labeled *verified* carry a reproduction that a reviewer can
  confirm; any verified finding whose reproduction fails is a release-blocking defect.
- **SC-003**: On a seeded evaluation repository, the scanner detects at least 95% of planted
  verified-class issues and reports zero tier mislabelings.
- **SC-004**: A developer goes from connecting a repository to seeing their first findings
  report in under 15 minutes, without assistance.
- **SC-005**: Zero incidents, ever, of Gatepass modifying customer code, CI configuration, or
  opening unsolicited pull requests — verified by audit of all write operations.
- **SC-006**: For teams with PR remediation enabled, at least 60% of verified findings on PRs
  are resolved before merge within the first 30 days of use.
- **SC-007**: The public benchmark is updated at least monthly, every published number is
  reproducible from its named corpus version, and no published precision figure regresses
  between releases without the affected rules being demoted.
- **SC-008**: For a connected compliance platform, 100% of exported evidence items are
  traceable to a specific scan, and at least 80% of agent-security questionnaire questions in
  supported formats receive an auto-drafted answer for human review.
- **SC-009**: A platform team can register an internal MCP fleet and obtain a complete
  fleet posture view (every server scanned at least once) within one business day.
- **SC-010**: The system operates within the launch scale envelope without degradation:
  1,000 organizations, 10,000 connected repositories, 50,000 scans/day, repositories up to
  2M LOC / 5 GB, fleets up to 500 servers — with 95% of incremental PR scans completing in
  under 5 minutes and 95% of full scans in under 30 minutes.
- **SC-011**: The scan service meets a 99.9% availability target; CI-gated merges are never
  blocked by a Gatepass outage unless the repository has explicitly opted into fail-closed
  mode.

## Assumptions

- **Source-control platform**: GitHub is the first supported SCM (PR comments, checks/CI
  gate); other platforms follow later. This matches the target buyer's dominant tooling.
- **IDE support**: One mainstream editor integration first (VS Code family), expanding later.
- **Coding-agent integrations**: Claude Code and Cursor are the first agent-loop targets, per
  the one-pager.
- **Compliance platforms**: Vanta and Drata are the first evidence-export targets; SOC 2 and
  ISO 27001 are the first mapped frameworks.
- **Confidence threshold**: Research-tier findings below a default display threshold are
  hidden by default; the threshold is tunable per organization.
- **Disclosure window**: Public third-party server reports follow a published
  responsible-disclosure policy with an industry-standard notification window (e.g., 90 days)
  before publication of unfixed findings.
- **Plan-tier boundaries**: Feature gating follows the one-pager's Free/Team/Scale split;
  pricing itself is out of scope for this specification.
- **Scope boundary**: Runtime/inference-time protection (agent firewalls) is explicitly out of
  scope — Gatepass is pre-deployment; runtime vendors are integration partners, not a surface
  this product implements.
