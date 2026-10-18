# Current handoff

## Checkpoint and authorization

- Updated: 2026-10-18.
- Repository/branch: `markusrt/mvp-starter`, `copilot/populate-mvp-starter`.
- Checkpoint: **starter accepted; squash-merged to `main` via PR #1**. This is
  not C1 of any product. No product feature exists in `specs/`.
- Active feature: none. The starter ships no sample spec (ADR 004).
- Approval: owner requested the Spec Kit migration on 2026-10-18, which covers
  the constitution move/amendment (v2.0.0, later v2.1.0) recorded in ADRs 004
  and 005, and the ship flow (ADR 007).
- Human acceptance of the starter: **accepted on 2026-10-18**. The owner made
  the repository public, enabled GitHub Pages (source: GitHub Actions,
  `https://markusrt.github.io/mvp-starter/`), and explicitly asked to
  squash-merge PR #1 into `main`. The resulting deployment is evidence for
  the next change; it is not recorded here in advance.
- Prior commits: `ad5a7c0` (starter implementation), `8b79d3e` (initialization
  wording). Inspect actual `git status --short` and `git log` on resume.

## What changed and actual evidence

2026-10-18 Spec Kit migration:

- Constitution moved to `.specify/memory/constitution.md` in Spec Kit format,
  same rules, plus explicit C1–C3 checkpoints and mandatory tests.
- `docs/SPEC.md` (demo spec S1–S7) removed. Product specs come from
  `/speckit-specify` under `specs/NNN-*/`. Demo e2e titles no longer cite S-IDs.
- `.specify/templates/overrides/tasks-template.md` adds C1–C3 GATE tasks,
  mandatory tests, stack paths, and per-slice commits.
- `biome.json` excludes tool-managed `.specify/`.
- AGENTS.md, BOOTSTRAP-PROMPT.md, README.md, ADR 003 updated; ADR 004 added.

2026-10-18 language policy (owner request): constitution v2.1.0 adds principle
XII and ADR 005. Spec language is the user's best-fit language (default: the
brief's). Technical docs and code are English. Spec Kit structure (headings,
markers, IDs) stays English. The UI defaults to the spec language through a
message catalog. AGENTS.md, BOOTSTRAP-PROMPT.md (SPEC/UI LANGUAGE fields),
README, and the tasks override (catalog setup T003, C3 localization pass)
updated. Basis: grep of specify-cli 1.2.1 scripts found no content parsing, and
the skills reference only the English markers listed in ADR 005. Not run: no
non-English `/speckit-*` session yet.

2026-10-18 ship flow and GitHub Pages (owner request, ADR 007): gates now
include a local review (`.claude/agents/speckit-reviewer.md`, opus, read-only)
and local feedback before shipping. `scripts/ship.mjs` (`pnpm ship`) supports
`expert-review` and `auto-merge`. CI gains `pages-check` and `deploy` jobs for
`main`. `models:check` expects the reviewer on opus and gains `--require <type>`.
AGENTS.md, BOOTSTRAP-PROMPT.md (SHIP MODE), and README are updated. The README
no longer claims the template flag is off: the API reports `is_template: true`.
Evidence: workflow YAML parses (jobs verify → pages-check → deploy); action SHAs
resolved from each action's latest release tag (configure-pages v6.0.0,
upload-pages-artifact v5.0.0, deploy-pages v5.0.1); a base-path build
(`vite build --base /mvp-starter/`) emits `/mvp-starter/assets/...` and the
default build is unchanged. `ship.mjs` exits 2 on usage errors and 3 on a dirty
tree; further dry runs are below. Repository facts: private, free plan, Pages
404, branch protection 403, auto-merge setting off. Not run: real push, PR
merge, CI deploy, or live URL check, because merging is the owner's decision.
The first real run must be watched.

2026-10-18 routing sanity check (owner request): `scripts/check-model-routing.mjs`
(`pnpm models:check`) and an AGENTS.md procedure (probe before the first
implementation task, table at every GATE, stop on mismatch). Tested on real
local transcripts: this Opus-only session gives exit 0, and exit 1 with
`--require-agent` ("speckit-implementer (never ran)"). A Unity session with
Explore subagents on Haiku 4.5 gives a correct mismatch for its Sonnet 4.6
main session and the wrong Explore expectation (exit 1). An unknown project
gives exit 2. Biome passes.

2026-10-18 model routing (owner request, ADR 006): `.claude/agents/
speckit-implementer.md` (`sonnet`, effort `medium`) implements `[ROUTINE]` tasks.
The main session (`opus`) keeps planning, untagged tasks, review, verify,
commits, and gates. The tasks override defines and samples `[ROUTINE]`;
AGENTS.md, BOOTSTRAP-PROMPT.md (MODELS field), and README are updated.
Evidence: specify-cli 1.2.1 source shows workflow steps accept `model:` but
dispatch headless `claude -p` (option rejected, see ADR). `specify init --here`
on a scratch copy left the subagent file byte-identical, and the PowerShell
template resolver returns the tagged override. Not run: no live delegation
(it needs a product and spends model usage); subagent fields are checked
against the Claude Code docs only.

2026-10-18 localization-ready skeleton (owner request): domain throws
`ItemError` codes and storage `StoreError` codes instead of English text. All UI
text lives in `src/ui/i18n` (typed `Messages`, `en` catalog, locale registry,
`errorMessage`; unknown errors show a generic message, never raw technical
text). `src/main.tsx` sets `<html lang>` and the title. `TITLE_MAX` is shared by
domain, schema, input, and message. English wording is unchanged. On Node
24.21.0: **`pnpm verify` passed** (22 files linted, 17 modules/28 dependencies
with no violations, **15 unit tests** including 3 new catalog tests, build,
**8 Playwright scenarios** unchanged and passing). One behavior change: invalid
data at save time now shows the generic catalog message instead of a raw
validation error.

2026-10-18 Node upgrade (owner request): pin raised from 22.23.3 to **24.21.0**
(Active LTS) in `.node-version`, `.nvmrc`, `engines`; `@types/node` 22.20.5 →
24.19.2; ADR 001, AGENTS.md, README updated. CI reads `.node-version`. On Node
24.21.0 with pnpm 10.34.7: `pnpm install --frozen-lockfile` succeeded, **`pnpm
verify` passed** (18 files linted, 13 modules/14 dependencies with no violations,
12 unit tests, build, 8 Playwright scenarios), `pnpm audit`: no known
vulnerabilities. Node 24.22.0 (2026-10-14) exists; 24.21.0 was chosen to match
the owner's installed runtime.

Spec Kit migration commands, run earlier on 2026-10-18 under the previous Node
22.23.3 pin (portable Node with corepack pnpm 10.34.7):

- `specify init sk-probe --integration claude --script sh --non-interactive`
  (specify-cli 1.2.1, scratch copy): generated `.claude/skills/speckit-*` (10)
  and `.specify/` (memory, scripts, templates, workflows). No git repository or
  CLAUDE.md/AGENTS.md created.
- Biome on that initialized copy with the old config: **5 format errors** in
  generated `.specify/*.json`; with the `.specify` exclusion: **pass**.
- `specify init --here --force` on a scratch copy of this working tree:
  existing constitution **preserved**, no tracked file modified,
  `resolve-template.sh tasks-template` returns the GATE override, and Biome passes.
- `pnpm install --frozen-lockfile`: succeeded.
- **`pnpm verify`: passed.** Biome (18 files); typecheck; dependency-cruiser
  (13 modules, 14 dependencies, no violations); **12 unit tests**; production build
  (known Zod comment warnings only); **8 Playwright scenarios** (chromium + mobile).
  The first run failed on formatting from the e2e title change; fixed with
  `biome format --write`, then rerun green.
- `pnpm dev --host 127.0.0.1 --port 5173 --strictPort`: `http://127.0.0.1:5173/`
  returned HTTP 200 with the demo page title. Loopback only, on the agent's machine.

Not run: no `/speckit-*` command was executed end to end, because that needs a
product brief.

Hosted CI (2026-10-18): pushing `0af0a7c` with `pnpm ship --mode expert-review`
(the first real ship run; it reused PR #1) ran the workflow on GitHub for the
first time. Push [run 39121570064](https://github.com/markusrt/mvp-starter/actions/runs/39121570064)
and PR [run 39121572288](https://github.com/markusrt/mvp-starter/actions/runs/39121572288):
`verify` passed, and `pages-check`/`deploy` were skipped as designed (not
`main`). PR #1 was retitled, marked ready for review, and GitHub reports it
`mergeable_state: clean`. Local `gh` 2.30.0 fails on `gh pr edit` (a GraphQL
projectCards removal), so the REST API was used; `ship.mjs` does not depend on
`pr edit`.

Earlier 2026-10-16 evidence (pnpm audit clean, CodeQL zero alerts, live browser
inspection) applies to unchanged application code. It was not re-executed.

## Start / review / resume

1. `pnpm install --frozen-lockfile`, then
   `pnpm dev --host 127.0.0.1 --port 5173 --strictPort`; the walking skeleton
   still runs at the printed local URL.
2. Read README "Make an independent project", BOOTSTRAP-PROMPT.md, and the GATE
   tasks in `.specify/templates/overrides/tasks-template.md`. Optionally try it
   in a scratch copy: `specify init --here --integration claude`, paste the prompt.
3. The demo walking skeleton is kept: the owner had it made localization-ready
   instead of stripping it.

The dev server may not survive the session; restart with the command above.
After the merge, `main` deploys the demo to `https://markusrt.github.io/mvp-starter/`.

Fresh agent: read constitution → AGENTS → this status → active `specs/` feature
(none) → relevant ADRs. No starter gate is pending.

## Limits, decisions, and next action

- Discardable nonsensitive demo only; no backup/export, auth, backend, sync,
  conflict resolution, or PWA/offline loading. Static GitHub Pages deployment
  per ADR 007. Storage limits: ADR 002.
- The tasks override copies the spec-kit 1.2.1 core template. On Spec Kit
  upgrades, diff the core template against the override (ADR 004).
- Spec Kit needs Python and `uv` on each machine that runs `specify`.
- `.sh` scripts are generated locally per product by `specify init`
  (`--script sh|ps`); the starter commits none.
- No license chosen. The repository is public and marked as a template.
- Ship flow not yet exercised end to end: the first `main` deployment happens
  with this merge, and `auto-merge` has not run.
- **Exact next action:** owner creates the first product repository (`kandidu`)
  from this template, runs `specify init --here --integration claude`, and starts
  `claude --model opus` with the Kandidu bootstrap prompt.

## Subsequent handoff schema

Keep this file current in the same behavior-changing change: date; branch and
existing commit/reference; actual worktree state; active feature
(`specs/NNN-*`); checkpoint/scope/approval; spec IDs (US, `FR-`, `SC-`) with
planned/implemented/verified/accepted states; exact commands and outcomes
(including not run); preview reachability and restart commands;
assumptions/limits/questions; one next action. Never inherit test evidence or
acceptance into a copied product without rechecking it.
