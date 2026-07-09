# Tasks: [FEATURE NAME]

**Input**: Design documents from `specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Corpus fixtures and precision measurements are MANDATORY for any task that adds or
changes detection rules (Constitution Principles I, II, V). Other tests are included per the
feature spec.

**Organization**: Tasks are grouped by user story so each story is independently implementable
and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1, US2, ...)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [Project init / scaffolding task]
- [ ] T002 [P] [Linting, CI, corpus harness setup]

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST complete before ANY user story

- [ ] T003 [e.g., scan-context model, storage schema]

**Checkpoint**: Foundation ready — user stories can begin

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Story goal from spec]

**Independent Test**: [From spec]

### Corpus & Tests for US1 (mandatory if rules touched)

- [ ] T004 [P] [US1] Corpus fixtures (positive + negative cases) in corpus/...
- [ ] T005 [P] [US1] Precision measurement wired into CI

### Implementation for US1

- [ ] T006 [US1] [Implementation task with file path]
- [ ] T007 [US1] [Implementation task with file path]

**Checkpoint**: US1 independently functional; precision measured if applicable

## Phase 4: User Story 2 - [Title] (Priority: P2)

[Same structure as Phase 3]

## Phase N: Polish & Cross-Cutting Concerns

- [ ] TXXX [P] Documentation updates
- [ ] TXXX Constitution Check re-verification (tier labels, approval flows, no silent writes)

## Dependencies & Execution Order

- Setup → Foundational → User Stories (in priority order) → Polish
- User stories are independently completable once Foundational is done
- [P] tasks within a phase may run in parallel

## Implementation Strategy

**MVP first**: Complete Phase 1 → 2 → 3 (US1), validate independently, then continue by
priority. Stop at any checkpoint for an independently deliverable slice.
