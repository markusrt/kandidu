# Tasks: Kandidu – Visual design (calmer and more modern)

**Input**: Design documents from `/specs/002-visual-design/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/design-tokens.md

**Tests**: MANDATORY (constitution VIII). Existing unit and E2E test files stay
unchanged (SC-001); new checks go into new files.

**Delivery Mode**: Spike (C1), then Light (C3). C1 accepted on 2026-11-27 with
Go for "Geführt" (docs/STATUS.md); Phases 4–7 below are the Light phase.

## Format: `[ID] [P?] [Story] [ROUTINE?] Description`

---

## Phase 1: Setup

- [x] T001 Add `@fontsource/atkinson-hyperlegible-next` 5.3.0 (exact version) with `pnpm add`, import the latin 400 and 700 CSS in src/main.tsx; confirm the built `dist/` contains only those WOFF2 files and no foreign URL (FR-002, SC-007, ADR 011)
- [x] T002 [P] [ROUTINE] Write scripts/capture-design.mjs: given a preview origin, an output dir and a prefix, seeds synthetic data through the UI (project "Ausbildung zum Industriekaufmann" with LLM fixture `src/llm/fixtures/valid-plain.txt`), and saves full-page screenshots of home (empty and with project) and "Lead prüfen" at 1280 px and 360 px (2x), for `?design=` unset and `guided` (FR-014)
- [x] T003 [P] Capture before-screenshots from `main` into specs/002-visual-design/review/img/before-*.png with T002's script (FR-014)

---

## Phase 2: Foundational

- [x] T004 Create src/ui/tokens.css per contracts/design-tokens.md with the "Waldgrün" palette and type/space/shape scales; import it before style.css in src/main.tsx; move the one remaining color literal (`#7a8b97`) of src/ui/style.css into a token (FR-001, FR-003)
- [x] T005 [P] Add src/ui/tokens.test.ts: fails on `#hex`, `rgb(`, `rgba(`, `hsl(` in any src/ui/**/*.css except tokens.css; and checks the contrast pairs of contracts/design-tokens.md from the parsed token values (FR-001, FR-008, SC-006)
- [x] T006 [P] Add e2e/design.spec.ts: for home (empty, with project) and "Lead prüfen" on both Playwright projects plus a 360 px context: axe WCAG 2.1 A/AA with zero violations of any impact; `scrollWidth <= innerWidth` at 360 px; `:focus-visible` outline contrast ≥ 3:1 against its background for the first tabbable controls; no foreign requests (existing guard). Run once for `?design=guided` too (FR-008–FR-010, SC-003–SC-005, SC-007)

**Checkpoint**: tokens and checks in place; existing suite still green.

---

## Phase 3: User Story 1 - Startseite und „Lead prüfen“ wirken ruhig und modern (Priority: P1) 🎯 C1 Spike

**Goal**: two complete directions for home and "Lead prüfen", desktop and 360 px.

**Riskiest assumption tested**: the new design can be built with CSS and
tokens only, without changing roles, labels, texts or behavior.

**Independent Test**: T006 plus the unchanged existing suite; screenshots of both directions.

- [x] T007 [US1] Restyle src/ui/style.css as "Ruhig" for the shared shell (header, nav, footer, buttons, fields, cards, checklist, badges, stepper, notices, focus, forced-colors, reduced motion) and the home and "Lead prüfen" screens, tokens only (FR-001–FR-003, FR-005, FR-006, FR-008–FR-010, FR-012, FR-013)
- [x] T008 [US1] Add src/ui/direction-guided.css scoped to `html[data-direction="guided"]` (stepper column with progress on desktop, compact bar on ≤ 40rem with visually hidden non-current labels, colored header) and the spike-only `?design=guided` switch in src/main.tsx (FR-004, FR-006, FR-010)
- [x] T009 [US1] Design loop per screen (home, "Lead prüfen") × direction: capture → `design-critic` (.claude/agents/design-critic.md) → fix → `pnpm test` + `pnpm build && pnpm test:e2e e2e/design.spec.ts` → capture; max 3 rounds; log rounds and open nits in docs/STATUS.md (SC-008)
- [x] T010 [US1] Capture after-screenshots for both directions into specs/002-visual-design/review/img/ (FR-014)

### C1 GATE

- [x] T011 [GATE] C1 checkpoint (Spike, US1): run `pnpm verify`; confirm `git diff main -- src/domain src/storage src/ui/i18n` and the existing test files are unchanged (SC-001, SC-002); start the preview and confirm the URL responds for both directions; update docs/STATUS.md (checkpoint, spec IDs, commands and outcomes, URL and who can reach it, critic rounds, questions, next action) and the spec in the same commit; write the human gate page specs/002-visual-design/review/C1.md from docs/templates/gate-review.md with before/after screenshots (desktop and 360 px, both directions) and open nits; record the go/no-go result and evidence; commit; then **STOP** and wait for an explicit human decision. Do not start later phases until docs/STATUS.md records approval.

---

## Phase 4: Apply the C1 decision (blocks US2 and US3)

- [x] T012 Make "Geführt" the default: move the rules of src/ui/direction-guided.css into src/ui/style.css without the `html[data-direction="guided"]` scope, delete direction-guided.css, its import and the `?design=` switch in src/main.tsx; reduce e2e/design.spec.ts and scripts/capture-design.mjs to the one direction (FR-004)
- [x] T013 Status chip tokens: add `--status-open`, `--status-open-soft`, `--status-done`, `--status-done-soft` to src/ui/tokens.css in colors that harmonize with Waldgrün; use them for `.checklist strong` and `.badge`; add their pairs (≥ 4.5:1) to src/ui/tokens.test.ts; render 2–3 chip variants for the owner on the C3 gate page with the chosen one marked (FR-015, FR-008, FR-012)
- [x] T014 Verify: `pnpm test`, `pnpm build && pnpm test:e2e e2e/design.spec.ts`; design-critic round on home and "Lead prüfen" (max 3 rounds, SC-008); commit

---

## Phase 5: User Story 2 - Alle übrigen Bildschirme folgen der gewählten Richtung (Priority: P2)

**Goal**: every screen uses the tokens and the "Geführt" style.

**Independent Test**: e2e/design.spec.ts covers every main screen at default width and 360 px; the existing suite stays unchanged and green.

- [x] T015 [US2] Extend e2e/design.spec.ts to every main screen: setup (profil, vorlagen, lebenslauf, nachweise), Platzhalter, Daten, project steps (links, prompt, antwort, leads), lead steps (anschreiben, freigabe, paket, verlauf) with a released lead, and "Seite nicht gefunden"; axe zero findings, no horizontal scroll at 360 px, visible focus (SC-003–SC-005)
- [x] T016 [US2] Restyle the setup screens and the tag input, the file fields and the document list (src/ui/style.css only) (FR-001, FR-005, FR-006, FR-010)
- [x] T017 [US2] Restyle Platzhalter (table, examples), Daten (backup/import, confirmations), "Seite nicht gefunden", the storage and failure banners and the recovery card (FR-001, FR-012)
- [x] T018 [US2] Restyle the project steps (links list, prompt text, response and issues) and the remaining lead steps (cover letter, gate, package editor, history and comments, Markdown preview) (FR-001, FR-012)
- [x] T019 [US2] Extend scripts/capture-design.mjs to all screens (before from `main`, after from the branch); design-critic loop per screen group (setup, info pages, project, lead), max 3 rounds, open nits to STATUS (SC-008, FR-014); commit US2

---

## Phase 6: User Story 3 - Lead-Liste ist auf schmalen Bildschirmen gut lesbar (Priority: P3)

**Goal**: lead list as cards on narrow widths, no mid-word breaks on desktop.

**Independent Test**: project with three leads at 360 px and desktop; roles checked in e2e.

- [x] T020 [US3] Add to e2e/design.spec.ts: at 360 px the lead list keeps the roles table, columnheader (names unchanged) and cell; no horizontal scroll; on desktop no column header and no button wraps inside a word (FR-011, SC-004)
- [x] T021 [US3] Restyle the narrow-width lead cards in src/ui/style.css (card surface, column name from the existing `data-label`, status as chip, actions row) (FR-011, FR-015)
- [x] T022 [US3] design-critic loop for the lead list (desktop and 360 px, 1 and 3 leads), max 3 rounds; commit US3

---

## Phase 7: Polish & Acceptance (C3)

- [x] T023 [P] Rendered checks for the edge cases: forced colors (`page.emulateMedia({ forcedColors: "active" })`), reduced motion, 200 % zoom and WCAG 1.4.12 text spacing on home and "Lead prüfen", webfont blocked → system font; add to e2e/design.spec.ts where stable (FR-002, FR-013)
- [x] T024 [P] Update quickstart.md, README (screenshots command) and the design-tokens contract to the final token set
- [x] T025 [GATE] C3 checkpoint (Light, US1–US3): run `pnpm verify`; confirm `git diff main -- src/domain src/storage src/ui/i18n` and the existing test files are unchanged (SC-001, SC-002); start the preview and confirm the URL responds; update docs/STATUS.md (checkpoint, spec IDs, commands and outcomes, URL and who can reach it, critic rounds, questions, next action) and the spec in the same commit; write the human gate page specs/002-visual-design/review/C3.md from docs/templates/gate-review.md with before/after screenshots of every restyled screen (desktop and 360 px), the status chip variants and open nits; commit; then **STOP** and request explicit acceptance. Never mark accepted without a recorded human decision.

### C3 feedback (2026-11-27)

- [x] T026 Show every step name in the stepper on narrow screens (wrapped row instead of numbers only), keep the current step's surface; e2e: at 360 px each stepper link's visible text contains its accessible name (FR-010, FR-006, WCAG 2.5.3)

---

## Dependencies & Execution Order

- Setup (T001–T003) → Foundational (T004–T006) → US1 (T007–T010) → GATE T011.
- T011 approved → Phase 4 (T012–T014) → US2 (T015–T019) → US3 (T020–T022) → Polish (T023–T024) → GATE T025.
- One story at a time, each committed before the next (AGENTS.md).
- T002/T003 and T005/T006 may run in parallel; T003 needs T002.
- Never parallelize across the GATE.

## Implementation Strategy

Spike: build the smallest end-to-end proof (two screens, two directions), stop
at C1. After the owner picks a direction: delete the other layer and the
switch, add US2 (all screens) and US3 (lead list cards) with a Light C3 gate.
