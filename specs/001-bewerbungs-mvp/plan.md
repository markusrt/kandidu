# Implementation Plan: Kandidu – Bewerbungs-Assistent (MVP)

**Branch**: `001-bewerbungs-mvp` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-bewerbungs-mvp/spec.md`

## Summary

A browser-only React SPA that guides one person from personal data and Word
templates to a researched lead (via a copy/paste round trip with any external LLM),
filled DOCX letters, a deliberate PDF upload gate, and merged PDF packages
downloaded as ZIP, then tracks each lead's lifecycle. All data and files stay in
IndexedDB behind an async store port; DOCX filling uses the docxtemplater open-source
core, PDF validation/merge uses `@cantoo/pdf-lib`, ZIPs use `fflate`, and LLM
responses are extracted tolerantly and validated with Zod. Delivery follows the
owner's checkpoint plan: C1 proves one lead end to end (the three riskiest
assumptions), C2 adds breadth and recovery, C3 lifecycle and management.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node 24.21.0 for tooling (ADR 001)

**Primary Dependencies**: React 19.3, Vite 7.3, Zod 4.6 (existing); new runtime:
`docxtemplater` 3.71.1, `pizzip` 3.3.0, `@cantoo/pdf-lib` 2.11.1 (+ peer
`html-entities`), `fflate` 0.8.3, `idb` 8.0.4, `react-markdown` 10.1.0,
`remark-gfm` 4.0.1; new dev: `fake-indexeddb` 6.2.6, `@axe-core/playwright` 4.14.0
(C2). Rationale in [research.md](research.md), recorded in ADR 009.

**Storage**: IndexedDB `kandidu:data` v1 via `idb` (ADR 008, supersedes ADR 002 for
product data); layout in [data-model.md](data-model.md).

**Testing**: Vitest 4 (Node; `fake-indexeddb` for the adapter; DOCX/PDF/ZIP
fixtures generated in tests), Playwright (Desktop Chrome + Pixel 7) for journeys,
downloads and uploads; axe in C2.

**Target Platform**: current Chrome, Edge, Firefox on desktop; mobile browsers for
overview/status/comments. Static hosting (GitHub Pages per ship mode).

**Project Type**: single-page web application (single project).

**Performance Goals**: package of ≥ 25 MB / 60 pages ready in < 30 s (SC-005);
US1 completable in ≤ 15 min (SC-001); PDF/DOCX code lazy-loaded so first paint does
not wait for it.

**Constraints**: no network calls with user data, no telemetry, no runtime external
resources (CSP in production); uploads ≤ 20 MB PDF / ≤ 10 MB DOCX; quota warning at
80 %; never show "saved" before commit; German UI from catalog; synthetic data only.

**Scale/Scope**: one user; dozens of projects, hundreds of leads, a few hundred MB
of files at most (browser quota bound); ~16 routes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence in this plan |
| --- | --- | --- |
| I. Learn before building | Pass | US1/C1 targets the three named risks (DOCX filling + errors, LLM parsing, PDF/ZIP/IndexedDB at size) before breadth. |
| II. Do not invent the domain | Pass | Clarifications recorded 2026-10-18; remaining assumptions listed in spec; placeholder names/prompt wording are reviewable at C1. |
| III. Local first, deliberately | Pass | IndexedDB behind async port; durability limits stated (ADR 008, FR-045); backup ZIP in C2. |
| IV. Honest, simple boundaries | Pass | Pure `src/domain`; Zod at storage/LLM boundaries; libraries only in `src/files`, `src/llm`, `src/storage`; new dependency-cruiser rules. |
| V. Usable experience | Pass | Stepper, labels, live regions, keyboard and 360 px checks planned (C1 baseline, C2 full proof). |
| VI. Compatible, maintained stack | Pass | ADR 001 stack unchanged; added libraries checked for license/maintenance on 2026-10-18; maintained `pdf-lib` fork chosen (ADR 009). |
| VII. Protect people and credentials | Pass | No PII in prompt by default, synthetic fixtures, no network, CSP, delete cascades remove files. |
| VIII. Tests mandatory | Pass | Every story phase has unit + e2e tasks; failure paths enumerated in contracts. |
| IX. One truth | Pass | Single spec with stable IDs; STATUS updated at each gate. |
| X. Complete slices | Pass | C1: one checkpoint slice commit. From C2: one commit per finished user story plus the gate commit (AGENTS.md "Owner working rules"). |
| XI. Human control | Pass | C1–C3 GATE tasks; ship mode asked at first approved gate; branch local only. |
| XII. Language | Pass | Spec de-DE; technical docs English; all UI/prompt/document wording in `src/ui/i18n/de.ts`. |

Post-design re-check (after Phase 1): unchanged, all pass. The new `src/files` and
`src/llm` folders and IndexedDB are recorded decisions (ADR 008 owner-decided, ADR 009
library/layout choice within ADR 001's stack), not departures needing new approval;
both are called out in the C1 handoff for review.

## Project Structure

### Documentation (this feature)

```text
specs/001-bewerbungs-mvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── placeholders.md
│   ├── llm-response.md
│   ├── storage-port.md
│   ├── backup-format.md
│   └── ui-routes.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── domain/                  # pure TS, no imports outside src/domain
│   ├── profile.ts           # Profile type + validation codes
│   ├── placeholders.ts      # catalog, template tag checks, suggestions
│   ├── letterData.ts        # CV / cover letter data, salutation kind, missing values
│   ├── motivation.ts        # paragraph split / limit
│   ├── project.ts           # project, links, prompt state
│   ├── lead.ts              # lead creation from drafts, edits, review lock
│   ├── lifecycle.ts         # status machine, gate, undo (C1: review→ready)
│   ├── packages.ts          # package defs, defaults, unique file names
│   ├── fileNames.ts         # safe file-name parts, date prefix
│   └── tags.ts              # predefined tags, normalize, suggest (C2)
├── llm/                     # boundary: Zod schema, JSON Schema, extraction, parse
│   ├── schema.ts
│   ├── extract.ts
│   ├── parse.ts
│   └── fixtures/            # synthetic response corpus (*.txt)
├── files/                   # boundary: format adapters around libraries
│   ├── errors.ts            # FileError codes
│   ├── docx.ts              # inspect + validate + render (docxtemplater/pizzip)
│   ├── demoTemplates.ts     # runtime-generated demo DOCX
│   ├── pdf.ts               # validate, page count, merge (@cantoo/pdf-lib)
│   ├── zip.ts               # zip/unzip (fflate)
│   └── testing/             # fixture builders for tests (docx with split runs, pdfs)
├── storage/
│   ├── port.ts              # KandiduStore, StoreError, AppSnapshot
│   ├── schema.ts            # Zod schemas for persisted records
│   ├── indexeddb.ts         # adapter (idb)
│   └── backup.ts            # C2 export/import
├── ui/
│   ├── App.tsx, router.tsx, state.tsx (context + reducer), Stepper.tsx, Markdown.tsx
│   ├── setup/ (ProfileStep, TemplatesStep, CvStep, EvidenceStep), PlaceholderHelp.tsx
│   ├── project/ (LinksStep, PromptStep, ResponseStep, LeadList)
│   ├── lead/ (ReviewStep, CoverLetterStep, GateStep, PackageStep, HistoryView)
│   ├── data/DataView.tsx    # C2
│   ├── download.ts          # Blob download helper
│   ├── i18n/ (messages.ts, de.ts, index.tsx)
│   └── style.css
└── main.tsx                 # composes IndexedDB store, locale de-DE

e2e/
├── fixtures.ts              # network guard, synthetic files, helpers
├── c1-lead-journey.spec.ts
├── c1-package-size.spec.ts
├── c2-*.spec.ts
└── c3-*.spec.ts
```

**Structure Decision**: single Vite SPA as in the starter. Starter demo code
(`src/domain/items.ts`, `src/storage/browser.ts`, demo `App.tsx`, `en` catalog,
`e2e/demo.spec.ts`) is removed in Setup; its recovery semantics (read error blocks
writes, retry/confirmed reset, saved-only-after-success) carry over into the new
store and UI. dependency-cruiser gains: `files-and-llm-are-boundaries` (no imports of
`src/ui`, `src/storage`, `src/main`), `storage-no-files-ui` (storage may import
`src/files/zip` for backup only), existing rules unchanged. Vitest `include` widens
to `src/**/*.test.ts`. `index.html` gets `lang="de"` and title "Kandidu"; the
production CSP is injected by a Vite plugin in `vite.config.ts`.

## Complexity Tracking

No constitution violations to justify.
