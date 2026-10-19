# Current handoff

## Checkpoint and authorization

- Updated: 2026-10-19.
- Product: **Kandidu** (Bewerbungs-Assistent), repository `markusrt/kandidu`.
- Branch: **`001-bewerbungs-mvp-c3-ship`** (local, from `origin/main` at
  `b1f4523` after the C3 merge, no upstream, not pushed); it only carries
  this C3 ship record. Spec Kit finds the feature through
  `.specify/feature.json`, not the branch name. The C2 and C3 branches were
  deleted locally and on GitHub by their merges.
- Active feature: `specs/001-bewerbungs-mvp/` (spec, plan, research, data-model,
  contracts, quickstart, tasks). Spec language de-DE, UI default locale de-DE.
- Checkpoint: **C1 – Risky core: accepted by the owner on 2026-10-18** ("Okay ich
  gebe C1 frei mit auto-merge") and **shipped** (see "C1 ship result"). GATE task
  T038 done. **C2 – Useful and recoverable: approved by the owner on
  2026-10-19 with follow-ups** (`specs/001-bewerbungs-mvp/feedback/C2.md`;
  on `main` as `16b34bb`) and **shipped** (see "C2 ship result"). GATE task
  T057 done. **C3 – Agreed acceptance: accepted by the owner on 2026-10-19**
  ("C3 ist abgenommen mit auto-merge"), GATE T070 done: C3 Phase A (R1–R4),
  US6, US7, Polish T066–T069, and **shipped** (see "C3 ship result"). The
  MVP feature 001-bewerbungs-mvp is complete; all tasks are ticked.
- Approval state: C1 approved without change requests. C2 approved with
  follow-ups R1–R6 (R1–R4 built in C3, R5–R6 in the spec backlog). **C3
  accepted without change requests.** There is no `feedback/C3.md`; the
  decision was given in the chat of 2026-10-19. The owner did not object to
  the review-page proposal on the entered link (question 4), so it stays as
  built. Owner review page: `specs/001-bewerbungs-mvp/review/C3.md`.
- Ship mode: **`auto-merge`** (owner decision 2026-10-18, confirmed in the C2
  feedback). This authorizes push, PR, merge after green CI, and the GitHub
  Pages deployment for this product, after each approved gate. C3 work stays
  local until the C3 gate is approved.
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
- Owner instructions (2026-10-19, later): stop working across stories; one
  story after another, each finished, green and committed; delegate only tasks
  of the current story and do not touch files their checks use meanwhile.
  US2 plus the started US3/US5 work go into one commit, then hand over.
- Owner instructions (2026-10-19, C2 gate): commit the feedback file
  unchanged; record the approval and tick T057; ship with `auto-merge`
  (dry run first, check that a new PR is created, check the live URL); then a
  new local branch for C3; fold R1–R4 into spec and tasks for C3 via
  `/speckit-clarify` (questions batched with recommendations, including the
  migration of stored data and the backup format), R5–R6 into a backlog
  section of the spec; record feedback ID → FR/task here; then
  `/speckit-implement` up to the C3 gate T070, one story at a time. Merge the
  delegated tasks of all C3 sessions here by hand (`pnpm models:check` sees
  only the current session). At the C3 gate also write the review steps to
  `specs/001-bewerbungs-mvp/review/C3.md` (German, ≤ 30 lines).

## C3 scope: C2 follow-ups (feedback ID → FR / task)

Source: `specs/001-bewerbungs-mvp/feedback/C2.md`. Clarified with the owner on
2026-10-19 via `/speckit-clarify` (4 questions, all answered with the
recommended option; spec `## Clarifications` Session 2026-10-19). State per
slice below; nothing of C3 is human-accepted.

### C3 progress (evidence per slice)

- **Slice A, storage v2 (T074, T075): implemented and verified.**
  `SCHEMA_VERSION = 2`; upgrade step in `openKandiduDb` (meta version +
  revision only, no record rewrite; a failed step aborts the version-change
  transaction, unhandled `done` rejection silenced); a broadcast after an
  upgrade so an old-version tab shows its reload banner; IndexedDB
  `VersionError` (database from a newer Kandidu) now maps to
  `unsupported-version` instead of `read-failed`. Backup import already
  accepted every data version ≤ current; now proven with the synthetic v1
  fixture `src/storage/fixtures/backup-v1.json`. Tests: `indexeddb.test.ts`
  new "migration 1 → 2" (9 tests: unchanged v1 data, new fields afterwards,
  empty v1 database, damaged v1 record not rewritten, failed upgrade leaves
  version 1, broadcast after upgrade only, newer database refused),
  `schema.test.ts` (v2 field limits), `backup.test.ts` "backup versions" (4
  tests). `KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0 (Biome 118 files,
  dependency-cruiser 111 modules / 389 dependencies, Vitest 26 files / 259
  tests, Playwright 59 passed, 1 skipped). Browser proof of a seeded v1
  database follows in T080.
- **Slice B, "Stelle" (T076, T077): implemented and verified.** Domain:
  `setProjectPosition` (`position-too-long`), `reviseLead(lead, draft,
  { salutationOverride, letterPosition }, now)`, `letterPosition(lead,
  project)` used by `buildCoverLetterData(profile, project, lead, …)`; blank
  values fall through. UI: card "Stelle im Anschreiben (optional)" on the
  links step (unsaved guard), field "Stelle im Anschreiben ({Stelle})" in the
  lead review with the inherited value in its description, help text for
  `{Stelle}`. Tests: `project.test.ts`, `lead.test.ts`, `letterData.test.ts`
  (all fallbacks, blanks, 200/201 chars, locked after release); e2e
  `C3 feedback: Stelle from the project, overridden per lead (R4)` (both
  DOCX, reload). `KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0 (Vitest 263
  tests, Playwright 61 passed, 1 skipped). Observation: lead pages have no
  link back to their project's steps (only "Start"); the e2e navigates by URL.
  Candidate for US7 (overview/management), not changed here.
- **Slice C, prompt and response (T078): implemented and verified.** Prompt
  rules for `sourceUrl` (entered link unchanged), `originalPostingUrl` (only
  when certain; prefer its details such as pay), researched address and
  website (no invented address) and `sources` (≤ 20, incl. the address page).
  Schema: two optional fields, so older answers stay valid. Parser: sources
  never reject an entry (bare URL accepted, duplicates once, non-http or
  missing URL → `url-dropped`, > 20 → `sources-truncated`, not a list →
  `sources-invalid`, titles cut to 200). `createLeadsFromDrafts` takes the
  project links and fills a missing `sourceUrl` when there is exactly one.
  `validateLeadDraft` now requires http(s) for every link field (before:
  length only), so the generic review error also names the links until T079
  adds field errors. Tests: 2 new corpus files (20 in total), `parse.test.ts`
  (+3), `schema.test.ts` (+1), `prompt.test.ts` (+2, incl. project Stelle not
  in the prompt), `lead.test.ts` (+4). `KANDIDU_E2E_PORT=4174 pnpm verify`:
  exit 0 (Vitest 275 tests, Playwright 61 passed, 1 skipped).
- **Slice D, links block (T079 main session, T080 delegated): implemented
  and verified.** `src/ui/lead/LeadLinks.tsx` as the first group of the
  review form: entered link, original posting, portal, company website
  (moved out of their old groups) and an editable sources list (title + URL,
  add/remove, ≤ 20; focus goes to the new URL field, after removal to "Quelle
  hinzufügen"); every valid link also as "Öffnen" (`target="_blank"`,
  `rel="noopener noreferrer"`, name "Öffnen: Feldname (neuer Tab)"); notice to
  check LLM-found links and data; after release a read-only list of links.
  Field errors come from the new pure `leadLinkIssues(draft)` (also used by
  `validateLeadDraft`) after a save attempt, with `aria-invalid` and
  `aria-describedby`. `reviseLead` now also replaces `originalPostingUrl` and
  `sources`. Tests: `lead.test.ts` (+2), `leadForm.test.ts` (+2); e2e
  `C3 a11y: the links block …, also with errors`, `C3 mobile: the links
  block fits 360 px with a long URL`, and 6 delegated `C3 feedback: …` tests
  (prompt rules, block contents and open links, edit/add/remove + reload,
  invalid link not saved, released lead read-only, seeded v1 database
  upgraded to v2). Delegated T080 reviewed: the v1 seed in an init script is
  ordered by the IndexedDB connection queue (seed opens first; the app's
  upgrade waits for the seed connection to close), confirmed with
  `--repeat-each 5` (10 passed). `KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0
  (dependency-cruiser 112 modules / 399 dependencies, Vitest 279 tests,
  Playwright 77 passed, 1 skipped). **C3 Phase A (R1–R4) complete.**
- **US6, lifecycle and comments (T058, T059 main session; T060, T061
  delegated): implemented and verified.** Domain (`lifecycle.ts`):
  `allowedTransitions` exactly per data-model.md, `applyTransition` (dated
  entries `YYYY-MM-DD`; interview `YYYY-MM-DDTHH:mm`, onsite place or online
  http(s) link), `undoableEntry`/`undoLast` (also from terminal states; the
  initial review never; undoing "ready" = "Zurück in den Review" without the
  cover letter PDF), `nextInterview` (for the US7 overview). `lead.ts`:
  `addComment`/`editComment`/`deleteComment` (1–2 000 chars, valid date; new
  codes `comment-invalid`, `comment-not-found`). UI: lead step "Verlauf"
  (`…/verlauf`, `HistoryView.tsx`) with current state and next interview,
  only the allowed transitions, interview form, undo with confirmation
  (focus to the history heading), chronological history with undone entries
  struck through plus text, comment CRUD with inline confirmation and focus
  return. Delegated work reviewed in the main session; no changes needed.
  Tests: `lifecycle.test.ts` (+30: every allowed and 8 forbidden
  transitions, validation, undo cases, next interview), `lead.test.ts` (+2
  comments); e2e `c3-lifecycle.spec.ts` (7 tests: main path, undo incl.
  cover letter PDF, withdrawn, forbidden not offered, comments, invalid
  online link, 360 px), `…/verlauf` added to the axe and 360 px loops.
  `KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0 (Biome 122 files,
  dependency-cruiser 113 modules / 410 dependencies, Vitest 309 tests,
  Playwright 91 passed, 1 skipped).
- **US7, overview, management and deletion (T062–T064 main session, T065
  delegated): implemented and verified.** T062: the cascades existed since
  C1; now proven in `indexeddb.test.ts` (+3: lead delete removes only its
  record and cover letter file, project delete removes responses, leads and
  files but keeps profile/CV, a failing second delete inside the transaction
  leaves everything as before). T063: pure `src/domain/overview.ts`
  (`statusCounts`, `nextDate`, `queryLeads` filter + sort by last activity or
  next interview; 5 tests); Home shows per project the counts per status, the
  next interview and "Antwort ausstehend"; the lead list has a status filter,
  two sort orders, columns "Nächster Termin" and "Letzte Aktivität", and turns
  into one card per lead below 30 rem; lead pages link back to their
  project's lead list (the observation from slice B). T064: delete lead (lead
  list) and project (Home) with confirmations naming what is removed and what
  stays; focus goes to "Abbrechen" when a confirmation opens, back to the
  opening button after cancelling, and to the list heading after deleting;
  the same focus handling for evidence delete and own template removal
  (closes part of the C2 review item "focus falls to body"). A stable
  `focusOnMount` ref callback avoids refocusing on every re-render. The
  delegated T065 found a real defect (cancel did not return focus on Home and
  the lead list: the focus call ran before the re-render); fixed in the main
  session with an effect after the render, then all 12 runs passed. e2e
  `c3-manage.spec.ts` (6 tests: counts/filter/sort, lead delete + IndexedDB
  check, project delete + IndexedDB check, back link, focus after evidence and
  template deletion, 360 px). `KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0
  (Biome 126 files, dependency-cruiser 116 modules / 426 dependencies, Vitest
  27 files / 317 tests, Playwright 103 passed, 1 skipped).
- **T066 accessibility pass (main session): implemented and verified.**
  Closes the C2 review item "focus falls to `<body>`" everywhere it applied:
  removing a tag (→ tag input), a link (→ link input), a package item (→ "PDF
  auswählen"), a package (→ "Weiteres Paket-PDF"), cancelling the backup
  import (→ file picker; `FileField` got an `inputRef`), and every inline
  confirmation that replaces its button (undo and comment delete in
  Verlauf, which the delegated T060 had missed; "Zurück in den Review";
  CV delete; both reset dialogs): focus moves to "Abbrechen" on open and
  back to the opener on cancel, via the new `useReturnFocus` hook and the
  stable `focusOnMount` ref in `src/ui/focus.ts`. New e2e `C3 keyboard:
  Verlauf, comments and every removal keep the focus` (status change,
  comment and undo by keyboard with announcements, then each removal and
  cancel above, axe scan). `KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0
  (dependency-cruiser 116 modules / 432 dependencies, Vitest 317 tests,
  Playwright 105 passed, 1 skipped).
- **T067 localization pass (delegated, reviewed): implemented and
  verified.** Audit: no user-facing text outside `src/ui/i18n/`; domain,
  storage, files and llm only use typed codes. Numbers in catalog texts now
  go through `Intl.NumberFormat("de-DE")` (`plural`, small byte sizes, step
  counter, status counts, partial import, lead count, JSON position, name
  hint). New guard `src/ui/i18n/catalog-usage.test.ts` (fails on JSX text
  or literal `aria-label`/`placeholder`/`title`/`alt` with letters in any
  component; self-check included). New e2e `C3 l10n: views tolerate 40 %
  longer text at 360 px` (13 views with widened letter and word spacing): no
  overflow, no CSS change needed. `KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0
  (Biome 128 files, dependency-cruiser 117 modules / 433 dependencies,
  Vitest 28 files / 352 tests, Playwright 107 passed, 1 skipped).

| Feedback | Timing | Spec | Tasks |
| --- | --- | --- | --- |
| R1 links on top of "Lead prüfen", clickable and editable | next checkpoint (C3) | FR-050 (FR-022, FR-029), US1 scenario 14 | T079, T080 |
| R2 prompt finds the original advertisement; all links stored | C3 | FR-051, FR-013, US1 scenarios 15–16; contracts/llm-response.md | T078, T080 |
| R3 prompt researches address and website | C3 | FR-052, FR-013, US1 scenario 15 | T078, T080 |
| R4 `{Stelle}` on project level (open question answered: default per project, overridable per lead) | C3 | FR-049 (FR-006, FR-022), US1 scenario 17; contracts/placeholders.md | T076, T077 |
| Migration of stored data (owner question, from R1/R2/R4) | C3 | FR-053, US1 scenario 18; data-model.md "Migrations" | T074 |
| Backup format (owner question) | C3 | FR-054, US1 scenario 18; contracts/backup-format.md | T075 |
| R5 cover letter template per project | later | spec "Backlog" | none |
| R6 date in the PDF stays fixed (spike) | later | spec "Backlog" | none |

Assumption (no question, low impact): R3's researched address and website use
the existing editable fields; the links block tells the person to check
LLM-found data before sending (FR-050, FR-052). The project "Stelle" is not
put into the prompt (FR-014 unchanged).

### C3 local review (speckit-reviewer, opus, fresh context)

Verdict before fixes: **not ready, 0 blockers, 4 should-fix, 6 nits**. Fixed in
"fix: address the C3 review findings", then the full `pnpm verify` was rerun
(exit 0, Vitest 28 files / 352 tests, Playwright 109 passed, 1 skipped).

1. **S1** focus fell to `<body>` after a status change in Verlauf, a release
   and a confirmed "Zurück in den Review" (reproduced in a browser). Now
   "Aktueller Stand" or the step's `<h1>`; the C3 keyboard e2e asserts it.
2. **S2** "Ungespeicherte Änderungen" stayed after saving a lead with added or
   removed sources (reproduced). Dirty state compares the normalized content
   (`formSignature`); the e2e checks the hint is gone after saving.
3. **S3** spec edge case vs code for a wrong `sourceUrl`: implemented the
   spec (one project link → it is the entered link) and keep the LLM's other
   link as a source, so no link is lost. **Owner-visible choice**, see
   question 4.
4. **S4** new link fields from storage/backups are now required to be
   http(s) (`originalPostingUrl`, `sources`, interview link); the C1/C2 link
   fields stay length-only so existing data cannot fail to load; the
   interview link renders only if http(s).

Nits fixed: focus after removing the 20th source; no "next interview" for
finished leads; confirmations announced (`role="alert"`); `importedLeadIds`
of deleted leads documented as intended (FR-021 guard). Nits accepted: the
l10n guard is a heuristic (it misses `aria-label={"…"}` and text with
parentheses); STATUS wording fixed below.

### C3 model routing (merged by hand across sessions)

`pnpm models:check` only sees the current session's transcripts, so every C3
session appends its table and delegated task IDs here. C3 so far ran in one
session.

Session 1 (`c8201844…`, 2026-10-19: C2 ship, C3 planning, all of C3, gate).
Routing probe before the first task (`pnpm models:check --require-agent`:
exit 0). At the gate `pnpm models:check`: exit 0, "Routing OK".

| Agent | Models (responses) | Expected | Work |
| --- | --- | --- | --- |
| main session | claude-opus-5-5 (929) | opus | everything not listed below |
| speckit-implementer `afdb02…` | claude-sonnet-5-5 (2) | sonnet | routing probe |
| speckit-implementer `a8b2a5…` | claude-sonnet-5-5 (17) | sonnet | T080 |
| speckit-implementer `a65cde…` | claude-sonnet-5-5 (48) | sonnet | T060, T061 |
| speckit-implementer `a72844…` | claude-sonnet-5-5 (36) | sonnet | T065 |
| speckit-implementer `a66e5b…` | claude-sonnet-5-5 (58) | sonnet | T067 |
| speckit-reviewer `ac2c89…` | claude-opus-5-5 (92) | opus | C3 gate review |

Delegated `[ROUTINE]` tasks in C3 (all sessions): **T060, T061, T065, T067,
T080**. All reviewed in the main session; corrections there: T065's test
exposed a focus defect in main-session code (fixed); T060 missed focus on
undo/comment-delete confirmations (fixed in T066).

## C3 ship result (2026-10-19)

- `pnpm ship --mode auto-merge --dry-run` first: no open PR for branch
  `001-bewerbungs-mvp-c3`, so it planned `gh pr create` (title and body
  file passed, body written from this file).
- PR [#3](https://github.com/markusrt/kandidu/pull/3) "feat: deliver C3 –
  lifecycle, overview and C2 follow-ups". PR check run
  [39235612783](https://github.com/markusrt/kandidu/actions/runs/39235612783):
  `verify` **pass** (2m55s; `pages-check` and `deploy` skipped on PRs by
  design). **Merged** 2026-10-19 10:14:19 UTC (rebase, branch deleted;
  `main` head `b1f4523`). Green on the first attempt, no CI fix needed.
- `main` run: [39236008495](https://github.com/markusrt/kandidu/actions/runs/39236008495),
  jobs `verify`, `pages-check`, `deploy`: all success. PR comment: "Deployed
  b1f4523 to `https://markusrt.github.io/kandidu/`".
- Live URL **<https://markusrt.github.io/kandidu/>** checked 2026-10-19 with
  `curl`: HTTP 200, `lang="de"`, `<title>Kandidu</title>`; the served
  `assets/index-CiEr1xlx.js` contains the C3 texts "Stelle im Anschreiben",
  "Quelle hinzufügen" and "Verlauf", so the C3 build is live.
- The PR body was later amended with the missing "Generated with Claude
  Code" footer (`gh api` PATCH; `gh pr edit` fails on the deprecated
  Projects classic field).
- CI notes (not failures): same as C2 (Node 20 actions forced onto Node 24;
  `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19).

## C2 ship result (2026-10-19)

- `pnpm ship --mode auto-merge --dry-run` first: no open PR for the branch
  (PR #1 with the same branch name is merged), so it planned `gh pr create`.
- Attempt 1: pushed, created PR [#2](https://github.com/markusrt/kandidu/pull/2)
  "feat: deliver C2 – useful and recoverable application workflow". PR check
  run [39208732654](https://github.com/markusrt/kandidu/actions/runs/39208732654):
  **`verify` failed** (`C2 mobile …`, 380 px on `#/einrichtung/vorlagen` on
  the Linux runner), nothing merged, exit 1. Fixed on the same branch (commit
  "fix: keep file pickers inside 360 px on every platform", see C2 "Checks").
- Attempt 2 (dry run: reuses PR #2): PR check run
  [39209264854](https://github.com/markusrt/kandidu/actions/runs/39209264854)
  `verify` **pass** (2m4s); PR #2 **merged** 2026-10-19 06:21:56 UTC (rebase,
  branch deleted; `main` head `c3cc9b0`).
- `main` run: [39209488407](https://github.com/markusrt/kandidu/actions/runs/39209488407),
  jobs `verify`, `pages-check`, `deploy`: all success. PR comment: "Deployed
  c3cc9b0 to `https://markusrt.github.io/kandidu/`".
- Live URL **<https://markusrt.github.io/kandidu/>** checked 2026-10-19 with
  `curl`: HTTP 200, `lang="de"`, `<title>Kandidu</title>`; the served
  `assets/index-esQwCr54.css` contains the fix (`grid-template-columns:
  minmax(0,1fr)`), so the C2 build is live.
- CI notes (not failures): GitHub warns that Node 20 actions are forced onto
  Node 24, and that `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19.

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

## C2 scope and evidence (GATE T057 approved with follow-ups, 2026-10-19)

All C2 tasks T039–T056, T071–T073 and the GATE T057 are ticked. Every story
below is implemented and verified by tests and **approved by the owner at the
C2 gate** (review steps 1–2 tried, no defects; follow-ups R1–R6 in
`feedback/C2.md`). Commits per story (owner rule "one story at a time") on the
local C2 branch: `c715960` (T071), `f5739c0` (US2 + started US3/US5),
`ace67cc` (US3), `e7fba0e` (US4), `5ac1c78` (US5), `d3b184a` (C2 review
fixes), `9c213bf` (gate handoff), `16fc817` (owner feedback). The rebase
merge gives them new hashes on `main`.

### US2 and C1 feedback (ticked in tasks.md)

| Task | Spec IDs | Evidence |
| --- | --- | --- |
| T071 CV download: notice for empty optional placeholders, "Trotzdem herunterladen" only for empty required ones (own commit `c715960`) | FR-024, FR-025 | `placeholders.test.ts`; e2e `C1 CV download …` + journey |
| T039 tags domain (`src/domain/tags.ts`) | FR-010 | `tags.test.ts` |
| T040 `deleteDocument` tests (adapter existed from C1) | FR-009, FR-028, FR-038 | `indexeddb.test.ts`: evidence delete with affected leads, CV delete keeps `cv` items, refused delete changes nothing, no orphaned files |
| T073 delete the global CV PDF (CvStep, confirmation, releases stay) | FR-028, FR-029 | e2e `C2 evidence: deleting the CV PDF …` |
| T041 evidence step `#/einrichtung/nachweise` (upload, tags with suggestions, filter, rename/retag, delete with usage list) | FR-009–FR-011, FR-038, FR-042 | e2e `C2 evidence: upload, tags …` |
| T042 evidence in packages (`PackageEditor`: add by tag filter, remove item, missing-document guard) | FR-030, FR-011 | e2e `C2 evidence: use in a package …` (merged PDF 8 pages) |
| T043 e2e `e2e/c2-evidence.spec.ts` | FR-009–FR-011, FR-030, FR-038 | 6 passed (desktop + mobile) |

US2 (Nachweise) is complete: implemented and verified, not yet human-accepted.

US3 (Mehrere Links und Leads, flexible Pakete), reviewed and finished in the
main session on 2026-10-19, own commit "feat: deliver multi-link projects,
partial import and multiple packages (US3)":

| Task | Spec IDs | Evidence |
| --- | --- | --- |
| T072 edit links (inline edit, field errors, Escape, focus return) | FR-012, FR-013 | `project.test.ts` (`updateLink`); e2e `C2 multi: three links, edit, remove and re-add …` |
| T044 prompt context (≤ 2 000, counter, LLM notice, "Prompt geändert" after copy) | FR-013–FR-015 | `prompt.test.ts`, `project.test.ts` (fingerprint); same e2e |
| T045 partial import + duplicate guard | FR-019–FR-021 | `project.test.ts` (`partialImport`, `findImportedResponse`, new: partly imported response is found again; the guard lives in `project.ts`, not `lead.ts` as the task text said); e2e `C2 multi: partial import …` |
| T046 multiple packages (presets with FR-031 names, add/remove, unique names, saved) | FR-030–FR-033 | `packages.test.ts`; e2e `C2 multi: two package PDFs …` |
| T047 e2e `e2e/c2-multi.spec.ts` | FR-012, FR-013, FR-021, FR-030, FR-031, FR-033 | 8 passed (desktop + mobile) |

Review fixes in US3: the package step lost added/removed/renamed packages
silently when leaving without saving; it now shows "Ungespeicherte Änderungen"
and asks before leaving (same guard as profile, review, links). The e2e now
also checks the FR-031 name suggestions, removing a package and that the ZIP
download saves the definitions.

US4 (Pausieren, Fortsetzen und Fehler überstehen), main session, own commit
"feat: survive pauses, failed writes, full storage and other tabs (US4)":

| Task | Spec IDs | Evidence |
| --- | --- | --- |
| T048 resume after browser restart (`promptState` routing, "Antwort ausstehend", draft kept) | FR-017, FR-046, SC-006 | e2e `C2 resume: … survive a browser restart` (new context from `storageState({ indexedDB: true })`) |
| T049 failed writes: "Nicht gespeichert …" alert with "Erneut versuchen" (repeats the person's own action on the current state) and "Schließen", input kept, focus stays on the triggering control; damaged data → recovery view, never overwritten, confirmed reset (design changed after the C2 review, see "C2 local review") | FR-040, FR-041, SC-006 | e2e `C2 recovery: a failed save …`, `… a full storage …`, `… with full storage, backup export and deleting files still work`, `… a retried response import keeps its response …` (injected `put` failures on data stores: UnknownError, QuotaExceededError), `… damaged stored data …` |
| T050 `#/daten`: local-only notice, usage with 80 % warning, persistence state/request/denial, confirmed reset; upload warning in every file field | FR-042, FR-045 | `quota.test.ts` (threshold, clamping, unusable estimates); e2e `C2 storage: …` (2 tests, faked `StorageManager`) |
| T051 two tabs: banner after a broadcast or a `conflict` write, stale write refused, input kept | FR-044 | `indexeddb.test.ts` (conflict; new: broadcast only after commit, unsubscribe); e2e `C2 multi-tab: …` |
| T052 keyboard-only US1 path (Tab reachability + visible focus checked per element) and axe scans of 16 views + parse-error state | FR-046, FR-047, SC-009 | e2e `C2 keyboard: …`, `C2 a11y: …` (0 critical/serious, WCAG 2.1 A/AA tags) |
| T053 360 px: no horizontal scrolling | SC-010 | e2e `C2 mobile: …` (14 views) |

Findings fixed in US4: axe `label-content-name-mismatch` on the link remove
button (visible "Löschen", name "Link entfernen: …"; now "Entfernen"); lead
review overflowed at 360 px (`fieldset` min-content width); after a reset the
old route showed "Nicht gefunden" (reset now returns to Home). New dev
dependency `@axe-core/playwright` 4.14.0 (exact pin; `pnpm audit`: no known
vulnerabilities).

US5 (Sicherung exportieren und importieren), own commit "feat: export and
import a full backup (US5)":

| Task | Spec IDs | Evidence |
| --- | --- | --- |
| T054 backup storage (manifest, SHA-256, LIESMICH from the catalog, validate first, one replacing transaction, works after a failed load) + `persistenceState()` | FR-043, SC-007 | `backup.test.ts` (15 tests); `indexeddb.test.ts` new: `persistenceState` granted/denied/unsupported/throwing, never prompts |
| T055 backup UI on `#/daten` and in the recovery view | FR-041, FR-043, FR-045 | e2e `C2 backup: export is named by date …` (name `JJJJ-MM-TT_Kandidu_Sicherung.zip`, notice, LIESMICH), `… import asks before replacing, and invalid or newer backups change nothing`, `… the recovery view imports a backup over damaged data` |
| T056 e2e journey (delegated, reviewed) | FR-043, SC-007 | e2e `C2 backup: a full C1 state survives export and import into a fresh browser` (profile, lead, status, ZIP entry names and page counts identical; empty target imports without asking) |

Review fixes on the delegated T056 test: removed a constant snapshot field
that proved nothing; the package page count is now also checked absolutely
(3 = cover letter 1 + CV 2), not only before vs. after.

T054 was started before US3 (storage part, `backup.test.ts` 15 tests: round
trip bit-identical, replace, recovery import, 11 damage cases, stale-tab
conflict); its open points (UI, `persistenceState()` test, backup-specific
"newer version" text) were closed in US5.

### Notes

- "ZIP hang" in the C1 journey (reported by a delegated implementer): not
  reproducible on the finished tree; all C1 journeys passed (11 passed, 1
  skipped by design) and the full `pnpm verify` is green. Most likely that run
  built while `PackageStep.tsx` was being rewritten.
- Process lesson: work ran across US2, US3 and US5 at the same time, so their
  files overlap (`de.ts`, `packages.ts`, `PackageStep.tsx`) and could not be
  committed per story. From now on: one story at a time.
- On this machine port 4173 is taken: run e2e and verify with
  `KANDIDU_E2E_PORT=4174`.

### Checks (2026-10-19, Node 24.21.0, pnpm 10.34.7)

- **First C2 ship attempt failed in CI** (PR #2, run 39208732654, job
  `verify`): `C2 mobile …` found 380 px width on `#/einrichtung/vorlagen` on
  the Linux runner (desktop and Pixel 7); nothing was merged. Cause: `.field`
  is a grid whose column grew to the file picker's minimum width, which
  depends on the platform's fonts (narrower on Windows, so the local gate run
  passed). Fix: `.field` column `minmax(0, 1fr)` and `max-width: 100%` on file
  inputs; the mobile e2e now widens the file picker text itself, so it fails
  without the fix on Windows too (checked: 2 failed without, passed with).
  Then **`KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0** (Vitest 26 files / 245
  tests; Playwright 59 passed, 1 skipped). Ship rerun on the same open PR.

- **Gate run, after the C2 review fixes: `KANDIDU_E2E_PORT=4174 pnpm verify`:
  exit 0.** Biome 117 files; `tsc -b` ok; dependency-cruiser 111 modules /
  388 dependencies, no violations; Vitest **26 files / 245 tests**; build ok;
  Playwright **59 passed, 1 skipped** (the size test runs on the chromium
  project only, by design). Specs: `c1-lead-journey`, `c1-package-size`,
  `c2-evidence`, `c2-multi`, `c2-recovery`, `c2-a11y`, `c2-mobile`,
  `c2-backup`, each on Desktop Chrome and Pixel 7 with the network guard.
- `pnpm audit` after adding `@axe-core/playwright`: no known vulnerabilities.
- `pnpm models:check`: exit 0, "Routing OK" (table under "C2 model routing").

- After US5: **`KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0.** Biome 117 files;
  `tsc -b` ok; dependency-cruiser 111 modules / 388 dependencies, no
  violations; Vitest 26 files / **245 tests**; build ok; Playwright **53
  passed, 1 skipped**.
- After US4: **`KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0.** Biome 115 files;
  `tsc -b` ok; dependency-cruiser 110 modules / 377 dependencies, no
  violations; Vitest 26 files / **244 tests**; build ok; Playwright **45
  passed, 1 skipped**.
- After US3: **`KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0.** Biome 108 files;
  `tsc -b` ok; dependency-cruiser 106 modules / 361 dependencies, no
  violations; Vitest 25 files / **238 tests**; build ok; Playwright **25
  passed, 1 skipped**. Note: `pnpm test:e2e` alone serves the existing `dist`
  through `vite preview`, so run `pnpm build` first (a stale build made a
  single e2e run fail once during US3).

Earlier run (US2 commit):

- **`KANDIDU_E2E_PORT=4174 pnpm verify`: exit 0.** Biome 108 files; `tsc -b` ok;
  dependency-cruiser 106 modules / 360 dependencies, no violations; Vitest
  **25 files / 237 tests** passed; `vite build` ok; Playwright **25 passed, 1
  skipped** (C1 journeys, `c2-evidence`, draft `c2-multi`).
- `pnpm models:check`: exit 0, "Routing OK".

| Agent | Models (responses) | Expected |
| --- | --- | --- |
| main session | claude-opus-5-5 (381) | opus |
| speckit-implementer (probe) | claude-sonnet-5-5 (2) | sonnet |
| speckit-implementer T039 | claude-sonnet-5-5 (18) | sonnet |
| speckit-implementer T041 | claude-sonnet-5-5 (46) | sonnet |
| speckit-implementer T043 + T047 (stopped by the main session) | claude-sonnet-5-5 (40) | sonnet |

Delegated: T039, T041, T043 (+ T047 draft). Reviewed in the main session; fixes
there: `suggestTags` no longer throws on over-long input, evidence list layout
class, two e2e locator races in `c2-evidence.spec.ts` (identical status text;
edit-mode heading).

### C2 model routing (session of US3–US5 and the gate)

`pnpm models:check`: exit 0, "Routing OK".

| Agent | Models (responses) | Expected |
| --- | --- | --- |
| main session | claude-opus-5-5 (452) | opus |
| speckit-implementer T056 | claude-sonnet-5-5 (26) | sonnet |
| speckit-reviewer (C2 gate review) | claude-opus-5-5 (66) | opus |

Delegated `[ROUTINE]` tasks in C2: **T039, T041, T043, T047 (draft), T056**.
All other C2 tasks were done in the main session (US3 review, all of US4,
T054/T055 and the review fixes).

### C2 local review (speckit-reviewer, opus, fresh context)

Verdict before fixes: **not ready, 1 blocker, 4 should-fix**. All fixed in the
commit "fix: address the C2 review findings", then the full `pnpm verify` was
rerun (see Checks).

1. **Blocker B1**: during the first retry design, a failed write held the
   write queue open; a draft autosave built from the older project could run
   after the retried response import and drop the stored response (FR-020),
   which also disabled the FR-021 duplicate guard. Fix: a failed write no
   longer holds anything. "Erneut versuchen" repeats the person's own action
   (clicks the triggering button again or re-submits its form), so it always
   runs on the current state; `commit()` hands the latest saved snapshot to the
   write when it runs, and the draft autosave builds its project from it.
   Background autosaves get no retry button (they retry on the next change)
   and never hide an open retry. New e2e `C2 recovery: a retried response
   import keeps its response, so pasting it again asks first`.
2. **S1** full storage had no in-app way out while the failure was open. Now
   nothing is blocked; backup export depends only on its own task. New e2e
   `C2 recovery: with full storage, backup export and deleting files still
   work`.
3. **S2** failure alert lost focus. Focus now stays on (or returns to) the
   control that started the write; the alert closes on navigation. The e2e
   checks focus; axe scans now also cover the failure alert, the recovery view
   and the backup confirmation.
4. **S3** a tag typed without Enter was dropped on upload/save. Now it is
   taken over on save, with a hint below the field. New e2e `C2 evidence: a tag
   typed without Enter is kept on upload and on save`.
5. **S4** STATUS claims: backup test count (15, not 17), outdated limits, C1
   rows that read as pending, missing T056 routing entry. Corrected here.

Nits fixed: `suggestTags` could still throw during render for inputs whose
lower case is longer ("İ" × 21; unit test added); backup replace confirmation
announced (`role="alert"`); restore returns to Home like reset; `busy` is
derived from pending writes and the reset/restore lock; retry is idempotent;
read errors of the picked backup file are shown; tag list sentence moved into
the catalog; `exportBackup` no longer uses `this`; no "storage almost full"
upload warning on the backup import field.

Remaining (not fixed, for C3 or later):
- Focus after removing an element (tag, link, package, evidence edit/delete,
  closing the backup confirmation) falls to `<body>`.
- No size cap before reading a backup file into memory.
- T073: the gate step's "CV missing" state is not asserted in e2e (the
  package step's is).
- No unit tests for `commit()` itself (proved through e2e only) and none for
  `importBackup` aborting on a full disk mid-transaction.
- Accepted from C1: permission-restricted PDF merge checks page count only;
  `response.issue()` composes field + verb in one catalog function.

## Clarifications recorded (2026-10-18, spec `## Clarifications`)

1. CV PDF: uploaded once, global for all leads, no per-lead override.
2. Lifecycle: main path review → ready → sent → interview (repeatable) →
   accepted | rejected; plus withdrawn and failed; last change undoable.
3. Prompt: optional user-written context per project, off by default, shown in
   the prompt with a notice; never profile data.
4. Limits: 20 MB per PDF, 10 MB per DOCX; quota warning at 80 %; request
   persistent storage with explanation.

## C1 scope and spec IDs (history: state at C1 acceptance)

Rows that say "US3/US4/US5 (C2)" are done now; see "C2 scope and evidence".

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

- Data lives only in this browser profile (IndexedDB). It is not encrypted and
  can be evicted or cleared; the backup ZIP (US5) is the only safeguard and is
  itself unencrypted personal data. Persistent storage is requested only on
  the person's click; browsers may refuse it.
- No Word/LibreOffice on the agent machine: "opens without repair prompt" is
  unverified by automation (SC-002).
- Browser coverage: automated tests run in Chromium (Desktop Chrome, Pixel 7
  emulation) only; Firefox/Safari are not tested. Quota and persistence are
  faked in e2e (`StorageManager`), write failures are injected; a real full
  disk was not produced.
- The app cannot check what the LLM researched: the original posting,
  researched address, website and sources are only as good as the LLM's web
  access; the links block asks the person to check them (FR-050–FR-052).
  The prompt asks for them but a model without web access will leave them
  empty.
- Dates in the cover letter and CV PDFs are fixed when the person creates
  the PDF (R6, backlog spike); `{Datum}` is only current in the DOCX.
- Data migration: stored data and backups of version 1 are upgraded
  automatically (FR-053, FR-054); a C2 tab that stays open during the
  upgrade can no longer save and shows its reload banner. There is no
  downgrade: after opening C3 once, a C1/C2 build cannot open the database
  any more and shows its recovery view as a read error (the mapping to
  "newer version" exists only from C3 on); do not use "zurücksetzen" there.
  Only relevant for local builds; Pages always serves the latest build.
- SC-001 (≤ 15 minutes for a first-time person) and SC-002's Word/
  LibreOffice round trip need a person; they are not measured by automation.
- On narrow screens the lead table is shown as one card per lead with CSS
  `display` changes; some screen readers (older Safari) may then announce it
  less as a table. The header labels are repeated per cell, so content stays
  understandable.

### Restart and resume (T069)

- Use the app: open <https://markusrt.github.io/kandidu/> (public build of
  `main`) or a local server. Everything is stored in the browser profile
  that was used; reopening the same browser resumes where the person left
  (projects open at the step of their prompt state, FR-017).
- Local server after a session ended: `pnpm install --frozen-lockfile`, then
  `pnpm dev --host 127.0.0.1 --port 5173 --strictPort`, open
  `http://127.0.0.1:5173/` on the same machine (loopback only). Port taken →
  pick another `--port`; the data is per origin, so a different port starts
  with empty data (export a backup on the old origin and import it).
- Checks: `KANDIDU_E2E_PORT=4174 pnpm verify` on this machine (VS Code holds
  4173); `pnpm test:e2e` alone needs `pnpm build` first.
- Lost browser data or a new device: "Daten" → "Sicherung importieren" with
  the latest `JJJJ-MM-TT_Kandidu_Sicherung.zip`.
- Agent environment: drive C: was 100 % full during part of this session (tests
  ran with TMP/TEMP on D:), and the owner's PC crashed (bluescreen) before the
  first feature commit. After the crash: `git fsck` clean, no empty/NUL files,
  full `pnpm verify` green. The temporary safety ref `refs/backup/c1-wip` no
  longer exists (`git for-each-ref refs/backup` empty, 2026-10-19). Not
  product issues.

## Questions for the owner

C1 decision and ship mode: answered 2026-10-18 (approve, `auto-merge`).

1. ~~CV download shows „Trotzdem herunterladen“ whenever optional profile fields
   are empty. Keep or warn only for required fields?~~ **Answered 2026-10-19**:
   empty optional placeholders only give a notice; the confirmation stays for
   empty required ones (spec `## Clarifications` Session 2026-10-19, FR-025,
   task T071).
2. Trademark search (DPMA/EUIPO/WIPO) before any public launch (open item from the
   brief; the 2026-10-18 web/domain check is not a clearance). Nonblocking.
3. ~~C2 decision: approve C2, or request changes.~~ **Answered 2026-10-19**:
   approved with follow-ups R1–R6, ship mode `auto-merge`
   (`specs/001-bewerbungs-mvp/feedback/C2.md`).
4. Entered link (review S3): with exactly one project link, Kandidu now
   uses it as the lead's "eingegebener Link" even if the LLM answers with
   another link; that other link is kept as a source. Keep this, or keep
   the LLM's link? Recommendation: keep (the entered link is known for
   sure). Nonblocking for acceptance unless you want it changed.
   **Answered 2026-10-19 implicitly**: C3 accepted without change requests, so
   the behavior stays (the owner may still reverse it as a follow-up).
5. ~~C3 decision.~~ **Answered 2026-10-19**: C3 accepted, ship mode
   `auto-merge`. Open and nonblocking: whether to plan R5/R6 from the backlog
   as a next feature.

## Review steps for the owner at C3 (≤ 3)

The owner-facing page (German) is `specs/001-bewerbungs-mvp/review/C3.md`.
Review URL: **<http://127.0.0.1:5173/>**, checked 2026-10-19 with `curl`:
HTTP 200, `lang="de"`, title "Kandidu"; it serves the current C3 tree
(`/src/storage/schema.ts` has `SCHEMA_VERSION = 2`, `leadForm.ts` has
`formSignature`). That Vite dev server was already running (PID 16808,
started 2026-10-19 06:15 from this repository, not by this session); it
reads the working tree, so it shows the checked-out branch. Loopback only;
it may not survive. Restart: `pnpm install --frozen-lockfile`, then
`pnpm dev --host 127.0.0.1 --port 5173 --strictPort`. Data stored on that
origin during the C2 review is upgraded to version 2 on first open (FR-053).

## Review steps for the owner at C2 (≤ 3, done: steps 1–2 tried, approved)

The dev server was started with `pnpm dev --host 127.0.0.1 --port 5173
--strictPort` and answered on **<http://127.0.0.1:5173/>** (HTTP 200,
`lang="de"`, title "Kandidu"). Loopback only: reachable on this machine, not
from other devices; it runs only while the agent session's process lives. If
it is gone: `pnpm install --frozen-lockfile`, then the same command.

1. Open `http://127.0.0.1:5173/` and try US2 + US3 with synthetic data
   (setup as in quickstart.md "Manual C1 walkthrough"): "Nachweise" (upload two PDFs, tags with and without
   Enter, filter, rename, delete), a project with three links (edit one), paste
   `src/llm/fixtures/valid-three-leads.txt`, release one lead, "Paket" with two
   package PDFs → ZIP.
2. Try US4 + US5: copy a prompt, close the browser, reopen → "Antwort
   ausstehend"; "Daten" → "Sicherung herunterladen", then in a private window
   "Sicherung importieren" and compare; optionally open two tabs and change
   something in one; and keyboard only / phone width (DevTools 360 px).
3. Decide: approve C2 (ship via `auto-merge`) or name the changes you want.

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

- Worktree: C1, C2 and C3 are merged into `main` (head `b1f4523`, PR #3)
  and live. The C3 commits got new hashes in the rebase merge (local
  `b20edb7` gate handoff → `b4700e4`, `6555159` acceptance → `b1f4523`).
  This ship record is one local commit on `001-bewerbungs-mvp-c3-ship`
  (not pushed); it reaches `main` with the next PR (rebase the next feature
  branch onto it, or ship it on its own after the owner says so). Clean
  after it. No stash, no `refs/backup/*`.
- **Exact next action (state after the merge):** C3 is on `main` and live at
  <https://markusrt.github.io/kandidu/>; the branch `001-bewerbungs-mvp-c3` is
  deleted by the merge, and the MVP (001-bewerbungs-mvp) is complete. Start a
  new branch from `origin/main` only for a follow-up feature: `/speckit-specify`
  for R5 (cover letter template per project) and/or R6 (date in the PDF stays
  fixed, spike), from the spec's "Backlog", after the owner confirms scope.
  Nothing of it is started.

## Subsequent handoff schema

Keep this file current in the same behavior-changing change: date; branch and
existing commit/reference; actual worktree state; active feature
(`specs/NNN-*`); checkpoint/scope/approval; spec IDs (US, `FR-`, `SC-`) with
planned/implemented/verified/accepted states; exact commands and outcomes
(including not run); preview reachability and restart commands;
assumptions/limits/questions; one next action. Never inherit test evidence or
acceptance into a copied product without rechecking it.
