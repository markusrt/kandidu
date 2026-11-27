# Tasks: Kandidu – Visual design (calmer and more modern)

**Input**: Design documents from `/specs/002-visual-design/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/design-tokens.md

**Tests**: MANDATORY (constitution VIII). Existing unit and E2E test files stay
unchanged (SC-001); new checks go into new files.

**Delivery Mode**: Spike (C1), then Light (C3) — this list holds the spike
only. US2, US3 and the Light C3 gate are added by `/speckit-tasks` after the
owner's C1 decision.

## Format: `[ID] [P?] [Story] [ROUTINE?] Description`

---

## Phase 1: Setup

- [ ] T001 Add `@fontsource/atkinson-hyperlegible-next` 5.3.0 (exact version) with `pnpm add`, import the latin 400 and 700 CSS in src/main.tsx; confirm the built `dist/` contains only those WOFF2 files and no foreign URL (FR-002, SC-007, ADR 011)
- [ ] T002 [P] [ROUTINE] Write scripts/capture-design.mjs: given a preview origin, an output dir and a prefix, seeds synthetic data through the UI (project "Ausbildung zum Industriekaufmann" with LLM fixture `src/llm/fixtures/valid-plain.txt`), and saves full-page screenshots of home (empty and with project) and "Lead prüfen" at 1280 px and 360 px (2x), for `?design=` unset and `guided` (FR-014)
- [ ] T003 [P] Capture before-screenshots from `main` into specs/002-visual-design/review/img/before-*.png with T002's script (FR-014)

---

## Phase 2: Foundational

- [ ] T004 Create src/ui/tokens.css per contracts/design-tokens.md with the "Waldgrün" palette and type/space/shape scales; import it before style.css in src/main.tsx; move the one remaining color literal (`#7a8b97`) of src/ui/style.css into a token (FR-001, FR-003)
- [ ] T005 [P] Add src/ui/tokens.test.ts: fails on `#hex`, `rgb(`, `rgba(`, `hsl(` in any src/ui/**/*.css except tokens.css; and checks the contrast pairs of contracts/design-tokens.md from the parsed token values (FR-001, FR-008, SC-006)
- [ ] T006 [P] Add e2e/design.spec.ts: for home (empty, with project) and "Lead prüfen" on both Playwright projects plus a 360 px context: axe WCAG 2.1 A/AA with zero violations of any impact; `scrollWidth <= innerWidth` at 360 px; `:focus-visible` outline contrast ≥ 3:1 against its background for the first tabbable controls; no foreign requests (existing guard). Run once for `?design=guided` too (FR-008–FR-010, SC-003–SC-005, SC-007)

**Checkpoint**: tokens and checks in place; existing suite still green.

---

## Phase 3: User Story 1 - Startseite und „Lead prüfen“ wirken ruhig und modern (Priority: P1) 🎯 C1 Spike

**Goal**: two complete directions for home and "Lead prüfen", desktop and 360 px.

**Riskiest assumption tested**: the new design can be built with CSS and
tokens only, without changing roles, labels, texts or behavior.

**Independent Test**: T006 plus the unchanged existing suite; screenshots of both directions.

- [ ] T007 [US1] Restyle src/ui/style.css as "Ruhig" for the shared shell (header, nav, footer, buttons, fields, cards, checklist, badges, stepper, notices, focus, forced-colors, reduced motion) and the home and "Lead prüfen" screens, tokens only (FR-001–FR-003, FR-005, FR-006, FR-008–FR-010, FR-012, FR-013)
- [ ] T008 [US1] Add src/ui/direction-guided.css scoped to `html[data-direction="guided"]` (stepper column with progress on desktop, compact bar on ≤ 40rem with visually hidden non-current labels, colored header) and the spike-only `?design=guided` switch in src/main.tsx (FR-004, FR-006, FR-010)
- [ ] T009 [US1] Design loop per screen (home, "Lead prüfen") × direction: capture → `design-critic` (.claude/agents/design-critic.md) → fix → `pnpm test` + `pnpm build && pnpm test:e2e e2e/design.spec.ts` → capture; max 3 rounds; log rounds and open nits in docs/STATUS.md (SC-008)
- [ ] T010 [US1] Capture after-screenshots for both directions into specs/002-visual-design/review/img/ (FR-014)

### C1 GATE

- [ ] T011 [GATE] C1 checkpoint (Spike, US1): run `pnpm verify`; confirm `git diff main -- src/domain src/storage src/ui/i18n` and the existing test files are unchanged (SC-001, SC-002); start the preview and confirm the URL responds for both directions; update docs/STATUS.md (checkpoint, spec IDs, commands and outcomes, URL and who can reach it, critic rounds, questions, next action) and the spec in the same commit; write the human gate page specs/002-visual-design/review/C1.md from docs/templates/gate-review.md with before/after screenshots (desktop and 360 px, both directions) and open nits; record the go/no-go result and evidence; commit; then **STOP** and wait for an explicit human decision. Do not start later phases until docs/STATUS.md records approval.

---

## Dependencies & Execution Order

- Setup (T001–T003) → Foundational (T004–T006) → US1 (T007–T010) → GATE T011.
- T002/T003 and T005/T006 may run in parallel; T003 needs T002.
- Never parallelize across the GATE.

## Implementation Strategy

Spike: build the smallest end-to-end proof (two screens, two directions), stop
at C1. After the owner picks a direction: delete the other layer and the
switch, add US2 (all screens) and US3 (lead list cards) with a Light C3 gate.
