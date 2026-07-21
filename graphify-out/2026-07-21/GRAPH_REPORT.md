# Graph Report - .  (2026-07-09)

## Corpus Check
- 217 files · ~65,413 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 803 nodes · 1252 edges · 75 communities (59 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

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
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 53
- Community 54
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 70

## God Nodes (most connected - your core abstractions)
1. `Finding` - 25 edges
2. `Gatepass Constitution` - 22 edges
3. `ScanContext` - 17 edges
4. `buildScanContext()` - 16 edges
5. `compilerOptions` - 16 edges
6. `Detector` - 15 edges
7. `runScan()` - 14 edges
8. `DetectorFinding` - 13 edges
9. `Engineering Handoff` - 13 edges
10. `Feature Specification` - 12 edges

## Surprising Connections (you probably didn't know these)
- `HandlerOptions` --references--> `LlmTransport`  [EXTRACTED]
  apps/api/src/handlers.ts → packages/semantic/src/gateway.ts
- `StoredScan` --references--> `FindingsDocument`  [EXTRACTED]
  apps/api/src/store.ts → packages/findings/src/schema.ts
- `OrchestratorOptions` --references--> `Tracer`  [EXTRACTED]
  apps/workers/src/orchestrator.ts → packages/shared/src/telemetry.ts
- `scanTree()` --calls--> `runScan()`  [EXTRACTED]
  runner/test/protocol.test.ts → packages/detectors/src/pipeline.ts
- `scanTree()` --calls--> `buildScanContext()`  [EXTRACTED]
  runner/test/protocol.test.ts → packages/engine/src/scan-context.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Speckit Development Workflow Commands** — _claude_skills_speckit-specify_skill, _claude_skills_speckit-clarify_skill, _claude_skills_speckit-plan_skill, _claude_skills_speckit-tasks_skill, _claude_skills_speckit-implement_skill, _claude_skills_speckit-analyze_skill, _claude_skills_speckit-converge_skill, _claude_skills_speckit-checklist_skill, _claude_skills_speckit-constitution_skill, _claude_skills_speckit-taskstoissues_skill [INFERRED 0.85]
- **Gatepass Six Core Principles** — _specify_memory_constitution_principle_i, _specify_memory_constitution_principle_ii, _specify_memory_constitution_principle_iii, _specify_memory_constitution_principle_iv, _specify_memory_constitution_principle_v, _specify_memory_constitution_principle_vi [EXTRACTED 1.00]
- **CI Quality Gate System** — _github_workflows_ci_yml, _github_workflows_benchmark-monthly_yml, _github_workflows_release_yml, _github_workflows_self-scan_yml, _specify_memory_constitution_dev_workflow_gates [INFERRED 0.85]
- **Two-Tier Findings System** — handoff_two_tier_findings, handoff_verified_detectors, handoff_research_detectors, corpus_readme_reproduction_verification, handoff_constitution [EXTRACTED 0.95]
- **GitHub Integration Workflow** — specs_001_gatepass_platform_contracts_github_integration_github_integration, specs_001_gatepass_platform_contracts_github_integration_ci_gate, specs_001_gatepass_platform_contracts_github_integration_pr_remediation [EXTRACTED 0.95]
- **Scan Pipeline Engine** — specs_001_gatepass_platform_tasks_scan_pipeline, specs_001_gatepass_platform_spec_five_attack_surfaces, handoff_cross_surface_analysis, handoff_verified_detectors, handoff_research_detectors, specs_001_gatepass_platform_research_llm_semantic_layer, specs_001_gatepass_platform_research_one_engine_three_dist [INFERRED 0.85]

## Communities (75 total, 16 thin omitted)

### Community 0 - "API Route Handlers"
Cohesion: 0.07
Nodes (34): ForbiddenError, makeHandlers(), NotFoundError, createServer(), sendError(), sendJson(), FleetServer, MemoryStore (+26 more)

### Community 1 - "Cross-Surface Detectors"
Cohesion: 0.10
Nodes (30): confusedDeputyDetector, corsDetector, Match, collectScopedTools(), collectUnscopedClients(), crossSurfaceScopeDetector, ScopedTool, stripComments() (+22 more)

### Community 2 - "CLI Tool"
Cohesion: 0.08
Nodes (36): Args, main(), parseArgs(), printHelp(), printHuman(), severityRank(), main(), CaseMeta (+28 more)

### Community 3 - "Audit System"
Cohesion: 0.07
Nodes (31): AuditAction, AuditEvent, AuditSink, InMemoryAuditSink, AppConfig, loadConfig(), requireConfig(), generateToken() (+23 more)

### Community 4 - "Posture Controls & Evidence"
Cohesion: 0.09
Nodes (32): RFC-4180, ControlDef, CONTROLS, evaluatePosture(), EvidenceItem, NoPostureError, Scan, ingest() (+24 more)

### Community 5 - "Spec-Kit Workflow"
Cohesion: 0.12
Nodes (36): Speckit Analyze Skill, Speckit Checklist Skill, Speckit Clarify Skill, Speckit Constitution Skill, Speckit Converge Skill, Speckit Implement Skill, Speckit Plan Skill, Speckit Specify Skill (+28 more)

### Community 6 - "Governance & Docs"
Cohesion: 0.09
Nodes (36): Eval Repo: vulnerable-nextjs-mcp, Corpus Documentation, Reproduction Verification (SC-002), Constitution, Cross-Surface Analysis, Engineering Handoff, Precision Benchmark, Research Detectors (5 classes) (+28 more)

### Community 7 - "Package Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, zod, description, devDependencies, eslint, @eslint/js, prettier, tsx (+21 more)

### Community 8 - "Scan Orchestrator"
Cohesion: 0.09
Nodes (13): DEFAULTS, JobHandler, JobRecord, OrchestratorOptions, ScanJob, ScanOrchestrator, ScanState, current (+5 more)

### Community 9 - "Semantic Analysis"
Cohesion: 0.14
Nodes (11): HandlerOptions, analyzeSemantic(), SemanticInput, SemanticResult, SYSTEM, AnalysisResult, GatewayOptions, LlmGateway (+3 more)

### Community 10 - "Corpus Case Schema"
Cohesion: 0.11
Nodes (18): additionalProperties, minLength, type, minLength, type, enum, type, properties (+10 more)

### Community 11 - "SARIF Export"
Cohesion: 0.14
Nodes (16): sarifLevel(), toSarif(), findingBase, findingSchema, FindingsDocument, findingsDocumentSchema, Location, locationSchema (+8 more)

### Community 12 - "Engine Package"
Cohesion: 0.11
Nodes (17): dependencies, @gatepass/benchmark, @gatepass/detectors, @gatepass/engine, @gatepass/evidence, @gatepass/findings, @gatepass/github, @gatepass/runner (+9 more)

### Community 13 - "GitHub Integration"
Cohesion: 0.18
Nodes (7): GateConfig, GitHubClient, Remediator, PullReview, FakeGitHub, verified, AuditedWriter

### Community 14 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+8 more)

### Community 15 - "Rules Registry"
Cohesion: 0.20
Nodes (6): Tier, ClassStatus, RegistryError, RulesRegistry, VALID_TRANSITIONS, VulnerabilityClass

### Community 16 - "CI Gate"
Cohesion: 0.25
Nodes (10): GateResult, PostedCheckRun, PostedReview, NOTE: intentionally no writeFile / createCommit / updateWorkflow — see Principle, CHECK_STATUS, FetchLike, badge(), buildReview() (+2 more)

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
Cohesion: 0.24
Nodes (7): safeParseFinding(), assertRedacted(), RedactionError, redactSecrets(), Reproduction, research, verified

### Community 21 - "GitHub Package"
Cohesion: 0.20
Nodes (9): dependencies, @gatepass/detectors, @gatepass/engine, @gatepass/findings, exports, name, private, type (+1 more)

### Community 22 - "Gate Evaluation"
Cohesion: 0.31
Nodes (8): Severity, atOrAbove(), CheckConclusion, evaluateGate(), GateFailureMode, GateMode, SEVERITY_ORDER, ThresholdConfig

### Community 23 - "Shared Package"
Cohesion: 0.22
Nodes (8): dependencies, @gatepass/findings, @gatepass/shared, exports, name, private, type, version

### Community 24 - "Loops Package"
Cohesion: 0.25
Nodes (7): dependencies, @gatepass/shared, exports, name, private, type, version

### Community 25 - "Fix Generation"
Cohesion: 0.25
Nodes (6): generateSuggestedFix(), SuggestedFix, Finding, GateInput, research, verified

### Community 26 - "Engine Deps Package"
Cohesion: 0.25
Nodes (7): dependencies, @gatepass/findings, exports, name, private, type, version

### Community 27 - "Detector Deps Package"
Cohesion: 0.25
Nodes (7): dependencies, @gatepass/findings, exports, name, private, type, version

### Community 28 - "Zod Package"
Cohesion: 0.25
Nodes (7): dependencies, zod, exports, name, private, type, version

### Community 30 - "Registry Package"
Cohesion: 0.25
Nodes (7): dependencies, @gatepass/findings, exports, name, private, type, version

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, outDir, rootDir, extends, include

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (5): exports, name, private, type, version

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (5): dependencies, left-pad, some-helper, name, version

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (5): dependencies, left-pad, some-helper, name, version

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (5): exports, name, private, type, version

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (5): exports, name, private, type, version

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 49 - "Community 49"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

## Knowledge Gaps
- **329 isolated node(s):** `printWidth`, `singleQuote`, `semi`, `trailingComma`, `check-prerequisites.sh script` (+324 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Finding` connect `Fix Generation` to `API Route Handlers`, `Cross-Surface Detectors`, `CLI Tool`, `Posture Controls & Evidence`, `SARIF Export`, `GitHub Integration`, `CI Gate`, `Tier Integrity`, `Gate Evaluation`, `REST Client Tests`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `LlmGateway` connect `Semantic Analysis` to `API Route Handlers`, `Cross-Surface Detectors`, `CLI Tool`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `printWidth`, `singleQuote`, `semi` to the rest of the system?**
  _331 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Route Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.06641604010025062 - nodes in this community are weakly interconnected._
- **Should `Cross-Surface Detectors` be split into smaller, more focused modules?**
  _Cohesion score 0.09503843466107617 - nodes in this community are weakly interconnected._
- **Should `CLI Tool` be split into smaller, more focused modules?**
  _Cohesion score 0.07676767676767676 - nodes in this community are weakly interconnected._
- **Should `Audit System` be split into smaller, more focused modules?**
  _Cohesion score 0.0707070707070707 - nodes in this community are weakly interconnected._