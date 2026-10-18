---

description: "Task list template with MVP delivery checkpoints (mvp-starter override of spec-kit 1.2.1 core)"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: MANDATORY (constitution VIII). Every story phase includes unit tests for
domain/boundary behavior and failure paths, plus Playwright coverage for the
user journey. Tests are written alongside the code they prove, never deferred.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
Story phases are grouped into delivery checkpoints (C1–C3). Each checkpoint ends
with a **GATE** task: the implementing agent MUST stop there and wait for an
explicit human decision recorded in `docs/STATUS.md`.

## Format: `[ID] [P?] [Story] [ROUTINE?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **[ROUTINE]**: Fully specified by plan.md and the task text (exact files,
  existing patterns to follow, no open design choice), so it may be delegated
  to a faster model (AGENTS.md, Model routing). Leave untagged anything that
  shapes domain rules, schemas/contracts, boundaries, security/privacy, or
  cross-cutting structure, plus every GATE task. When in doubt, leave it untagged.
- Include exact file paths in descriptions

## Path Conventions

- `src/domain/`: pure TypeScript, no external/UI/storage imports; unit tests beside code (`*.test.ts`)
- `src/storage/`: async store port, Zod boundary validation, browser adapter
- `src/ui/`: React presentation; `src/main.tsx`: composition root
- `src/ui/i18n/`: typed message catalog per locale; default locale = spec language
  (constitution XII). Domain/storage return typed error codes, never UI text.
- `e2e/`: Playwright journeys (desktop Chrome and Pixel 7 projects)
- Adjust only if plan.md records an approved departure (ADR)

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  Checkpoint mapping (first product feature):
  - C1 = P1 story, which MUST exercise the riskiest core assumption
  - C2 = remaining stories needed for a useful workflow, plus reload,
         invalid data, read/write failure, recovery, keyboard and device behavior
  - C3 = polish and agreed acceptance
  Later, smaller features may use a single GATE after their last story.

  Keep every GATE task verbatim apart from the checkpoint label and story IDs.
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Adapt the starter skeleton; do not regenerate tooling

- [ ] T001 [ROUTINE] Rename package/page title/storage key for the product per plan.md
- [ ] T002 Remove or replace starter demo code and tests that this feature supersedes (keep quality/failure coverage)
- [ ] T003 Make the spec language the default locale: add its catalog in src/ui/i18n/, set `defaultLocale`, and update `lang` in index.html

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Define domain types and pure rules in src/domain/[entity].ts with tests in src/domain/[entity].test.ts
- [ ] T005 Define the async store port and validated schema in src/storage/

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 C1 Risky core

**Goal**: [Brief description of what this story delivers]

**Riskiest assumption tested**: [Which assumption this proves or disproves]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1

- [ ] T006 [P] [US1] Unit tests for [rules and failure paths] in src/domain/[name].test.ts
- [ ] T007 [P] [US1] [ROUTINE] Playwright journey for [user journey] in e2e/[name].spec.ts

### Implementation for User Story 1

- [ ] T008 [US1] Implement [domain behavior] in src/domain/[name].ts
- [ ] T009 [US1] [ROUTINE] Implement [UI flow] in src/ui/[Component].tsx
- [ ] T010 [US1] Surface validation and errors accessibly

### C1 GATE

- [ ] T011 [GATE] C1 checkpoint: run `pnpm verify`; start `pnpm dev --host 127.0.0.1 --port 5173 --strictPort` and confirm the URL responds; update docs/STATUS.md (checkpoint, spec IDs, commands and outcomes, URL and who can reach it, ≤3 review steps, questions, next action) and the spec in the same commit; commit the slice; then **STOP** and wait for an explicit human decision. Do not start later phases until docs/STATUS.md records approval.

---

## Phase 4: User Story 2 - [Title] (Priority: P2) C2 Useful and recoverable

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2

- [ ] T012 [P] [US2] Unit tests for [persistence, invalid data, failures] in src/storage/[name].test.ts
- [ ] T013 [P] [US2] [ROUTINE] Playwright journey for [reload/recovery] in e2e/[name].spec.ts

### Implementation for User Story 2

- [ ] T014 [US2] Implement [behavior] in src/[location]/[file].ts
- [ ] T015 [US2] Integrate with User Story 1 components (if needed)

### C2 GATE

- [ ] T016 [GATE] C2 checkpoint: same procedure as T011 for US1–US2; **STOP** for an explicit human decision.

---

[Add more user story phases as needed, placing each before the gate of the checkpoint it belongs to]

---

## Phase N: Polish & Acceptance (C3)

**Purpose**: Demonstrate agreed acceptance criteria and hand off

- [ ] TXXX [P] Accessibility pass: keyboard-only journey, focus, labels, status/error announcements
- [ ] TXXX [P] [ROUTINE] Localization pass: no user-facing strings outside src/ui/i18n/, `Intl` formatting, layouts tolerate longer text at mobile width
- [ ] TXXX Run quickstart.md validation
- [ ] TXXX Document known limits and exact restart/resume steps in docs/STATUS.md and README.md
- [ ] TXXX [GATE] C3 checkpoint: same procedure as T011; request explicit acceptance. **STOP**; never mark accepted without a recorded human decision.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Proceed sequentially in priority order (P1 → P2 → P3)
- **GATE tasks**: Block every later task until docs/STATUS.md records an explicit human decision
- **Polish (Final Phase)**: Depends on all desired user stories being complete and approved

### Within Each User Story

- Tests are written with or before the implementation they prove
- Domain before storage before UI
- Core implementation before integration
- Story complete and checks green before moving to next priority

### Parallel Opportunities

- Tasks marked [P] within a phase can run in parallel
- Never parallelize across a GATE

---

## Implementation Strategy

### Checkpointed MVP

1. Complete Setup + Foundational
2. Complete User Story 1 → C1 GATE: running app, evidence, **STOP**
3. After approval (or requested changes folded into spec.md/tasks.md): User Story 2+ → C2 GATE, **STOP**
4. After approval: Polish & Acceptance → C3 GATE, **STOP**

Human feedback at a gate updates spec.md (via `/speckit-clarify` or a direct
edit with stable IDs), then `/speckit-tasks` or `/speckit-converge` refreshes
remaining work before implementation resumes.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit coherent slices (a story or a gate), not individual tasks or files
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
