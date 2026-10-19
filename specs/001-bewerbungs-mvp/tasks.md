---

description: "Tasks for 001-bewerbungs-mvp (Kandidu MVP), generated from the mvp-starter tasks override"
---

# Tasks: Kandidu – Bewerbungs-Assistent (MVP)

**Input**: Design documents from `/specs/001-bewerbungs-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: MANDATORY (constitution VIII). Every story phase includes unit tests for
domain/boundary behavior and failure paths, plus Playwright coverage for the
user journey. Tests are written alongside the code they prove, never deferred.

**Organization**: Tasks are grouped by user story. Story phases are grouped into
delivery checkpoints (C1–C3). Each checkpoint ends with a **GATE** task: the
implementing agent MUST stop there and wait for an explicit human decision recorded
in `docs/STATUS.md`.

## Format: `[ID] [P?] [Story] [ROUTINE?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US7)
- **[ROUTINE]**: Fully specified by plan.md, contracts and the task text, so it may be
  delegated to `speckit-implementer` (AGENTS.md, Model routing). Everything shaping
  domain rules, schemas, boundaries, privacy, the core risks, or cross-cutting
  structure is untagged, as is every GATE task.
- **Covers**: from C2 on, every task ends with the spec IDs it implements or proves
  (`Covers: FR-…, SC-…`), so gaps between spec and tasks are visible (added
  2026-10-19 after FR-012 link editing and FR-028 CV deletion had no task). C1
  tasks list their IDs in the phase goal.
- New tasks get the next free ID (T071 …) and are placed in the phase they belong
  to; existing IDs are never renumbered.

## Path Conventions

- `src/domain/`: pure TypeScript; unit tests beside code (`*.test.ts`)
- `src/llm/`, `src/files/`: boundary code around Zod and document libraries (ADR 009)
- `src/storage/`: async store port, Zod schemas, IndexedDB adapter (ADR 008)
- `src/ui/`: React; `src/ui/i18n/de.ts` holds every user-facing string, including
  prompt, demo template, file-name and letter wording (research R11)
- `e2e/`: Playwright journeys (Desktop Chrome and Pixel 7); test titles start with
  the checkpoint (`C1 …`, `C2 …`, `C3 …`) so `pnpm test:e2e -g C1` selects them

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Adapt the starter skeleton; do not regenerate tooling

- [X] T001 [ROUTINE] Rename the product: `"name": "kandidu"` in package.json; in index.html set `<html lang="de">` and `<title>Kandidu</title>`; replace the README.md title line and first paragraph with a short Kandidu description that links spec/STATUS (keep all other README sections).
- [X] T002 Add dependencies with exact versions (research.md, ADR 009): `pnpm add docxtemplater@3.71.1 pizzip@3.3.0 @cantoo/pdf-lib@2.11.1 html-entities fflate@0.8.3 idb@8.0.4 react-markdown@10.1.0 remark-gfm@4.0.1` and `pnpm add -D fake-indexeddb@6.2.6`; pin `html-entities` to the resolved exact version; run `pnpm audit` and record the outcome for STATUS.
- [X] T003 Remove the starter demo: delete src/domain/items.ts, src/domain/items.test.ts, src/storage/browser.ts, src/storage/browser.test.ts, e2e/demo.spec.ts and the demo UI in src/ui/App.tsx; keep its recovery semantics as the reference for T009/T011.
- [X] T004 Make de-DE the default locale: replace src/ui/i18n/en.ts with src/ui/i18n/de.ts, restructure src/ui/i18n/messages.ts into typed sections (`common`, `nav`, `setup`, `templates`, `placeholders`, `project`, `prompt`, `response`, `lead`, `gate`, `package`, `files`, `errors`), set `defaultLocale = "de"` in src/ui/i18n/index.tsx, map every error code from data-model.md "Error codes" in `errorMessage`, and update src/ui/i18n/index.test.ts (every code has a non-empty message; unknown error → generic text).
- [X] T005 Architecture and build guards: add dependency-cruiser rules in .dependency-cruiser.cjs (`src/files` and `src/llm` must not import `src/ui`, `src/storage`, `src/main`; `src/storage` may import only `src/files/zip.ts` and `src/files/errors.ts` from `src/files`); add a build-only Vite plugin in vite.config.ts that injects the CSP meta tag from research R7; keep Vitest `include: ["src/**/*.test.ts"]`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain types, store port, IndexedDB adapter, UI shell

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Define domain entity types from data-model.md in src/domain/profile.ts, src/domain/project.ts, src/domain/lead.ts (types only for project/lead here) and implement `validateProfile` in src/domain/profile.ts returning `{ field, code: "required" | "too-long" | "invalid-format" }[]` with the rules verbatim from data-model.md (firstName/lastName "required, trimmed, 1–80"; street "required, 1–120"; postalCode "required, 4–10, `[0-9A-Za-z -]`"; city "required, 1–80"; phone "required, 3–40, digits, spaces, `+()/-`"; email "basic `local@domain.tld` check, ≤ 254"; birthDate "optional, valid past date"; birthPlace/nationality "optional, ≤ 80"; website "optional, http(s) URL"); tests in src/domain/profile.test.ts.
- [X] T007 Define the store port in src/storage/port.ts exactly as contracts/storage-port.md (`KandiduStore`, `AppSnapshot`, `StoreError` with codes `read-failed`, `data-invalid`, `save-failed`, `quota-exceeded`, `conflict`, `file-missing`, `delete-failed`, `unsupported-version`); C1 adapters may throw `save-failed` for C2-only methods (`exportBackup`, `importBackup`, `deleteDocument`, `deleteLead`, `deleteProject`) until their story implements them.
- [X] T008 Zod schemas for every persisted record in src/storage/schema.ts (meta, profile, templates, documents, projects incl. responses, leads incl. history/comments/packages) mirroring data-model.md limits; tests in src/storage/schema.test.ts for valid records, each limit, unknown status, duplicate ids.
- [X] T009 IndexedDB adapter in src/storage/indexeddb.ts (`createIndexedDbStore(dbFactory = indexedDB)`, database `kandidu:data` v1, stores per data-model.md, `meta.revision` incremented in every write transaction, file bytes as ArrayBuffer in the same transaction as metadata, `QuotaExceededError` → `quota-exceeded`) for `load`, `readFile`, `saveProfile`, `saveTemplate`, `deleteTemplate`, `saveDocument`, `saveProject`, `saveLeads`, `saveLeadFile`, `resetAll`, `storageEstimate`, `requestPersistence`; tests in src/storage/indexeddb.test.ts with `fake-indexeddb`: empty load, round trip, corrupt record → `data-invalid`, newer schemaVersion → `unsupported-version`, open failure → `read-failed`, writes rejected after a failed load until a successful load or reset, write failure leaves previous data, missing file → `file-missing`.
- [X] T010 [P] [ROUTINE] File basics: src/files/errors.ts (`FileError` with codes `file-too-large`, `docx-invalid`, `pdf-invalid`, `pdf-encrypted`, `render-failed`, `zip-failed`; constants `MAX_PDF_BYTES = 20 * 1024 * 1024`, `MAX_DOCX_BYTES = 10 * 1024 * 1024`; `assertSize(bytes, max)`), src/ui/download.ts (`downloadBytes(bytes, fileName, mimeType)` via Blob + object URL, revoked after click), tests in src/files/errors.test.ts.
- [X] T011 UI shell: src/ui/state.tsx (context + reducer holding `AppSnapshot`, load on start, recovery view on load failure with retry and confirmed reset of only `kandidu:data`, every mutation awaits the store before updating state, polite live region for status and `role="alert"` for errors), src/ui/router.tsx (hash router for contracts/ui-routes.md, not-found view, focus moves to `<h1>` on route change), src/ui/Stepper.tsx (`<ol>` with `aria-current="step"`), src/ui/App.tsx (header with app name, nav: Start, Einrichtung, Platzhalter), base layout in src/ui/style.css (calm, readable, responsive down to 360 px), src/main.tsx composing `createIndexedDbStore()` and locale `de`.
- [X] T012 E2E infrastructure in e2e/fixtures.ts: extended `test` fixture that fails on any request to a host other than 127.0.0.1:4173 (SC-008); helpers to build synthetic PDFs (n pages, optional large incompressible image stream, encrypted variant) with `@cantoo/pdf-lib`, and to read downloads (DOCX text via pizzip, ZIP entries via fflate, PDF page counts). DOCX template builders are added to this file in T015.

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Ein Lead durchgängig vom Profil bis zum ZIP (Priority: P1) 🎯 C1 Risky core

**Goal**: One lead from empty app to downloaded ZIP with synthetic data (FR-001–FR-008, FR-012–FR-014, FR-016–FR-020, FR-022–FR-032, FR-039–FR-041, FR-046–FR-048 baseline).

**Riskiest assumption tested**: (1) docxtemplater fills user-edited Word templates (split runs) and explains placeholder errors; (2) arbitrary LLM answers are extracted and validated robustly without losing the paste; (3) storing and merging PDFs and building a ZIP in the browser with IndexedDB works at realistic sizes.

**Independent Test**: quickstart.md "Manual C1 walkthrough" and `pnpm test:e2e -g C1`.

### Templates and documents (risk 1)

- [X] T013 [US1] Placeholder catalog and checks in src/domain/placeholders.ts per contracts/placeholders.md: catalog entries `{ name, kind: "text"|"block"|"blockItem", templates, source }`; `checkTemplateTags(structuredTags, kind)` → issues `unknown-placeholder` (with suggestion: case-insensitive match or edit distance ≤ 2), `wrong-template`, `block-misused`, `block-item-outside`; tests in src/domain/placeholders.test.ts covering every row of the validation table.
- [X] T014 [US1] Letter data in src/domain/letterData.ts and src/domain/motivation.ts: `buildCvData(profile, fmt)`, `buildCoverLetterData(profile, lead, today, fmt)` (company address: application postal address wins if set), `salutationKind(contact)` → `female | male | neutral` (needs salutation and lastName), `missingValues(usedTags, data)`, `splitParagraphs(text)` (split on blank lines, trim, drop empty) and `MOTIVATION_MAX_PARAGRAPHS = 2`; `fmt` is an injected formatter interface (dates, salutation phrases, contact display) implemented from the catalog; tests in src/domain/letterData.test.ts and src/domain/motivation.test.ts.
- [X] T015 [US1] DOCX fixture builder in src/files/testing/docxFixture.ts: build minimal valid DOCX from paragraphs given as run arrays (each run with optional bold/italic), with options to insert `w:proofErr` and bookmark elements between runs; used by unit tests and re-exported for e2e from e2e/fixtures.ts.
- [X] T016 [US1] DOCX adapter in src/files/docx.ts (lazy-loadable): `inspectTemplate(bytes, kind)` → `{ ok: true, tags } | { ok: false, issues }` (size check `MAX_DOCX_BYTES`, ZIP without `word/document.xml` → `docx-invalid`, engine error ids mapped per research R2 with `tag`/`context` ≤ 60 chars, then `checkTemplateTags`), `renderTemplate(bytes, data)` with `paragraphLoop`, `linebreaks`, trimming parser, `nullGetter` → `""`; tests in src/files/docx.test.ts: tags split across 2–4 runs with formatting and `w:proofErr`, `{ Vorname }` accepted, each engine error id → issue code, `.doc`/random bytes/PDF → `docx-invalid`, Motivation block renders 2 separate paragraphs, headers/footers filled, output reopens with all tags gone.
- [X] T017 [US1] Demo templates in src/files/demoTemplates.ts: `buildDemoTemplate(kind, text)` generating minimal OOXML (`[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/styles.xml`) using every placeholder of its kind (cover letter incl. the Motivation block in its own paragraphs); synthetic sample wording from `de.templates.demo`; tests in src/files/demoTemplates.test.ts and src/ui/i18n/index.test.ts (both catalog demos inspect ok and contain the core placeholder set from contracts/placeholders.md; render leaves no braces).
- [X] T018 [US1] PDF adapter in src/files/pdf.ts (lazy-loadable, `@cantoo/pdf-lib`): `inspectPdf(bytes)` → `{ pageCount }` (size check `MAX_PDF_BYTES`, parse error → `pdf-invalid`, encrypted → `pdf-encrypted`), `mergePdfs(parts: Uint8Array[])` → bytes (order preserved); tests in src/files/pdf.test.ts (valid, renamed text file, truncated, encrypted, merge page count and order, oversized).
- [X] T019 [P] [US1] [ROUTINE] ZIP adapter in src/files/zip.ts: `zipFiles(entries: { name, bytes, compress: boolean }[])` using fflate `zipSync` (`level: 0` when `compress` is false), `unzipFiles(bytes)` → `Map<string, Uint8Array>`, failures → `FileError("zip-failed")`; tests in src/files/zip.test.ts (round trip, UTF-8 names with umlauts, corrupt input).
- [X] T020 [P] [US1] File names in src/domain/fileNames.ts: `safeFileNamePart(s)` (NFC, strip `\/:*?"<>|` and control chars, collapse whitespace to `_`, max 60 chars, fallback when empty), `datedName(date, parts[], ext)` → `JJJJ-MM-TT_Part_Part.ext`, `uniqueFileNames(names)` appending ` (2)`, ` (3)` case-insensitively; tests in src/domain/fileNames.test.ts.

### Setup UI

- [X] T021 [US1] [ROUTINE] Profile step in src/ui/setup/ProfileStep.tsx at `#/einrichtung/profil`: labeled inputs for every Profile field (required marked), errors from `validateProfile` shown per field with `aria-describedby`, save button awaits `saveProfile` and shows "gespeichert" only after success, keeps input on failure; setup stepper with the C1 steps Profil, Vorlagen, Lebenslauf (the Nachweise step is added in T041).
- [X] T022 [US1] Templates step in src/ui/setup/TemplatesStep.tsx at `#/einrichtung/vorlagen` and help page src/ui/PlaceholderHelp.tsx at `#/platzhalter`: per kind show active template (demo or uploaded file name/date), download demo (`Kandidu_Vorlage_Lebenslauf.docx`, `Kandidu_Vorlage_Anschreiben.docx`), upload `.docx` (inspect via lazy `src/files/docx.ts`; on issues show a list with German explanation, tag, context and suggestion per code and keep the previous template; on success save and list used placeholders), remove own template (back to demo, confirmed); help page explains `{Name}` syntax, the Motivation block, split-run tolerance, and lists all placeholders per kind with description and example from the catalog.
- [X] T023 [US1] [ROUTINE] CV step in src/ui/setup/CvStep.tsx at `#/einrichtung/lebenslauf`: missing-values notice for the active CV template (from `missingValues`), download filled CV DOCX named `datedName(today, [Vorname, Nachname, "Lebenslauf"], "docx")`, explanation how to save as PDF in Word/LibreOffice (FR-026), upload CV PDF (inspect via `src/files/pdf.ts`, `DocumentRecord` with `role: "cv"`), replace with warning that it applies to all future packages (FR-028), show name/pages/size.

### Project, prompt, response (risk 2)

- [X] T024 [US1] [ROUTINE] Project domain in src/domain/project.ts: `createProject(title, id, now)` (title "required, 1–120"), `addLink/updateLink/removeLink` (http(s) URL ≤ 2 000, unique, max 20), `markPromptCopied(project, now)`, `setResponseDraft` (≤ 500 000), `addResponse(project, response)` and `promptState` transitions verbatim from data-model.md; `ProjectError` codes `title-invalid`, `link-invalid`, `link-duplicate`, `too-many-links`, `draft-too-large`; tests in src/domain/project.test.ts.
- [X] T025 [US1] LLM schema in src/llm/schema.ts per contracts/llm-response.md: Zod schema (non-strict objects, `""`/`null` → absent, trimmed strings, channel synonyms, non-http URLs dropped with warning) and `responseJsonSchema()` via `z.toJSONSchema()`; tests in src/llm/schema.test.ts (generated JSON Schema contains required fields and the channel enum).
- [X] T026 [US1] Extraction and parsing in src/llm/extract.ts and src/llm/parse.ts per research R5 and contracts/llm-response.md (`ParseResult`, `EntryIssue`, `ParseWarning`, 500 000-char limit); synthetic corpus in src/llm/fixtures/*.txt (all cases listed under "Test corpus"); tests in src/llm/parse.test.ts iterate the corpus with expected outcomes (SC-004).
- [X] T027 [US1] Prompt text in src/ui/i18n/de.ts `prompt.build({ title, links, context, schemaJson })` following contracts/llm-response.md "Prompt" order, plus src/ui/prompt.ts `buildPrompt(project, messages)`; tests in src/ui/prompt.test.ts: contains title, every link, schema; context only when non-empty; never contains profile values (built with a synthetic profile present in state).
- [X] T028 [US1] Lead domain in src/domain/lead.ts and src/domain/lifecycle.ts (C1 subset): `createLeadsFromDrafts(drafts, projectId, responseId, ids, now)` with initial `review` history entry, duplicate guard via `responseId` + `responseIndex`, `updateLeadReview(lead, patch)` throwing `LeadError("not-in-review")` outside review, `confirmGate(lead, cvPresent, confirmed, entryId, now)` → `ready` or `LeadError("gate-incomplete")`, `backToReview(lead, entryId, now)` removes `coverLetterPdf`, `defaultPackage(lead, names)` per data-model.md PackageDef; tests in src/domain/lead.test.ts and src/domain/lifecycle.test.ts.
- [X] T029 [US1] Project UI in src/ui/Home.tsx and src/ui/project/: Home lists projects and "Neues Projekt" (title), setup-incomplete hint; LinksStep (title edit, link list with add/edit/remove; C1 tests use one link, US3 proves several), PromptStep (read-only full prompt in a `<pre>`/textarea, copy button with success message, fallback: select-all text and "Ich habe den Prompt kopiert" confirmation when clipboard is denied), ResponseStep (paste textarea autosaving `responseDraft` debounced, "Antwort einlesen" saves the `Response` first then parses, shows errors with German field labels for each `EntryIssue`, text stays in the box, success creates leads and links to them; earlier responses listed read-only); project stepper (Links, Prompt, Antwort, Leads); opening a project routes by `promptState`.

### Lead UI

- [X] T030 [US1] Safe Markdown component in src/ui/Markdown.tsx per research R6 (react-markdown + remark-gfm, `skipHtml`, images disallowed, links `target="_blank" rel="noopener noreferrer"`); unit test in src/ui/Markdown.test.ts rendering to static markup: no `<img>`, no raw HTML, `javascript:` links removed.
- [X] T031 [US1] [ROUTINE] Lead list and review step: src/ui/project/LeadList.tsx at `#/projekte/:projectId/leads` (company, position, status label; status `review` is labeled „Review (Entwurf)“) and src/ui/lead/ReviewStep.tsx at `…/pruefen` (labeled fields for position, company + address, contact, application channel and its fields, process and research as Markdown textarea with preview toggle using src/ui/Markdown.tsx, motivation textarea with paragraph counter and hint when > 2, Briefanrede with suggestion from `salutationKind` + catalog and override field; save via `saveLeads` with saved-after-commit feedback; read-only with notice when status ≠ review); lead stepper (Prüfen, Anschreiben, Freigabe, Paket).
- [X] T032 [US1] [ROUTINE] Cover letter step in src/ui/lead/CoverLetterStep.tsx at `…/anschreiben`: list of placeholders that would stay empty (`missingValues`) with links to fix (profile or review) and an explicit "Trotzdem herunterladen" option, download rendered DOCX named `datedName(today, [Firma, "Anschreiben"], "docx")`, PDF conversion explanation (FR-026), render failure shown as error.
- [X] T033 [US1] Gate step in src/ui/lead/GateStep.tsx at `…/freigabe`: upload/replace cover letter PDF (inspect, size limit, `saveLeadFile`), show CV PDF status with link to `#/einrichtung/lebenslauf` when missing, explicit confirmation checkbox "Ich habe Anschreiben und Lebenslauf geprüft" plus button; on confirm `confirmGate` → status ready; "Zurück in den Review" with confirmation dialog (removes cover letter PDF).
- [X] T034 [US1] Package step in src/ui/lead/PackageStep.tsx at `…/paket` (C1: one package): shows default package (cover letter, CV), reorder with up/down buttons, file name edit (sanitized via `safeFileNamePart`, `.pdf`), changes persisted via `saveLeads` (FR-033), "ZIP herunterladen" reads files, merges via lazy `src/files/pdf.ts`, zips via `src/files/zip.ts`, names the ZIP `datedName(today, [Firma, "Bewerbung"], "zip")`, shows progress and errors (`file-missing` for a deleted CV → link to CV step); only reachable when status ≠ review.

### Tests for User Story 1 (journeys)

- [X] T035 [US1] [ROUTINE] Playwright journey in e2e/c1-lead-journey.spec.ts (`C1 …` titles, desktop + mobile): profile save + reload; demo template downloads inspect clean; upload of a split-run template with `{Vornahme}` shows the suggestion and keeps the demo active, corrected upload succeeds; CV DOCX download contains profile values; CV PDF upload; project with one link; prompt contains link and no profile values; invalid JSON keeps the pasted text and names the problem; fenced valid JSON creates one lead; review edit persists after reload; cover letter DOCX contains company, Briefanrede and both motivation paragraphs; renamed text file rejected as PDF; gate requires confirmation; ZIP contains one PDF with pages = cover letter + CV; network guard active throughout.
- [X] T036 [US1] Size proof in e2e/c1-package-size.spec.ts (`C1 package size`, chromium project only): generate two PDFs of ≈ 13.5 MB and 30 pages each with incompressible image streams (each below the 20 MB limit, together ≈ 27 MB / 60 pages), upload them as CV PDF and cover letter PDF, compose the default package and download the ZIP; assert the merged PDF has 60 pages and that compose + ZIP completes in < 30 s (SC-005); also assert a 21 MB PDF is rejected with the size limit; log timings in the test output.
- [X] T037 [US1] Accessibility baseline across US1 views: every input labeled, errors linked with `aria-describedby`, status in live region, focus to `<h1>` on route change, visible focus style, buttons not links for actions; fix findings in the touched src/ui files and add a keyboard-only smoke for profile + prompt copy in e2e/c1-lead-journey.spec.ts.

### C1 GATE

- [X] T038 [GATE] C1 checkpoint: run `pnpm verify`; start `pnpm dev --host 127.0.0.1 --port 5173 --strictPort` and confirm the URL responds; update docs/STATUS.md (checkpoint, spec IDs, commands and outcomes, URL and who can reach it, ≤3 review steps, questions, next action) and the spec in the same commit; commit the slice; then **STOP** and wait for an explicit human decision. Do not start later phases until docs/STATUS.md records approval.

---

## Phase 4: User Story 2 - Nachweise mit Namen und Tags verwalten (Priority: P2) C2 Useful and recoverable

**Goal**: Evidence PDFs with names and tags, usable in packages (FR-009–FR-011); deleting the global CV PDF (FR-028); before that, the C1 feedback on the CV download (FR-025, T071).

**Independent Test**: upload three synthetic PDFs, tag (predefined + own), filter, rename, delete; reload keeps state.

### C1 feedback (owner, 2026-10-19)

- [X] T071 [US1] CV download notice vs. confirmation (spec Clarifications 2026-10-19): mark the optional profile placeholders (`Geburtsdatum`, `Geburtsort`, `Staatsangehoerigkeit`, `Website`) in src/domain/placeholders.ts and add `splitMissing(names)` → `{ required, optional }`; src/ui/setup/CvStep.tsx shows empty optional placeholders as an informational notice (no "Trotzdem herunterladen", normal download button) and keeps the warning plus "Trotzdem herunterladen" only when required placeholders are empty; the cover letter step is unchanged; unit tests in src/domain/placeholders.test.ts and an e2e check in e2e/c1-lead-journey.spec.ts (profile without optional fields → notice, normal button). Covers: FR-024, FR-025.

### User Story 2 tasks

- [X] T039 [P] [US2] [ROUTINE] Tags in src/domain/tags.ts: `PREDEFINED_TAGS = ["zeugnis", "zertifikat", "arbeitszeugnis", "schulzeugnis", "referenz"]`, `normalizeTag` ("lower-cased, trimmed, unique, 1–40 chars each"), `suggestTags(input, inUse)` (predefined ∪ in use, prefix then substring match); tests in src/domain/tags.test.ts. Covers: FR-010.
- [X] T040 [US2] Store: `deleteDocument(id, affectedLeads)` in src/storage/indexeddb.ts (already present from C1 but untested) removes the record, its file bytes and writes the given leads (with package items referencing it removed) in one transaction; tests in src/storage/indexeddb.test.ts: evidence deletion with affected leads, CV deletion leaves `cv` package items intact, failed write leaves everything unchanged, no orphaned `files` entry. Covers: FR-009, FR-028, FR-038.
- [X] T073 [US2] Delete the global CV PDF in src/ui/setup/CvStep.tsx: "Lebenslauf-PDF löschen" with a confirmation explaining that released leads stay released and packages containing the CV can only be built after a new upload (spec Edge Cases); uses `deleteDocument(cv.id, [])`; afterwards the gate step shows the CV as missing (link to upload) and the package step reports `file-missing` with a link to the CV step; e2e in e2e/c2-evidence.spec.ts (cancel keeps the PDF, confirm removes it, package download then points to the CV step, re-upload restores it). Covers: FR-028, FR-029.
- [X] T041 [US2] [ROUTINE] Evidence step src/ui/setup/EvidenceStep.tsx at `#/einrichtung/nachweise` (add to setup stepper): upload PDF with name (1–120) and tags (combobox with suggestions from `suggestTags`, Enter creates own tag), list with name, tags, pages, size, date; filter by tag; rename/retag; delete with confirmation listing packages that use it. Covers: FR-009, FR-010, FR-011, FR-038, FR-042.
- [X] T042 [US2] Package step: allow adding evidence documents to a package in src/ui/lead/PackageStep.tsx (picker filtered by tag). Covers: FR-030, FR-011.
- [X] T043 [US2] [ROUTINE] Playwright journey e2e/c2-evidence.spec.ts (`C2 evidence …`): upload, tag, suggest, filter, rename, reload, use in package, delete with confirmation. Covers: FR-009, FR-010, FR-011, FR-030, FR-038.

---

## Phase 5: User Story 3 - Mehrere Links und Leads, flexible Pakete (Priority: P2) C2

**Goal**: Many links/leads per project, optional prompt context, partial import, multiple named packages (FR-012, FR-015, FR-021, FR-030, FR-031, FR-033).

**Independent Test**: project with three links → response with three leads; one lead with two packages; ZIP contains both.

- [X] T072 [US3] Edit links in src/ui/project/LinksStep.tsx: each link gets "Bearbeiten" → inline URL field with "Speichern"/"Abbrechen" using `updateLink` from src/domain/project.ts; `link-invalid`/`link-duplicate` shown at the field with `aria-describedby`, input kept on error; Escape cancels, focus returns to the link's edit button; the prompt reflects the edited link (US3 scenario 1); domain tests for `updateLink` in src/domain/project.test.ts (valid edit, invalid URL, duplicate, unknown id) and e2e in e2e/c2-multi.spec.ts. Covers: FR-012, FR-013.
- [X] T044 [US3] Prompt context: textarea in src/ui/project/LinksStep.tsx ("optional, standardmäßig leer, ≤ 2 000 Zeichen") with the notice that it is sent to the external LLM; prompt includes it only when non-empty (extend src/ui/prompt.test.ts); "Prompt geändert, bitte erneut kopieren" notice when links/title/context change after copying. Covers: FR-013, FR-014, FR-015.
- [X] T045 [US3] Partial import: on `schema-invalid` with `validLeads`, ResponseStep offers "Nur gültige Einträge übernehmen (n von m)"; re-importing a response that already created leads asks first (FR-021); tests in src/domain/lead.test.ts for the duplicate guard and e2e below. (Done: the guard `findImportedResponse` and `partialImport` live in src/domain/project.ts, so their tests are in src/domain/project.test.ts, including a partly imported response being found again.) Covers: FR-019, FR-020, FR-021.
- [X] T046 [US3] Multiple packages in src/ui/lead/PackageStep.tsx and src/domain/packages.ts: add/remove packages, name suggestions from FR-031 (`…_Bewerbung.pdf`, `…_Anschreiben_Lebenslauf.pdf`, `…_Zeugnisse.pdf`), `uniqueFileNames` in the ZIP, persisted via `saveLeads` (FR-033); tests in src/domain/packages.test.ts. (Review addition: unsaved package changes show "Ungespeicherte Änderungen" and ask before leaving, like profile, review and links.) Covers: FR-030, FR-031, FR-032, FR-033.
- [X] T047 [US3] [ROUTINE] Playwright journey e2e/c2-multi.spec.ts (`C2 multi …`): three links (one edited, one removed and re-added), three leads from one response, partial import of a response with one invalid entry, two packages in one ZIP with chosen names, reload restores the package definitions. Covers: FR-012, FR-013, FR-021, FR-030, FR-031, FR-033.

---

## Phase 6: User Story 4 - Pausieren, Fortsetzen und Fehler überstehen (Priority: P2) C2

**Goal**: Resume, failure handling, quota, multi-tab, keyboard, a11y, mobile (FR-017, FR-040–FR-042, FR-044, FR-045, FR-047, SC-006, SC-009, SC-010).

**Independent Test**: copy prompt, close, reopen → paste step; simulated write failure keeps input; keyboard-only US1; 360 px overview.

- [X] T048 [US4] Resume: opening a project routes by `promptState`; Home shows "Antwort ausstehend" badges; response draft survives browser restart (e2e with a new context on the same storage state). (Done: e2e `C2 resume …` in e2e/c2-recovery.spec.ts, `storageState({ indexedDB: true })` into a new context.) Covers: FR-017, FR-046, SC-006.
- [X] T049 [US4] Write-failure handling: every save surfaces `save-failed`/`quota-exceeded` with "Erneut versuchen" and keeps form input; e2e in e2e/c2-recovery.spec.ts injects failures via `page.addInitScript` patching `IDBObjectStore.prototype.put`; corrupt stored data → recovery view (retry, import backup, confirmed reset), never auto-overwrites. (Done: `commit()` in src/ui/state.tsx holds a retryable failure open until "Erneut versuchen" or "Abbrechen", so the caller's follow-up (navigation, clearing a field) runs only after a successful retry; reset now returns to Home. The recovery view's "Sicherung importieren" is added with T055.) Covers: FR-040, FR-041, SC-006.
- [X] T050 [US4] Quota and persistence: storage usage and persistence state on `#/daten` (src/ui/data/DataView.tsx), warning before uploads at ≥ 80 % of `storageEstimate().quota`, "Speicher dauerhaft anfordern" button with explanation and denial notice, and the "Daten liegen nur in diesem Browser" notice with backup recommendation (FR-045); unit tests for the threshold helper. (Done: helper src/ui/quota.ts + quota.test.ts; warning in every `FileField`; `#/daten` also has the confirmed reset from contracts/ui-routes.md; "Daten" in the main navigation.) Covers: FR-042, FR-045.
- [X] T051 [US4] Multi-tab conflicts: `meta.revision` check in src/storage/indexeddb.ts writes (`conflict`), `BroadcastChannel("kandidu:changes")` + `onExternalChange`; UI banner "In einem anderen Tab geändert – neu laden"; adapter tests for conflict and e2e with two pages. (Done: a `conflict` on write also raises the banner; new adapter test for the broadcast after commit only.) Covers: FR-044.
- [X] T052 [US4] Keyboard and accessibility proof: `pnpm add -D @axe-core/playwright@4.14.0`; e2e/c2-a11y.spec.ts runs a keyboard-only US1 journey and axe scans of Home, setup steps, project steps and lead steps with zero critical/serious violations (SC-009); fix findings. (Fixed: link remove button text "Entfernen" now matches its accessible name.) Covers: FR-046, FR-047, SC-009.
- [X] T053 [US4] Mobile: e2e/c2-mobile.spec.ts at 360 px width asserts no horizontal scrolling on Home, lead list, lead status and comments views (SC-010); CSS fixes in src/ui/style.css. (Fixed: `fieldset { min-width: 0 }`, the lead review overflowed.) Covers: SC-010 (views that exist in C2; lifecycle/comment views follow in C3).

---

## Phase 7: User Story 5 - Sicherung exportieren und importieren (Priority: P2) C2

**Goal**: Full backup round trip (FR-043, SC-007) per contracts/backup-format.md.

**Independent Test**: export complete US1 state, import into a fresh context, all data and files identical.

- [X] T054 [US5] Backup in src/storage/backup.ts and adapter methods `exportBackup`/`importBackup`: manifest, SHA-256 per file (Web Crypto), `LIESMICH.txt` text passed in from the catalog, validation before any write, single replacing transaction; tests in src/storage/backup.test.ts (round trip bit-identical, missing file, hash mismatch, newer version, corrupt JSON leave data untouched). (Also: port method `persistenceState()` with adapter test in src/storage/indexeddb.test.ts.) Covers: FR-043, SC-007.
- [X] T055 [US5] Backup UI on `#/daten`: export button (`JJJJ-MM-TT_Kandidu_Sicherung.zip`, "enthält persönliche Daten" notice), import with confirmation when data exists, clear errors; recovery view links to import. (Done: src/ui/data/BackupImport.tsx is used on `#/daten` and in the recovery view itself; a newer backup gets its own text instead of the stored-data `unsupported-version` text; e2e in e2e/c2-backup.spec.ts.) Covers: FR-041, FR-043, FR-045.
- [X] T056 [US5] [ROUTINE] Playwright journey e2e/c2-backup.spec.ts (`C2 backup …`): export after the C1 journey, import into a fresh browser context, compare lead data and downloaded package page counts. Covers: FR-043, SC-007.

### C2 GATE

- [ ] T057 [GATE] C2 checkpoint: same procedure as T038 for US1–US5 (plus T071–T073); **STOP** for an explicit human decision. Covers: C2 (constitution).

---

## Phase 8: User Story 6 - Lebenszyklus mit Daten und Kommentaren (Priority: P3) C3 Agreed acceptance

**Goal**: Full lifecycle with undo, repeated interviews, comments (FR-034, FR-035).

**Independent Test**: move a lead through all main states with dates, undo once, add two comments.

- [ ] T058 [US6] Lifecycle in src/domain/lifecycle.ts: `allowedTransitions(status)` and `applyTransition` exactly per data-model.md "StatusEntry and lifecycle" (incl. terminal states, `failed` only from ready/sent, interview → interview, undo of the latest non-undone entry, initial review not undoable); tests in src/domain/lifecycle.test.ts for every allowed and a sample of forbidden transitions. Covers: FR-034.
- [ ] T059 [US6] Comments in src/domain/lead.ts (`addComment`, `editComment`, `deleteComment`; text 1–2 000, date `YYYY-MM-DD`); tests. Covers: FR-035.
- [ ] T060 [US6] [ROUTINE] History view src/ui/lead/HistoryView.tsx at `…/verlauf`: current status, buttons/forms only for allowed transitions (sent date; interview date-time, onsite location or online link), undo with confirmation, chronological history incl. undone marks, comments CRUD; dates via `Intl.DateTimeFormat("de-DE")`. Covers: FR-029, FR-034, FR-035, FR-048.
- [ ] T061 [US6] [ROUTINE] Playwright journey e2e/c3-lifecycle.spec.ts (`C3 lifecycle …`): ready → sent → interview ×2 → accepted, undo, withdrawn path, comments, mobile project. Covers: FR-034, FR-035, SC-010.

---

## Phase 9: User Story 7 - Übersicht, Verwaltung und Löschen (Priority: P3) C3

**Goal**: Overview, filter/sort, cascade deletion (FR-036–FR-038, SC-011).

**Independent Test**: two projects with leads; filter; delete one lead and one project; IndexedDB holds no related records or files.

- [ ] T062 [US7] Store cascades: `deleteLead` and `deleteProject` in src/storage/indexeddb.ts remove leads, responses, cover letter PDFs and their file bytes in one transaction; template deletion falls back to demo; tests assert no orphaned `files` entries. Covers: FR-037, FR-038, SC-011.
- [ ] T063 [US7] Overview: Home shows per project title, lead counts per status, pending response, next interview; LeadList adds status filter and sort by last activity/next date (src/ui/Home.tsx, src/ui/project/LeadList.tsx). Covers: FR-036.
- [ ] T064 [US7] Delete UI: confirmation dialogs naming what will be removed for lead, project, template and evidence (with usage list), focus returns sensibly after deletion. Covers: FR-037, FR-038.
- [ ] T065 [US7] [ROUTINE] Playwright journey e2e/c3-manage.spec.ts (`C3 manage …`): filter/sort, cancel vs confirm deletion, then inspect IndexedDB via `page.evaluate` for leftover records/files (SC-011). Covers: FR-036, FR-037, SC-011.

---

## Phase 10: Polish & Acceptance (C3)

**Purpose**: Demonstrate agreed acceptance criteria and hand off

- [ ] T066 [P] Accessibility pass: keyboard-only journey, focus, labels, status/error announcements. Covers: FR-047, SC-009.
- [ ] T067 [P] [ROUTINE] Localization pass: no user-facing strings outside src/ui/i18n/, `Intl` formatting, layouts tolerate longer text at mobile width. Covers: FR-048.
- [ ] T068 Run quickstart.md validation. Covers: SC-001.
- [ ] T069 Document known limits and exact restart/resume steps in docs/STATUS.md and README.md. Covers: FR-045.
- [ ] T070 [GATE] C3 checkpoint: same procedure as T038; request explicit acceptance. **STOP**; never mark accepted without a recorded human decision. Covers: C3 (constitution).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Proceed sequentially in priority order (P1 → P2 → P3)
- **GATE tasks**: Block every later task until docs/STATUS.md records an explicit human decision
- **Polish (Final Phase)**: Depends on all desired user stories being complete and approved

### Within User Story 1

- T013 → T016 → T017 → T022; T015 before T016 and T012
- T018, T019, T020 independent of templates; T023 needs T016 + T018
- T024, T025 → T026 → T027 → T029
- T028 needs T024; T031–T034 need T028; T030 before T031; T034 needs T018 + T019
- T035–T037 after the UI tasks; T038 last

### Within C2

- T071 first (C1 feedback); then US2: T039 → T041 → T042; T040 → T073 and T041; T043 last
- US3: T072 and T044 (both LinksStep) before T047; T045, T046 before T047
- US4 after US3; T049 recovery view links to import once T055 exists
- US5: T054 → T055 → T056; T057 last

### Parallel Opportunities

- T010, T019, T020 (different files) alongside T013–T018
- T025/T026 (llm) in parallel with T013–T018 (files/domain)
- Never parallelize across a GATE

### Parallel example (US1)

```text
Batch A (main session): T013, T014, T016, T017, T018
Batch B (speckit-implementer, ROUTINE): T019, T021 (after T011), T024
```

---

## Implementation Strategy

### Checkpointed MVP

1. Complete Setup + Foundational
2. Complete User Story 1 → C1 GATE: running app, evidence, **STOP**
3. After approval (or requested changes folded into spec.md/tasks.md): US2–US5 → C2 GATE, **STOP**
4. After approval: US6, US7, Polish & Acceptance → C3 GATE, **STOP**

Human feedback at a gate updates spec.md (via `/speckit-clarify` or a direct
edit with stable IDs), then `/speckit-tasks` or `/speckit-converge` refreshes
remaining work before implementation resumes.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit coherent slices (a story or a gate), not individual tasks or files
- Delegated [ROUTINE] tasks are reviewed and ticked by the main session
