# ADR 009: Browser document libraries and boundary folders

Status: accepted for 001-bewerbungs-mvp on 2026-10-18 (planning decision within the
ADR 001 stack and the owner's budget rule "only open-source, docxtemplater core
without paid modules"). Highlighted for owner review at the C1 gate.

## Context

Kandidu fills user-edited Word templates, validates and merges PDFs, builds ZIPs, and
renders LLM-written Markdown, all inside the browser. ADR 001 fixes the core stack
but not these libraries. The pure domain must stay free of them.

## Decision

Runtime dependencies (versions checked with `npm view` on 2026-10-18):

| Purpose | Package | License | Why |
| --- | --- | --- | --- |
| DOCX templates | `docxtemplater` 3.71.1 + `pizzip` 3.3.0 | MIT; MIT OR GPL-3.0 (used as MIT) | Handles tags split across Word runs; typed error ids. No paid modules. |
| PDF validate/merge | `@cantoo/pdf-lib` 2.11.1 (+ peer `html-entities`) | MIT | Maintained fork of `pdf-lib` (upstream unreleased since 2021-11), same API. |
| ZIP | `fflate` 0.8.3 | MIT | Fast, small, sync API for packages and backups. |
| IndexedDB | `idb` 8.0.4 | ISC | Thin promise wrapper (ADR 008). |
| Markdown | `react-markdown` 10.1.0 + `remark-gfm` 4.0.1 | MIT | Safe by default (no raw HTML); images disabled to avoid third-party requests. |

Dev dependencies: `fake-indexeddb` 6.2.6 (Apache-2.0), `@axe-core/playwright`
4.14.0 (MPL-2.0, test-only).

Source layout additions:

- `src/files/`: DOCX/PDF/ZIP format adapters around those libraries; typed
  `FileError` codes; may import `src/domain`; never `src/ui`, `src/storage`, or
  `src/main`.
- `src/llm/`: Zod response schema, JSON Schema generation for the prompt, tolerant
  extraction and parsing; same import rules.
- dependency-cruiser enforces both rules; `src/domain` stays pure. `src/storage` may
  import `src/files/zip` for backups.
- PDF and DOCX modules are imported lazily from the UI.

## Consequences

The bundle grows (PDF library is the largest part); lazy loading keeps first paint
fast. The `@cantoo/pdf-lib` fork pulls `culori` and `node-html-better-parser` we do
not use. If the fork regresses, fall back to upstream `pdf-lib` 1.17.1 (same API)
by amending this ADR. `pizzip` is dual-licensed; we rely on its MIT option.
The bundled `docxtemplater/js/inspect-module.js` requires `lodash` at runtime
although docxtemplater lists it only as a devDependency (found 2026-10-18, 3.71.1).
Instead of adding lodash, `src/files/docx.ts` collects the parsed tag tree with a
12-line module on the public `set` hook. docxtemplater error ids are not a formal API: unknown ids map to a generic
`syntax-other` issue and tests pin the ids we rely on, so an upgrade that changes
them fails visibly. Run `pnpm audit` when adding or upgrading these packages.
