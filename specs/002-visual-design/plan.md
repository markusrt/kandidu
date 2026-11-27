# Implementation Plan: Kandidu – Visual design (calmer and more modern)

**Branch**: `002-visual-design` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-visual-design/spec.md`

**Delivery Mode**: **Spike (C1), then Light (C3)** — the central question
(which direction, "Ruhig" or "Geführt", fits Kandidu) has an open outcome and is
decided by the owner from screenshots; once decided, the work extends a proven
workflow without behavior change, so the remaining screens fit one Light gate.
Owner expectation stated in the brief (2026-11-27). Per the constitution, the
Light phase is added by `/speckit-tasks` after the C1 decision.

## Summary

Restyle the existing React UI with design tokens, the self-hosted webfont
"Atkinson Hyperlegible Next" and the "Waldgrün" palette, without touching
behavior, text, roles, data, `src/domain` or `src/storage`. The spike builds two
complete directions for the home page and "Lead prüfen" as CSS layers on the
same markup, shows them on a C1 gate page with before/after screenshots
(desktop and 360 px), and stops. After the owner's choice, the losing layer is
removed and the chosen direction is rolled out to all screens (US2) and the
lead list cards (US3) under one Light gate.

## Technical Context

**Language/Version**: TypeScript 5.9 strict, React 19, CSS (no preprocessor)

**Primary Dependencies**: existing stack (ADR 001). New runtime dependency:
`@fontsource/atkinson-hyperlegible-next` (OFL-1.1, self-hosted WOFF2, latin
subset, weights 400 and 700) — [ADR 011](../../docs/adr/011-self-hosted-webfont.md)

**Storage**: unchanged (IndexedDB adapter, ADR 008); not touched

**Testing**: Vitest (token lint test), Playwright + axe (new design spec file);
all existing tests stay byte-identical (SC-001)

**Target Platform**: current Chromium, Firefox, Safari; desktop and phones ≥ 360 px

**Project Type**: single-page web app (Vite)

**Performance Goals**: font adds ≤ 30 KB (two latin WOFF2 files ≈ 25 KB);
`font-display: swap` so text renders immediately

**Constraints**: no foreign-origin requests (existing E2E network guard,
SC-007); no changes to `src/ui/i18n` texts, roles, accessible names, heading
levels, focus order (FR-005, FR-006); WCAG 2.1 AA (FR-008)

**Scale/Scope**: one stylesheet (`src/ui/style.css`, 586 lines, already
variable-based) plus a new token file; about 15 screens; markup changes only
where CSS cannot reach (none planned for the spike)

## Constitution Check

| Principle | Check | Result |
| --- | --- | --- |
| I Learn before building | Spike settles the direction on the two most-seen screens before rolling out | Pass |
| II Do not invent the domain | Goals, palette, font, table treatment confirmed in Clarifications 2026-11-27 | Pass |
| III Local first | Font self-hosted; no network; storage untouched | Pass |
| IV Boundaries | Only `src/ui`, `src/main.tsx` (font import), tests, docs; depcruise unchanged | Pass |
| V Usable | Contrast, focus, 360 px, forced colors, reduced motion are FRs with tests | Pass |
| VI Stack | One new font package, ADR 011 | Pass (ADR) |
| VII People | No data or credentials involved | Pass |
| VIII Tests | New e2e design spec + token lint test; existing tests unchanged | Pass |
| IX One truth | Spec, plan, tasks, STATUS updated together | Pass |
| X Slices | Spike = one commit after planning; later one commit per story | Pass |
| XI Human control | C1 gate stop; direction chosen by owner | Pass |
| XII Language | No new strings; German spec, English plan | Pass |

Post-design re-check: unchanged, pass.

## Design approach (from research.md)

1. **Tokens** — new `src/ui/tokens.css` holds every color, font, size, space,
   radius, border, shadow and focus value as custom properties on `:root`.
   `src/ui/style.css` uses only `var(--…)` (SC-006, enforced by
   `src/ui/tokens.test.ts`, which fails on any hex/rgb/hsl literal outside
   `tokens.css`).
2. **Directions** — "Ruhig" is the default style in `style.css`. "Geführt" is a
   layer `src/ui/direction-guided.css` scoped to `html[data-direction="guided"]`.
   Spike-only switch: `src/main.tsx` sets `data-direction` from the query
   parameter `?design=guided` (no storage, no UI text). After C1 the losing
   layer and the switch are deleted.
3. **"Geführt" layout** — CSS grid on `main:has(> .stepper)`; the stepper
   becomes a left column with a progress bar from `.stepper li.done/.current`;
   at ≤ 40rem a compact bar whose non-current labels are visually hidden
   (clip pattern), so accessible names stay.
4. **Lead table (US3, after C1)** — at ≤ 40rem each `tr` becomes a card via
   CSS grid; cells keep their order. Risk: changing `display` on table elements
   can drop table semantics in some engines; the e2e test asserts table, column
   header and cell roles at 360 px. Whether cells need a visible column name
   (which would need markup such as `data-label`) is decided in the Light phase.
5. **Contrast** — palette values checked with a script (research.md table);
   form field borders get `--border-strong` ≥ 3:1.
6. **Focus** — keep the global `:focus-visible` outline, recolor to a token
   with ≥ 3:1 against paper and page; forced-colors uses `Highlight`.

## Design critique loop (owner step 4)

Per screen (spike: home, lead review; both directions; desktop and 360 px):
screenshots → read-only `design-critic` subagent
([.claude/agents/design-critic.md](../../.claude/agents/design-critic.md),
pattern of `speckit-reviewer`) returns findings ranked blocker / should-fix /
nit → implement → tests → new screenshots. At most 3 rounds per screen; stop
when no blocker or should-fix is open. Open nits go on the gate page. Each
round's findings and resolution are logged in STATUS.

In Amp (this session) the critic runs as a Task subagent with the same
instructions; `pnpm models:check` reads Claude Code transcripts only and is
recorded as not applicable.

## Project Structure

### Documentation (this feature)

```text
specs/002-visual-design/
├── plan.md
├── research.md
├── data-model.md        # no data changes; token model
├── quickstart.md
├── contracts/design-tokens.md
├── checklists/requirements.md
├── review/C1.md         # gate page with screenshots (spike)
├── review/img/          # before/after screenshots
└── tasks.md
```

### Source Code (repository root)

```text
src/main.tsx                     # font import; spike-only direction switch
src/ui/tokens.css                # NEW design tokens
src/ui/tokens.test.ts            # NEW no color literal outside tokens.css
src/ui/style.css                 # restyled, "Ruhig" default
src/ui/direction-guided.css      # NEW spike-only "Geführt" layer
e2e/design.spec.ts               # NEW axe (all impacts), 360 px, focus contrast
scripts/capture-design.mjs       # NEW screenshot capture for gate pages (needs a running preview)
.claude/agents/design-critic.md  # NEW read-only critic
docs/adr/011-self-hosted-webfont.md
```

**Structure Decision**: single web app as today; no new layer, no change to
dependency-cruiser rules.

## Complexity Tracking

None.
