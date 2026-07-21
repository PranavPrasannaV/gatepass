# Graph Report - gatepass  (2026-07-21)

## Corpus Check
- 295 files · ~97,562 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1591 nodes · 2143 edges · 214 communities (132 shown, 82 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cc1fdeb9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- API Route Handlers
- Cross-Surface Detectors
- CLI Tool
- Audit System
- Posture Controls & Evidence
- Spec-Kit Workflow
- Governance & Docs
- Package Dependencies
- Scan Orchestrator
- Semantic Analysis
- Corpus Case Schema
- SARIF Export
- Engine Package
- GitHub Integration
- TypeScript Config
- Rules Registry
- CI Gate
- CLI Package
- Detectors Package
- Evidence Package
- Tier Integrity
- GitHub Package
- Gate Evaluation
- Shared Package
- Loops Package
- Fix Generation
- Engine Deps Package
- Detector Deps Package
- Zod Package
- REST Client Tests
- Registry Package
- compilerOptions
- tsconfig.json
- tsconfig.json
- package.json
- tsconfig.json
- package.json
- package.json
- tsconfig.json
- tsconfig.json
- tsconfig.json
- tsconfig.json
- tsconfig.json
- tsconfig.json
- package.json
- tsconfig.json
- package.json
- tsconfig.json
- tsconfig.json
- .prettierrc.json
- common.sh
- server.ts
- db.ts
- db.ts
- api.ts
- api.ts
- config.ts
- server.ts
- server.ts
- check-prerequisites.sh
- setup-plan.sh
- setup-tasks.sh
- Extension Hooks System
- Docker Infrastructure
- Monorepo Workspace Config
- ApiClient
- package.json
- Tasks: Gatepass — Precision AppSec Platform for the AI-Native Stack
- PgStore
- Gatepass Dashboard Design System
- OrgProvider.tsx
- Store
- Skeleton.tsx
- compilerOptions
- buildScanContext
- Execution Steps
- User Scenarios & Testing *(mandatory)*
- MemoryStore
- index.ts
- production-readiness.test.ts
- Gatepass — Engineering Handoff
- GATEPASS (v4 — synthesis)
- 2. Open tasks requiring human intervention
- protocol.ts
- Core Principles
- rate-limit.ts
- introspection-benchmark.test.ts
- measure.ts
- plan-tier.ts
- Feature Specification: [FEATURE NAME]
- Tasks: [FEATURE NAME]
- server.ts
- api-client.ts
- types.ts
- SKILL.md
- SKILL.md
- SKILL.md
- index.ts
- Phase 0 Research: Gatepass Platform
- EmptyState.tsx
- FindingsClient.tsx
- Toast.tsx
- Implementation Plan: [FEATURE]
- Quickstart: Validating the Gatepass Platform
- Build Status — Gatepass Platform
- SKILL.md
- index.ts
- auth.ts
- Implementation Plan: Gatepass — Precision AppSec Platform for the AI-Native Stack
- index.ts
- Button.tsx
- SKILL.md
- SKILL.md
- stitch
- Contract: Platform API (REST, `/v1`)
- cross-surface.ts
- Contract: Open-Source Scanner CLI (Free tier)
- Badge.tsx
- Gatepass — Agent Context
- SKILL.md
- SKILL.md
- exposed-secret.ts
- Gatepass
- Specification Quality Checklist: Gatepass — Precision AppSec Platform for the AI-Native Stack
- Contract: Evidence Export & Questionnaire Drafting (Scale tier)
- Contract: GitHub Integration
- Contract: Self-Hosted Runner Protocol (Scale tier)
- US1 Validation — Scan a Repository and Get Trustworthy Findings
- tsconfig.json
- Gatepass Corpus
- page.tsx
- next.config.ts
- next-env.d.ts
- postcss.config.mjs
- README.md
- findings-schema.md
- Speckit Analyze Skill
- Speckit Checklist Skill
- Speckit Clarify Skill
- Speckit Constitution Skill
- Speckit Converge Skill
- Speckit Implement Skill
- Speckit Plan Skill
- Speckit Specify Skill
- Speckit Development Workflow
- Speckit Tasks Skill
- Speckit Taskstoissues Skill
- Constitution Governance
- Principle III: Remediation in Workflow
- Principle IV: Cross-Surface Context
- Principle VI: Pure Software
- Plan Template
- Constitution Check Gates
- Spec Template
- Spec Constitution Alignment
- Tasks Template
- Gatepass Tech Stack
- Gatepass Hard Rules
- Corpus Documentation
- Reproduction Verification (SC-002)
- Agentic Vulnerability Taxonomy
- Constitution
- Cross-Surface Analysis
- Engineering Handoff
- Precision Benchmark
- Research Detectors (5 classes)
- Self-Scan CI
- Spec-Kit Workflow
- Two-Tier Findings System
- Verified Detectors (7 classes)
- Project README
- Requirements Checklist
- Platform API Contract
- OSS Scanner CLI Contract
- Control Map (SOC 2 / ISO 27001)
- Evidence Export Contract
- Findings Schema Contract
- CI Gate
- GitHub Integration Contract
- PR Remediation
- Self-Hosted Runner Protocol
- Data Model Document
- Plan-Tier Gating (Free/Team/Scale)
- Implementation Plan
- Quickstart Guide
- LLM Semantic Layer
- One Engine Three Distributions
- Phase 0 Research
- Feature Specification
- Five Attack Surfaces
- Scan Pipeline
- Task Ledger
- Build Status
- US1 Validation

## God Nodes (most connected - your core abstractions)
1. `Finding` - 36 edges
2. `buildScanContext()` - 25 edges
3. `ApiClient` - 21 edges
4. `runScan()` - 21 edges
5. `Store` - 20 edges
6. `MemoryStore` - 18 edges
7. `ScanContext` - 17 edges
8. `scripts` - 16 edges
9. `PgStore` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Props` --references--> `Finding`  [EXTRACTED]
  apps/web/src/app/findings/FindingsClient.tsx → packages/findings/src/schema.ts
- `HandlerOptions` --references--> `GitHubClient`  [EXTRACTED]
  apps/api/src/handlers.ts → packages/github/src/poster.ts
- `ServerOptions` --references--> `GitHubClient`  [EXTRACTED]
  apps/api/src/server.ts → packages/github/src/poster.ts
- `OrgRecord` --references--> `PlanTier`  [EXTRACTED]
  apps/web/src/lib/types.ts → packages/shared/src/plan-tier.ts
- `severityLabel()` --references--> `Severity`  [EXTRACTED]
  apps/web/src/lib/utils.ts → packages/findings/src/schema.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Quality Gate System** — _github_workflows_ci_yml, _github_workflows_benchmark-monthly_yml, _github_workflows_release_yml, _github_workflows_self-scan_yml, _specify_memory_constitution_dev_workflow_gates [INFERRED 0.85]

## Communities (214 total, 82 thin omitted)

### Community 0 - "API Route Handlers"
Cohesion: 0.21
Nodes (12): releaseGate(), ReleaseGateResult, ClassScore, CorpusCaseLabel, Detection, isPrecisionRegression(), scoreTool(), ToolBenchmark (+4 more)

### Community 1 - "Cross-Surface Detectors"
Cohesion: 0.11
Nodes (22): confusedDeputyDetector, corsDetector, Match, collectScopedTools(), dependenciesDetector, hbvDetector, ToolDef, overPermissionedLoopDetector (+14 more)

### Community 2 - "CLI Tool"
Cohesion: 0.17
Nodes (13): detectFrameworks(), Framework, SUPPORTED_FRAMEWORKS, IGNORED_DIRS, isScannable(), MANIFESTS, NOTE: build output dirs (dist/build/.next) are intentionally NOT ignored — shipp, ScanContext (+5 more)

### Community 3 - "Audit System"
Cohesion: 0.06
Nodes (35): DEFAULTS, JobHandler, JobRecord, OrchestratorOptions, ScanJob, ScanOrchestrator, ScanState, AuditAction (+27 more)

### Community 4 - "Posture Controls & Evidence"
Cohesion: 0.08
Nodes (36): FleetServer, RFC-4180, ControlDef, CONTROLS, evaluatePosture(), EvidenceItem, NoPostureError, Scan (+28 more)

### Community 5 - "Spec-Kit Workflow"
Cohesion: 0.29
Nodes (7): Monthly Benchmark Workflow, CI Workflow, Release Precision Gate Workflow, Principle I: Precision Is the Product, Principle II: Two-Tier Finding Integrity, Principle V: Research-Fed Corpus, Public Precision Benchmark

### Community 7 - "Package Dependencies"
Cohesion: 0.05
Nodes (36): dependencies, zod, description, devDependencies, eslint, @eslint/js, prettier, tsx (+28 more)

### Community 8 - "Scan Orchestrator"
Cohesion: 0.06
Nodes (29): auditEvents, benchmarkRuns, classStatusEnum, disputeResolutionEnum, disputes, evidenceExports, findings, findingSeverityEnum (+21 more)

### Community 9 - "Semantic Analysis"
Cohesion: 0.12
Nodes (14): HandlerOptions, analyzeSemantic(), SemanticInput, SemanticResult, SYSTEM, AnalysisResult, GatewayOptions, LlmGateway (+6 more)

### Community 10 - "Corpus Case Schema"
Cohesion: 0.11
Nodes (18): additionalProperties, minLength, type, minLength, type, enum, type, properties (+10 more)

### Community 11 - "SARIF Export"
Cohesion: 0.12
Nodes (19): safeParseFinding(), assertRedacted(), RedactionError, redactSecrets(), findingBase, findingSchema, findingsDocumentSchema, locationSchema (+11 more)

### Community 12 - "Engine Package"
Cohesion: 0.11
Nodes (17): dependencies, @gatepass/benchmark, @gatepass/detectors, @gatepass/engine, @gatepass/evidence, @gatepass/findings, @gatepass/github, @gatepass/runner (+9 more)

### Community 13 - "GitHub Integration"
Cohesion: 0.13
Nodes (13): GateResult, GitHubClient, PostedCheckRun, PostedReview, NOTE: intentionally no writeFile / createCommit / updateWorkflow — see Principle, Remediator, CHECK_STATUS, FetchLike (+5 more)

### Community 14 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+8 more)

### Community 15 - "Rules Registry"
Cohesion: 0.20
Nodes (6): Tier, ClassStatus, RegistryError, RulesRegistry, VALID_TRANSITIONS, VulnerabilityClass

### Community 16 - "CI Gate"
Cohesion: 0.32
Nodes (5): badge(), buildReview(), commentBody(), ReviewComment, verified

### Community 17 - "CLI Package"
Cohesion: 0.18
Nodes (10): bin, gatepass, dependencies, @gatepass/detectors, @gatepass/engine, @gatepass/findings, name, private (+2 more)

### Community 18 - "Detectors Package"
Cohesion: 0.20
Nodes (9): dependencies, @gatepass/detectors, @gatepass/engine, @gatepass/findings, exports, name, private, type (+1 more)

### Community 19 - "Evidence Package"
Cohesion: 0.20
Nodes (9): dependencies, @gatepass/engine, @gatepass/findings, @gatepass/semantic, exports, name, private, type (+1 more)

### Community 20 - "Tier Integrity"
Cohesion: 0.08
Nodes (25): 1. Initialize Analysis Context, 2. Load Artifacts (Progressive Disclosure), 3. Build Semantic Models, 4. Detection Passes (Token-Efficient Analysis), 5. Severity Assignment, 6. Produce Compact Analysis Report, 7. Provide Next Actions, 8. Offer Remediation (+17 more)

### Community 21 - "GitHub Package"
Cohesion: 0.20
Nodes (9): dependencies, @gatepass/detectors, @gatepass/engine, @gatepass/findings, exports, name, private, type (+1 more)

### Community 22 - "Gate Evaluation"
Cohesion: 0.16
Nodes (5): severityLabel(), sarifLevel(), toSarif(), Severity, ThresholdConfig

### Community 23 - "Shared Package"
Cohesion: 0.17
Nodes (11): dependencies, @gatepass/findings, @gatepass/shared, jsonwebtoken, devDependencies, @types/jsonwebtoken, exports, name (+3 more)

### Community 24 - "Loops Package"
Cohesion: 0.25
Nodes (7): dependencies, @gatepass/shared, exports, name, private, type, version

### Community 25 - "Fix Generation"
Cohesion: 0.15
Nodes (13): generateSuggestedFix(), SuggestedFix, Finding, atOrAbove(), CheckConclusion, evaluateGate(), GateConfig, GateFailureMode (+5 more)

### Community 26 - "Engine Deps Package"
Cohesion: 0.25
Nodes (7): dependencies, @gatepass/findings, exports, name, private, type, version

### Community 27 - "Detector Deps Package"
Cohesion: 0.25
Nodes (7): dependencies, @gatepass/findings, exports, name, private, type, version

### Community 28 - "Zod Package"
Cohesion: 0.25
Nodes (7): dependencies, zod, exports, name, private, type, version

### Community 29 - "REST Client Tests"
Cohesion: 0.08
Nodes (26): Audit & Operations, AuditEvent (append-only), BenchmarkRun, CorpusCase (lives in `corpus/` repo; indexed in DB for measurement joins), Data Model: Gatepass Platform, Dispute, Evidence & Questionnaires, EvidenceExport (+18 more)

### Community 30 - "Registry Package"
Cohesion: 0.25
Nodes (7): dependencies, @gatepass/findings, exports, name, private, type, version

### Community 31 - "compilerOptions"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, outDir, rootDir, extends, include

### Community 32 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 33 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 34 - "package.json"
Cohesion: 0.18
Nodes (10): dependencies, @gatepass/detectors, @gatepass/engine, @gatepass/findings, @gatepass/semantic, exports, name, private (+2 more)

### Community 35 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 36 - "package.json"
Cohesion: 0.33
Nodes (5): dependencies, left-pad, some-helper, name, version

### Community 37 - "package.json"
Cohesion: 0.33
Nodes (5): dependencies, left-pad, some-helper, name, version

### Community 38 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 39 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 40 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 41 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 42 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 43 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 44 - "package.json"
Cohesion: 0.33
Nodes (5): exports, name, private, type, version

### Community 45 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 46 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, drizzle-orm, @gatepass/findings, postgres, exports, name, private, type (+1 more)

### Community 47 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 48 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 49 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 75 - "ApiClient"
Cohesion: 0.14
Nodes (7): ApiClient, AgentGuidance, EvidenceExport, FleetServer, QuestionnaireDraft, RepoRecord, ScanResult

### Community 76 - "package.json"
Cohesion: 0.08
Nodes (23): dependencies, @gatepass/findings, @gatepass/shared, lucide-react, next, react, react-dom, devDependencies (+15 more)

### Community 77 - "Tasks: Gatepass — Precision AppSec Platform for the AI-Native Stack"
Cohesion: 0.09
Nodes (23): Corpus & fixtures for US1 (mandatory), Dependencies & Execution Order, Format: `[ID] [P?] [Story?] Description with file path`, HIGH, HIGH, Implementation for US1, Implementation Strategy, LOW (+15 more)

### Community 78 - "PgStore"
Cohesion: 0.12
Nodes (6): OrgRecord, StoredScan, FindingsDocument, Location, PgStore, PlanTier

### Community 79 - "Gatepass Dashboard Design System"
Cohesion: 0.09
Nodes (21): Anti-Patterns, Blue Accent (Interactive), Border Radius, Color Palette, Component Primitives, Dark Mode, Dashboard Grid, Design Principles (+13 more)

### Community 80 - "OrgProvider.tsx"
Cohesion: 0.15
Nodes (13): jakarta, jetbrains, metadata, SettingsPage(), FOOTER_ITEMS, NAV_ITEMS, Sidebar(), TopNavBar() (+5 more)

### Community 82 - "Skeleton.tsx"
Cohesion: 0.16
Nodes (4): Skeleton(), SkeletonProps, SkeletonVariant, variantStyles

### Community 83 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, incremental, jsx, lib, module, moduleResolution (+8 more)

### Community 84 - "buildScanContext"
Cohesion: 0.24
Nodes (13): runEdgeCase(), runEdgeCaseNoFindings(), SCAN_OPTS, detectForCase(), detectForCase(), runScan(), runScanAsync(), ctxOf() (+5 more)

### Community 85 - "Execution Steps"
Cohesion: 0.12
Nodes (15): 1. Initialize Convergence Context, 2. Load Artifacts (Progressive Disclosure), 3. Build the Intent Inventory, 4. Assess the Codebase and Classify Findings, 5. Assign Severity, 6. Present the In-Session Findings Summary, 7. Append Convergence Tasks (or report converged), 8. Provide Next Actions (Handoff) (+7 more)

### Community 86 - "User Scenarios & Testing *(mandatory)*"
Cohesion: 0.12
Nodes (16): Assumptions, Clarifications, Constitution Alignment *(mandatory — Gatepass)*, Edge Cases, Feature Specification: Gatepass — Precision AppSec Platform for the AI-Native Stack, Functional Requirements, Key Entities, Requirements *(mandatory)* (+8 more)

### Community 88 - "index.ts"
Cohesion: 0.17
Nodes (10): Card(), CardProps, Input, InputProps, Select, SelectOption, SelectProps, Column (+2 more)

### Community 89 - "production-readiness.test.ts"
Cohesion: 0.13
Nodes (12): ALL_CLASS_IDS, BENCH_CASES, BenchCase, CASES_ROOT, CheckResult, DEFAULT_TEST_REPO, DetectResult, EDGE_CASES (+4 more)

### Community 90 - "Gatepass — Engineering Handoff"
Cohesion: 0.14
Nodes (14): 10. Founder / project context (was previously only in the AI's working memory), 1. What Gatepass is (in one paragraph), 2. The governing law: the Constitution, 3. How this repo was built: the Spec-Kit workflow, 4. Repository tour, 5. Current status (as of this handoff), 6. Recurring gotchas (learn from the bugs already fixed), 7. How to run everything (+6 more)

### Community 91 - "GATEPASS (v4 — synthesis)"
Cohesion: 0.15
Nodes (13): Business model — pure software, End state, Founder fit, GATEPASS (v4 — synthesis), Moat, One sentence, Precision application security for the AI-native stack., The 60-second pitch (+5 more)

### Community 92 - "2. Open tasks requiring human intervention"
Cohesion: 0.15
Nodes (12): 1. What was completed this ultrawork pass, 2.1 Needs live infrastructure, 2.2 Needs design or code decisions, 2.3 Dashboard and compliance pages, 2.4 Documentation, 2.5 Partial tasks still open, 2. Open tasks requiring human intervention, 3. How to continue (+4 more)

### Community 93 - "protocol.ts"
Cohesion: 0.26
Nodes (10): parseFindingsDocument(), compareVersions(), FORBIDDEN_KEYS, handshake(), HANDSHAKE_OK, HANDSHAKE_UPGRADE, RunnerUploadError, scan() (+2 more)

### Community 94 - "Core Principles"
Cohesion: 0.17
Nodes (12): Self-Scan Workflow, Core Principles, Development Workflow & Quality Gates, Gatepass Constitution, Governance, I. Precision Is the Product, II. Two-Tier Finding Integrity, III. Remediation in the Developer's Workflow — Never Behind Their Back (+4 more)

### Community 95 - "rate-limit.ts"
Cohesion: 0.20
Nodes (7): Bucket, DEFAULT_CONFIG, RateLimitConfig, RateLimiter, rateLimitHeaders(), RateLimitResult, FCFG

### Community 96 - "introspection-benchmark.test.ts"
Cohesion: 0.18
Nodes (9): BENCH_CASES, BenchCase, BenchReport, buildGateway(), DEFAULT_TEST_REPO, REPORTS_DIR, SCAN_OPTS, buildGateway() (+1 more)

### Community 98 - "measure.ts"
Cohesion: 0.23
Nodes (10): main(), CaseMeta, CASES_ROOT, ClassMetrics, HERE, loadCases(), measure(), MeasureResult (+2 more)

### Community 99 - "plan-tier.ts"
Cohesion: 0.21
Nodes (9): Feature, FEATURES, FREE, hasFeature(), PlanTierError, requireFeature(), SCALE, TEAM (+1 more)

### Community 100 - "Feature Specification: [FEATURE NAME]"
Cohesion: 0.17
Nodes (11): Assumptions *(optional)*, Constitution Alignment *(mandatory — Gatepass)*, Edge Cases, Feature Specification: [FEATURE NAME], Functional Requirements, Key Entities *(include if feature involves data)*, Requirements *(mandatory)*, Success Criteria *(mandatory)* (+3 more)

### Community 101 - "Tasks: [FEATURE NAME]"
Cohesion: 0.17
Nodes (11): Corpus & Tests for US1 (mandatory if rules touched), Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation for US1, Implementation Strategy, Phase 1: Setup (Shared Infrastructure), Phase 2: Foundational (Blocking Prerequisites), Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP (+3 more)

### Community 102 - "server.ts"
Cohesion: 0.24
Nodes (6): ForbiddenError, NotFoundError, createServer(), sendError(), sendJson(), ServerOptions

### Community 103 - "api-client.ts"
Cohesion: 0.29
Nodes (3): RECENT_FINDINGS, TREND_DATA, api

### Community 104 - "types.ts"
Cohesion: 0.27
Nodes (6): BenchmarkClient(), precisionColor(), Props, ApiError, BenchmarkData, FleetRollup

### Community 105 - "SKILL.md"
Cohesion: 0.18
Nodes (10): Completion Report, Done When, Key rules, Mandatory Post-Execution Hooks, Outline, Phase 0: Outline & Research, Phase 1: Design & Contracts, Phases (+2 more)

### Community 106 - "SKILL.md"
Cohesion: 0.18
Nodes (10): Completion Report, Done When, For AI Generation, Mandatory Post-Execution Hooks, Outline, Pre-Execution Checks, Quick Guidelines, Section Requirements (+2 more)

### Community 107 - "SKILL.md"
Cohesion: 0.18
Nodes (10): Checklist Format (REQUIRED), Completion Report, Done When, Mandatory Post-Execution Hooks, Outline, Phase Structure, Pre-Execution Checks, Task Generation Rules (+2 more)

### Community 108 - "index.ts"
Cohesion: 0.36
Nodes (8): calibrateConfidence(), calibrateFindings(), CalibrationResult, ClassMetrics, computePrecision(), computeRecall(), DisplayLevel, displayThreshold()

### Community 109 - "Phase 0 Research: Gatepass Platform"
Cohesion: 0.18
Nodes (11): Phase 0 Research: Gatepass Platform, R10. Self-hosted runner distribution, R1. Engine language & parsing strategy, R2. One engine, three distributions, R3. Research-tier semantic layer, R4. Scan execution & isolation, R5. Platform services & data, R6. GitHub integration & CI gate (+3 more)

### Community 110 - "EmptyState.tsx"
Cohesion: 0.24
Nodes (4): POSTURE_COLORS, EmptyState(), EmptyStateProps, FleetView

### Community 111 - "FindingsClient.tsx"
Cohesion: 0.25
Nodes (8): FindingsClient(), Props, severityDotColor, SeverityFilter, severityIconColor, severityPillActive, TierFilter, confidencePercent()

### Community 112 - "Toast.tsx"
Cohesion: 0.22
Nodes (7): Toast, ToastContext, ToastContextValue, ToastProvider(), ToastVariant, useToast(), variantConfig

### Community 113 - "Implementation Plan: [FEATURE]"
Cohesion: 0.22
Nodes (8): Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: [FEATURE], Project Structure, Source Code (repository root), Summary, Technical Context

### Community 114 - "Quickstart: Validating the Gatepass Platform"
Cohesion: 0.22
Nodes (9): Prerequisites, Quickstart: Validating the Gatepass Platform, Scenario 1 — Two-tier scan (US1 / SC-003), Scenario 2 — PR remediation + gate (US2), Scenario 3 — Hosted/runner parity (FR-006a), Scenario 4 — Corpus precision + benchmark reproducibility (US3 / SC-007), Scenario 5 — Evidence export + questionnaire (US4 / SC-008), Scenario 6 — Fleet (US5 / SC-009) (+1 more)

### Community 115 - "Build Status — Gatepass Platform"
Cohesion: 0.22
Nodes (8): Build Status — Gatepass Platform, Built and verified ✅, Convergence pass (Phase 9, T071–T094), Deferred — needs live infrastructure or is future scope, Honest summary, Second convergence-implement pass (offline-completable subset), Ultrawork loop pass (2026-07-16), Verification gate (all executed — updated after 2nd convergence-implement pass)

### Community 116 - "SKILL.md"
Cohesion: 0.25
Nodes (7): Anti-Examples: What NOT To Do, Checklist Purpose: "Unit Tests for English", Example Checklist Types & Sample Items, Execution Steps, Post-Execution Checks, Pre-Execution Checks, User Input

### Community 117 - "index.ts"
Cohesion: 0.43
Nodes (7): Args, main(), parseArgs(), printHelp(), printHuman(), severityRank(), isCrossSurface()

### Community 118 - "auth.ts"
Cohesion: 0.32
Nodes (4): createAppJwt(), getInstallationToken(), GitHubAppConfig, InstallationToken

### Community 119 - "Implementation Plan: Gatepass — Precision AppSec Platform for the AI-Native Stack"
Cohesion: 0.25
Nodes (8): Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: Gatepass — Precision AppSec Platform for the AI-Native Stack, Project Structure, Source Code (repository root), Summary, Technical Context

### Community 120 - "index.ts"
Cohesion: 0.33
Nodes (4): AppConfig, loadConfig(), requireConfig(), Env

### Community 121 - "Button.tsx"
Cohesion: 0.29
Nodes (6): Button, ButtonProps, ButtonSize, ButtonVariant, sizeStyles, variantStyles

### Community 122 - "SKILL.md"
Cohesion: 0.29
Nodes (6): Completion Report, Done When, Mandatory Post-Execution Hooks, Outline, Pre-Execution Checks, User Input

### Community 123 - "SKILL.md"
Cohesion: 0.29
Nodes (6): Completion Report, Done When, Mandatory Post-Execution Hooks, Outline, Pre-Execution Checks, User Input

### Community 124 - "stitch"
Cohesion: 0.29
Nodes (6): mcp, stitch, $schema, enabled, type, url

### Community 125 - "Contract: Platform API (REST, `/v1`)"
Cohesion: 0.29
Nodes (6): Contract: Platform API (REST, `/v1`), Evidence & questionnaires (Scale tier), Fleet (Scale tier), Orgs, repos, settings, Public (no auth), Scans & findings

### Community 126 - "cross-surface.ts"
Cohesion: 0.47
Nodes (5): collectUnscopedClients(), crossSurfaceScopeDetector, ScopedTool, stripComments(), UnscopedClient

### Community 127 - "Contract: Open-Source Scanner CLI (Free tier)"
Cohesion: 0.33
Nodes (5): Contract: Open-Source Scanner CLI (Free tier), Exit codes, Options, Output, Usage

### Community 128 - "Badge.tsx"
Cohesion: 0.40
Nodes (4): Badge(), BadgeProps, BadgeVariant, variantStyles

### Community 129 - "Gatepass — Agent Context"
Cohesion: 0.40
Nodes (5): Gatepass — Agent Context, Governance, graphify, Hard rules for code in this repo, Stack (decided in plan phase — see specs/001-gatepass-platform/research.md)

### Community 130 - "SKILL.md"
Cohesion: 0.40
Nodes (4): Outline, Post-Execution Checks, Pre-Execution Checks, User Input

### Community 131 - "SKILL.md"
Cohesion: 0.40
Nodes (4): Outline, Post-Execution Checks, Pre-Execution Checks, User Input

### Community 132 - "exposed-secret.ts"
Cohesion: 0.40
Nodes (3): exposedSecretDetector, PATTERNS, SecretPattern

### Community 133 - "Gatepass"
Cohesion: 0.40
Nodes (5): Gatepass, How it's organized, License, Quick start, Status

### Community 134 - "Specification Quality Checklist: Gatepass — Precision AppSec Platform for the AI-Native Stack"
Cohesion: 0.40
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Gatepass — Precision AppSec Platform for the AI-Native Stack

### Community 135 - "Contract: Evidence Export & Questionnaire Drafting (Scale tier)"
Cohesion: 0.40
Nodes (4): Contract: Evidence Export & Questionnaire Drafting (Scale tier), Control mapping, Export flow (FR-021, FR-023), Questionnaire drafting (FR-022)

### Community 136 - "Contract: GitHub Integration"
Cohesion: 0.40
Nodes (4): App permissions (scope-level enforcement of FR-015 / Principle III), Contract: GitHub Integration, PR remediation delivery (FR-012), Webhooks consumed

### Community 137 - "Contract: Self-Hosted Runner Protocol (Scale tier)"
Cohesion: 0.40
Nodes (4): Authentication, Contract: Self-Hosted Runner Protocol (Scale tier), Endpoints used by the runner (subset of `/v1`), Hard guarantees

### Community 138 - "US1 Validation — Scan a Repository and Get Trustworthy Findings"
Cohesion: 0.40
Nodes (4): Evidence, Honestly deferred (not yet built), US1 Validation — Scan a Repository and Get Trustworthy Findings, What was built and verified

### Community 139 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 140 - "Gatepass Corpus"
Cohesion: 0.50
Nodes (3): Case format, Gatepass Corpus, Labels & measurement

## Knowledge Gaps
- **809 isolated node(s):** `printWidth`, `singleQuote`, `semi`, `trailingComma`, `check-prerequisites.sh script` (+804 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **82 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Finding` connect `Fix Generation` to `Cross-Surface Detectors`, `measure.ts`, `CLI Tool`, `Posture Controls & Evidence`, `api-client.ts`, `ApiClient`, `SARIF Export`, `GitHub Integration`, `PgStore`, `FindingsClient.tsx`, `CI Gate`, `Store`, `index.ts`, `Gate Evaluation`, `MemoryStore`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `MemoryStore` connect `MemoryStore` to `index.ts`, `PgStore`, `server.ts`, `Store`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `LlmGateway` connect `Semantic Analysis` to `introspection-benchmark.test.ts`, `Cross-Surface Detectors`, `Posture Controls & Evidence`, `buildScanContext`, `production-readiness.test.ts`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `printWidth`, `singleQuote`, `semi` to the rest of the system?**
  _822 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cross-Surface Detectors` be split into smaller, more focused modules?**
  _Cohesion score 0.1064102564102564 - nodes in this community are weakly interconnected._
- **Should `Audit System` be split into smaller, more focused modules?**
  _Cohesion score 0.05505952380952381 - nodes in this community are weakly interconnected._
- **Should `Posture Controls & Evidence` be split into smaller, more focused modules?**
  _Cohesion score 0.08163265306122448 - nodes in this community are weakly interconnected._