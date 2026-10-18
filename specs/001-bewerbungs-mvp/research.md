# Research: Kandidu MVP (001-bewerbungs-mvp)

Date: 2026-10-18. Registry facts from `npm view <pkg> version license time.modified
dependencies` on that date. All choices are free/open-source (owner budget rule).

## R1. Storage: IndexedDB behind an async port

- **Decision**: IndexedDB (database `kandidu:data`, schema version 1) behind an
  asynchronous `KandiduStore` port in `src/storage/`, with the thin `idb` 8.0.4
  (ISC) promise wrapper. One object store per entity (`meta`, `profile`,
  `templates`, `documents`, `projects`, `leads`, `files`). Metadata is loaded and
  Zod-validated at startup; file bytes are loaded lazily by id. Files are stored as
  `ArrayBuffer` (structured-clone safe in every target browser and in
  `fake-indexeddb`). Recorded as ADR 008, superseding ADR 002 for product data.
- **Rationale**: Owner decision (2026-10-18). Files of up to 20 MB each exceed
  localStorage; IndexedDB gives transactions (atomic cascade deletes, atomic
  backup import) and binary storage.
- **Alternatives**: localStorage (too small, strings only); OPFS (good for files,
  but no transactions shared with metadata and uneven Firefox support for sync
  access handles); raw IndexedDB API (more boilerplate, same semantics as `idb`).
- **Multi-tab (FR-044)**: `meta.revision` counter incremented inside every write
  transaction; the store remembers the revision it last saw, and a write whose
  expected revision differs aborts with `StoreError("conflict")`. A
  `BroadcastChannel("kandidu:changes")` notifies other tabs to show a reload
  banner. Optimistic, no locking.
- **Durability (FR-042, FR-045)**: `navigator.storage.estimate()` for usage,
  `navigator.storage.persist()` on an explicit user action with explanation.
  Neither guarantees durability; the backup ZIP is the only real safeguard.
- **Testing**: `fake-indexeddb` 6.2.6 (Apache-2.0) in Vitest (Node) for adapter
  tests; Playwright exercises the real IndexedDB in Chromium.

## R2. DOCX templates: docxtemplater core + PizZip

- **Decision**: `docxtemplater` 3.71.1 (MIT, open-source core only) with `pizzip`
  3.3.0 (MIT OR GPL-3.0; used under MIT). Options: `paragraphLoop: true`,
  `linebreaks: true`, a custom parser that trims tag names, and a `nullGetter`
  returning `""`. A small own module on docxtemplater's public `set` hook collects
  the parsed tag tree for validation; the bundled `InspectModule` was dropped
  because it requires undeclared `lodash` at runtime (ADR 009).
- **Split runs**: docxtemplater joins text across `<w:r>`/`<w:t>` runs inside a
  paragraph before parsing, which is exactly the "Word splits `{Vorname}`" case.
  Our tests build DOCX fixtures whose tags are split across 2–4 runs with
  different formatting, and with a `w:proofErr` element between runs.
- **Validation pipeline** (`src/files/docx.ts`): (1) open ZIP, require
  `word/document.xml` else `docx-invalid`; (2) compile with the tag collector; a
  `TemplateError`/multi error is mapped per sub-error id (`unopened_tag`,
  `unclosed_tag`, `duplicate_open_tag`, `duplicate_close_tag`,
  `closing_tag_does_not_match_opening_tag`, `unclosed_loop`, `unopened_loop`,
  `unbalanced_loop_tags`, others → `syntax-other`) to typed issue codes with the
  offending tag text/context; (3) the domain checks the structured tag list
  against the placeholder catalog for the template type (unknown name, wrong
  template type, plain tag used as loop or vice versa, `Absatz` outside the
  `Motivation` block) and proposes the nearest known name (case-insensitive
  match or edit distance ≤ 2).
- **Rendering**: same options; data built by the pure domain (`letterData.ts`).
  Missing values are reported before download by intersecting used tags with
  empty data values (FR-025).
- **Demo templates**: generated at runtime from code (`src/files/demoTemplates.ts`)
  as minimal valid OOXML packages (`[Content_Types].xml`, `_rels/.rels`,
  `word/document.xml`, `word/styles.xml`), with the synthetic sample wording
  supplied by the i18n catalog. No binary files in the repository; unit tests
  reopen them and assert they validate cleanly.
- **Alternatives**: `docx-templates` (uses JS sandbox evaluation, broader attack
  surface); `easy-template-x` (smaller community); hand-rolled XML replacement
  (fails on split runs, which is the core risk).
- **Limitation**: No Word or LibreOffice is installed on the agent machine, so
  SC-002's "opens without repair prompt" is verified by the human at the gate;
  automated tests assert structural validity (ZIP opens, XML parses, tags gone).

## R3. PDF validation and merge: @cantoo/pdf-lib

- **Decision**: `@cantoo/pdf-lib` 2.11.1 (MIT, maintained fork of `pdf-lib`, last
  release 2026-09; deps `tslib`, `fflate`, `culori`, `node-html-better-parser`,
  peer `html-entities`). `PDFDocument.load` validates and counts pages; encrypted
  files raise `EncryptedPDFError` → `pdf-encrypted`; parse failures →
  `pdf-invalid`. Merge with `copyPages` into a fresh document, `save({
  useObjectStreams: true })`.
- **Rationale**: Upstream `pdf-lib` 1.17.1 has had no release since 2021-11;
  constitution VI prefers maintained libraries. The fork keeps the API.
- **Alternatives**: `pdf-lib` 1.17.1 (unmaintained); pdf.js (render/read only,
  no merge); qpdf-wasm (large WASM, licensing review). Fallback if the fork
  misbehaves: pin upstream `pdf-lib` 1.17.1 by ADR amendment (same API).
- **Performance (SC-005)**: proved in C1 with an e2e test in Chromium that uploads
  three generated PDFs (≈ 9 MB, 20 pages each, incompressible image streams) and
  composes one package; asserts page count 60 and < 30 s.
- **Loading cost**: PDF and DOCX modules are imported lazily (`import()`) from the
  UI so the first paint does not wait for them.

## R4. ZIP creation and reading: fflate

- **Decision**: `fflate` 0.8.3 (MIT) `zipSync`/`unzipSync`; PDF entries stored
  with `level: 0` (already compressed), JSON with default deflate. Used for package
  ZIPs and backup ZIPs. PizZip stays limited to DOCX internals.
- **Alternatives**: JSZip (slower, larger); PizZip for everything (synchronous,
  memory-heavy on big backups).

## R5. Tolerant LLM response parsing

- **Decision**: `src/llm/extract.ts` (pure string logic) produces JSON candidates
  in order: whole text; contents of each ``` fenced block (any language tag); each
  balanced top-level `{…}`/`[…]` span found by a string-aware bracket scanner.
  Each candidate is tried with `JSON.parse`, then with conservative repairs
  (remove trailing commas before `}`/`]`; replace typographic double quotes used
  as JSON delimiters). The first candidate whose root is an array of objects, an
  object with `leads`, or a single lead-like object wins. `src/llm/schema.ts`
  defines the Zod schema (non-strict: unknown keys stripped; `""`/`null` →
  absent); `z.toJSONSchema()` (Zod 4) renders the JSON Schema embedded in the
  prompt, so prompt and parser share one source of truth.
- **Errors**: `no-json-found`, `json-invalid` (with position), `schema-invalid`
  with per-entry issues `{ entry, path, kind: missing | wrong-type | invalid }`
  that the UI maps to German field labels. Motivation with > 2 paragraphs is a
  warning, not an error.
- **Never lose the paste (FR-020)**: the raw text is saved as a `Response`
  record before parsing; parsing results are stored on that record.
- **Limit**: pasted text up to 500 000 characters (larger → `response-too-large`).

## R6. Markdown rendering for research

- **Decision**: `react-markdown` 10.1.0 + `remark-gfm` 4.0.1 (MIT). Raw HTML is
  skipped, images are disallowed (no third-party requests, FR-039), links render
  with `target="_blank" rel="noopener noreferrer"`, default URL sanitizing keeps
  `javascript:` out. Editing is a plain textarea with a preview toggle.
- **Alternatives**: `marked` + `DOMPurify` (two libraries, manual sanitizing);
  rendering as plain text (loses source links' readability).

## R7. No network, CSP

- **Decision**: Production build injects a CSP meta tag via a small Vite plugin
  (`default-src 'self'; img-src 'self' data: blob:; connect-src 'self';
  object-src 'none'; base-uri 'none'; form-action 'none'`). Dev server stays
  without CSP (React refresh). A Playwright fixture fails any request whose host
  is not the preview server (SC-008).

## R8. Routing and UI state

- **Decision**: Tiny hash router in `src/ui/router.tsx` (`#/`, `#/einrichtung/…`,
  `#/projekte/:id/…`, `#/projekte/:id/leads/:id/…`). Works on GitHub Pages
  without server rewrites and needs no dependency. App state lives in a React
  context with a reducer; every mutation awaits the store and only then updates
  state (FR-040). Stepper is a shared accessible component (`<ol>` with
  `aria-current="step"`).
- **Alternatives**: React Router (dependency for ~6 routes); history API routing
  (needs 404 fallback tricks for deep links).

## R9. Accessibility checks

- **Decision**: `@axe-core/playwright` 4.14.0 (MPL-2.0, dev only) scans the main
  views in C2 (SC-009). Keyboard journey test drives US1 with keyboard only.

## R10. Source layout (new boundary folders)

- **Decision**: add `src/files/` (DOCX/PDF/ZIP format adapters wrapping the
  libraries above; may import `src/domain`, never UI or storage) and `src/llm/`
  (prompt schema and response parsing with Zod; same rules). Enforced by new
  dependency-cruiser rules. Recorded in ADR 009 with the library choices.
- **Rationale**: keeps `src/domain` pure while giving library-backed format code a
  testable home outside the UI; mirrors AGENTS.md "boundary parsing may use Zod
  outside the domain".

## R11. Text that ends up in documents and prompts

- **Decision**: All German wording that the user sees, including the LLM prompt
  text, demo template sample text, file-name words ("Anschreiben", "Lebenslauf",
  "Bewerbung"), letter salutations, and dates in letters, comes from the `de`
  catalog (constitution XII). The domain decides *which* variant applies (e.g.
  salutation kind `female | male | neutral`) and the catalog formats it.
  Placeholder names (`{Vorname}` …) are stable identifiers defined in the domain.
