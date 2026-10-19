# Current handoff

## Checkpoint and authorization

- Updated: 2026-10-19.
- Product: **Kandidu** (Bewerbungs-Assistent), repository `markusrt/kandidu`.
- Branch: `001-bewerbungs-mvp` (local, recreated from `main` at `b8af643` for C2;
  the remote branch of the same name was deleted when PR #1 merged). Not pushed.
- Active feature: `specs/001-bewerbungs-mvp/` (spec, plan, research, data-model,
  contracts, quickstart, tasks). Spec language de-DE, UI default locale de-DE.
- Checkpoint: **C1 – Risky core: accepted by the owner on 2026-10-18** ("Okay ich
  gebe C1 frei mit auto-merge") and **shipped** (see "C1 ship result"). GATE task
  T038 done. **C2 – Useful and recoverable: in progress** (Phase 4 onward, up to
  GATE T057).
- Approval state: C1 approved without change requests. C2 not yet reviewed.
- Ship mode: **`auto-merge`** (owner decision 2026-10-18). This authorizes push,
  PR, merge after green CI, and the GitHub Pages deployment for this product,
  after each approved gate. C2 work stays local until the C2 gate is approved.
- Owner instructions (2026-10-18, still valid): `.gitattributes` with
  `*.sh text eol=lf`; Spec Kit init committed separately (`54fa373 chore:
  initialize Spec Kit` after the rebase merge).
- Owner instructions (2026-10-19): local C2 branch; record the C1 ship result;
  working rules in AGENTS.md "Owner working rules" (edit files with the edit
  tool; commit after each finished user story); add the gaps FR-012 (edit links
  in the UI) and FR-028 (delete the CV PDF) as tasks and list FR IDs on the open
  tasks; CV download: empty optional placeholders only give a notice, the
  "download anyway" confirmation is only for empty required placeholders
  (answers question 1 below); then `/speckit-implement` up to the C2 gate.

## C1 ship result (2026-10-18, verified 2026-10-19)

- `pnpm ship --mode auto-merge` after GitHub Pages was switched to GitHub
  Actions (`gh api repos/markusrt/kandidu/pages` → `build_type: workflow`).
- PR: [#1](https://github.com/markusrt/kandidu/pull/1) "feat: deliver C1 – one
  application lead end to end in the browser", **merged** 2026-10-18 15:34 UTC
  (rebase; `main` head `b8af643`). PR check run `39141008188`: success.
- `main` run: [39141108997](https://github.com/markusrt/kandidu/actions/runs/39141108997),
  jobs `verify`, `pages-check`, `deploy`: all success. PR comment: "Deployed
  b8af643 to `https://markusrt.github.io/kandidu/`".
- Live URL: **<https://markusrt.github.io/kandidu/>**, rechecked 2026-10-19 with
  `curl`: HTTP 200, `lang="de"`, `<title>Kandidu</title>`. Public (GitHub Pages);
  all data stays in the visitor's browser.

## Clarifications recorded (2026-10-18, spec `## Clarifications`)

1. CV PDF: uploaded once, global for all leads, no per-lead override.
2. Lifecycle: main path review → ready → sent → interview (repeatable) →
   accepted | rejected; plus withdrawn and failed; last change undoable.
3. Prompt: optional user-written context per project, off by default, shown in
   the prompt with a notice; never profile data.
4. Limits: 20 MB per PDF, 10 MB per DOCX; quota warning at 80 %; request
   persistent storage with explanation.

## C1 scope and spec IDs

| Item | State |
| --- | --- |
| US1 (P1) one lead end to end | implemented, verified (unit + e2e), **not yet human-accepted** |
| FR-001–FR-008 profile, templates, placeholder checks | implemented, verified |
| FR-012–FR-014, FR-016 project, links, prompt, copy (+ manual fallback) | implemented, verified |
| FR-017 resume after pause | partly: response draft autosaved and project reopens at the step matching its prompt state; full resume proof is US4 (C2) |
| FR-018–FR-020 tolerant parsing, field-level errors, paste never lost | implemented, verified |
| FR-021 | re-pasting an already imported answer asks first (UI + e2e); partial import is US3 (C2) |
| FR-022–FR-029 review/edit, salutation, DOCX download, missing-value check, no DOCX→PDF, file names, CV/cover PDFs, gate | implemented, verified |
| FR-030–FR-032 one package PDF, names, in-browser merge + ZIP | implemented, verified (multi-package is US3/C2) |
| FR-033 package definition stored | implemented for the single C1 package |
| FR-039 no network / CSP | implemented, e2e network guard on every test |
| FR-040, FR-041 saved-after-commit, validated load, recovery view | implemented; storage adapter unit-verified (abort, quota mapping, corrupt data, blocked writes); UI path only by e2e happy path — UI failure injection is US4 (C2) |
| FR-042 size limits | limits enforced; usage display/quota warning/persistence request are US4 (C2) |
| FR-044 multi-tab | adapter conflict detection + reload banner implemented; e2e proof is US4 (C2) |
| FR-046–FR-048 stepper, keyboard baseline, de-DE catalog | implemented; full keyboard/axe proof is C2 |
| SC-002 | automated: split-run templates fill correctly, DOCX re-opens; **Word/LibreOffice "no repair prompt" not checked** (neither installed on the agent machine) |
| SC-003, SC-004, SC-005, SC-008 | verified (see evidence) |

Riskiest assumptions (constitution I):
1. docxtemplater fills user-edited templates and explains placeholder errors —
   **supported**: tags split across 2–4 formatted runs with `w:proofErr`/bookmarks
   render correctly; every docxtemplater error id we rely on maps to a German
   explanation with tag/context; unknown names get suggestions (`{Vornahme}` →
   „Meinten Sie {Vorname}?“). Open: real Word/LibreOffice round trip (review step 2).
2. Arbitrary LLM JSON is parsed robustly — **supported**: 18-file synthetic corpus
   (fences, prose, single object, root array, trailing commas, typographic
   quotes, two blocks, nulls/empty strings, numbers, unknown channel) all handled;
   invalid answers create no leads and keep the paste.
3. Storing/merging PDFs and ZIP in the browser at realistic size — **supported**:
   2 × 13.5 MB / 30 pages uploaded through the UI, merged to 60 pages and zipped in
   **0.6–0.7 s** in desktop Chromium (target < 30 s); merge order verified per page.

## Commands and actual evidence (2026-10-18, Node 24.21.0, pnpm 10.34.7)

- `pnpm add` of the ADR 009 libraries; `pnpm audit`: **no known vulnerabilities**.
- **`KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0** (final run after review fixes).
  Biome 98 files; `tsc -b` ok; dependency-cruiser 98 modules / 312 dependencies,
  no violations; Vitest **22 files / 196 tests** passed; `vite build` ok;
  Playwright **9 passed, 1 skipped** (the size test runs on the chromium project
  only, by design). Port override: on the owner's machine VS Code listens on
  127.0.0.1:4173 after a reboot, so `playwright.config.ts` now reads
  `KANDIDU_E2E_PORT` (default 4173, CI unchanged). Plain `pnpm verify` fails here
  only because of that port (`http://127.0.0.1:4173 is already used`).
- Playwright journeys: `e2e/c1-lead-journey.spec.ts` (full US1 journey, missing-CV
  gate, keyboard smoke) and `e2e/c1-package-size.spec.ts` (SC-005, 21 MB
  rejection), each on Desktop Chrome and Pixel 7, with a network guard that fails
  on any request outside the preview origin (SC-008).
- `pnpm dev --host 127.0.0.1 --port 5173 --strictPort`: `http://127.0.0.1:5173/`
  returned HTTP 200 with `lang="de"` and title „Kandidu“. Loopback only: reachable
  on the machine running the server, not from other devices.
- Bundle (production): start chunk 128 KB gzip; DOCX (64 KB), PDF (246 KB),
  Markdown (48 KB) load on demand.

## Model routing (ADR 006)

`pnpm models:check` (exit 0, "Routing OK"):

| Agent | Models (responses) | Expected |
| --- | --- | --- |
| main session | claude-opus-5-5 (533) | opus |
| speckit-reviewer (run 1, interrupted by the crash) | claude-opus-5-5 (18) | opus |
| speckit-reviewer (run 2, complete) | claude-opus-5-5 (97) | opus |
| speckit-implementer (probe) | claude-sonnet-5-5 (2) | sonnet |
| speckit-implementer T001, T010 | claude-sonnet-5-5 (13) | sonnet |
| speckit-implementer T019, T024 | claude-sonnet-5-5 (17) | sonnet |
| speckit-implementer T021, T023, T031, T032 | claude-sonnet-5-5 (44) | sonnet |
| speckit-implementer T035 | claude-sonnet-5-5 (26) | sonnet |

Delegated `[ROUTINE]` tasks: **T001, T010, T019, T024, T021, T023, T031, T032,
T035**. All diffs reviewed in the main session; corrections made there:
`addResponse` kept clearing the paste draft on failed parses (FR-020) → fixed;
review long-text fields used `aria-label` only → visible labels; Markdown loaded
eagerly → lazy. All other tasks were done in the main session.

## Local review (speckit-reviewer, opus, fresh context)

Verdict: **no blockers.** Fixed in this slice (should-fix 1–6):

1. Response draft could be lost when leaving within 800 ms or when a write was
   running (`commit()` silently refused concurrent writes). Now `commit()` queues
   writes; the draft is flushed on blur, unmount and `pagehide`; failed saves retry.
   Side effect found by e2e: blur-save disabled the submit button mid-click; the
   button now depends only on its own submit state.
2. Unsaved edits in profile and lead review were dropped on navigation. Now an
   „Ungespeicherte Änderungen“ hint plus a confirm before leaving (in-app links,
   tab close).
3. Merge order was untested. Unit test and e2e now check page order per source
   (distinct page widths), including reordering in the UI and persistence of the
   order (FR-033).
4. FR-021 duplicate guard was not wired. Re-pasting an imported answer now asks
   first (domain `findImportedResponse`, UI confirm, e2e).
5. Gate failure feedback was vague. It now lists what is missing, in a
   `role="alert"` linked to the checkbox.
6. STATUS/ADR claims corrected (this section, FR-021/FR-040 rows, SC-005 timing,
   ADR 008 quota sentence).

Nits fixed: oversized paste no longer silently truncated (limit message instead);
package file name shown as sanitized; hardcoded „Anschreiben.pdf“ and „ · “ moved
to the catalog; domain file-name fallback is neutral; malformed URL hash shows
„Nicht gefunden“ instead of a blank app; download URL revoked after 60 s (Firefox);
review required-field errors linked via `aria-invalid`/`aria-describedby`;
adapter resets `loaded` before each load; CV upload with empty file name.

Remaining (accepted for C1, noted for C2):
- Permission-restricted PDF merge test checks page count, not decrypted content.
- `response.issue()` composes field + verb inside one catalog function (fine for
  de; revisit if a second locale is added).
- Copying the prompt again after „answered“ resets the state to „copied“ (as
  designed in data-model.md: a new round), so reopening the project lands on
  „Antwort“, not „Leads“.

## Decisions, deviations, findings during C1

- ADR 008: IndexedDB `kandidu:data` behind the async store port (owner decision).
- ADR 009: library choices; `@cantoo/pdf-lib` instead of unmaintained `pdf-lib`;
  docxtemplater's bundled InspectModule needs undeclared `lodash`, so a 12-line
  tag collector on the public module hook replaces it.
- PDFs that only restrict permissions (empty open password) are accepted and
  merged; PDFs that need a password to open are rejected (`pdf-encrypted`).
- Demo templates contain a core placeholder set, not every redundant variant
  (contract updated); the full list is on the help page.
- New storage error codes `store-blocked`, `record-invalid` (contract updated).

## Limits and known gaps (honest)

- Data lives only in this browser profile (IndexedDB). It is not encrypted, can be
  evicted or cleared, and is not backed up until US5 (C2) adds export/import.
- No Word/LibreOffice on the agent machine: "opens without repair prompt" is
  unverified by automation.
- Not in C1 (planned C2/C3): evidence documents and tags, several leads per
  answer in the UI flow (parser already supports them), partial import, multiple
  packages, storage usage/persistence UI, backup, write-failure UI tests, axe
  scan, 360 px proof, lifecycle beyond ready, comments, overview, deletion.
- Agent environment: drive C: was 100 % full during part of this session (tests
  ran with TMP/TEMP on D:), and the owner's PC crashed (bluescreen) before the
  first feature commit. After the crash: `git fsck` clean, no empty/NUL files,
  full `pnpm verify` green. A non-branch safety snapshot was written to
  `refs/backup/c1-wip` (local ref, never pushed); it can be deleted with
  `git update-ref -d refs/backup/c1-wip`. Not product issues.

## Questions for the owner

C1 decision and ship mode: answered 2026-10-18 (approve, `auto-merge`).

1. ~~CV download shows „Trotzdem herunterladen“ whenever optional profile fields
   are empty. Keep or warn only for required fields?~~ **Answered 2026-10-19**:
   empty optional placeholders only give a notice; the confirmation stays for
   empty required ones (spec `## Clarifications` Session 2026-10-19, FR-025,
   task T071).
2. Trademark search (DPMA/EUIPO/WIPO) before any public launch (open item from the
   brief; the 2026-10-18 web/domain check is not a clearance). Nonblocking.

## Review steps for the owner at C1 (≤ 3, done)

1. Start: `pnpm install --frozen-lockfile` then
   `pnpm dev --host 127.0.0.1 --port 5173 --strictPort`, open
   `http://127.0.0.1:5173/` on this machine.
2. Try US1 with synthetic data (quickstart.md "Manual C1 walkthrough"): profile →
   Vorlagen (download the cover-letter demo, edit it in Word/LibreOffice, add
   `{Vornahme}`, upload → see the explanation, fix, upload) → Lebenslauf-PDF →
   new project with one link → copy prompt → paste
   `src/llm/fixtures/valid-fenced.txt` (or a real LLM answer) → edit lead →
   download Anschreiben, open in Word/LibreOffice (no repair prompt?), save as PDF
   → Freigabe → Paket → ZIP.
3. Decide: approve C1 or request changes, and choose the ship mode
   (`local-only`, `expert-review`, or `auto-merge`).

## Worktree and next action

- Worktree: C1 is merged into `main` (`b8af643`) and live. C2 work happens on
  the local branch `001-bewerbungs-mvp`, one commit per finished user story
  (AGENTS.md "Owner working rules"); nothing pushed until the C2 gate is approved.
- **Exact next action:** implement C2 with `/speckit-implement`, starting with
  the C1 feedback task T071 and Phase 4 (US2, T039), through Phase 7 (US5), then
  run the C2 GATE T057 procedure and stop for the owner's decision.

## Subsequent handoff schema

Keep this file current in the same behavior-changing change: date; branch and
existing commit/reference; actual worktree state; active feature
(`specs/NNN-*`); checkpoint/scope/approval; spec IDs (US, `FR-`, `SC-`) with
planned/implemented/verified/accepted states; exact commands and outcomes
(including not run); preview reachability and restart commands;
assumptions/limits/questions; one next action. Never inherit test evidence or
acceptance into a copied product without rechecking it.
