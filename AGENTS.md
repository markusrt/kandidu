# Agent operating guide

These instructions apply to any agent or human contributor; no vendor-specific
memory or agent service is required. Specs follow GitHub Spec Kit
([ADR 004](docs/adr/004-spec-kit.md)); delivery stops at human checkpoints.

## Start or resume

Read, in order:

1. `.specify/memory/constitution.md`
2. `AGENTS.md`
3. `docs/STATUS.md` (current feature, checkpoint, pending gate, next action)
4. The active feature's `specs/NNN-*/spec.md`, `plan.md`, and `tasks.md`
5. Relevant decisions in `docs/adr/`

Inspect the worktree, branch, available tools, package scripts, and existing work.
Check that Spec Kit is initialized: `.specify/scripts/` and your agent's
`speckit-*` commands/skills exist. If they are missing, ask the human to run
`specify init --here --integration <agent>` (see README); do not hand-write
Spec Kit artifacts. The scripts live in
`.specify/scripts/bash/` (script type in `.specify/init-options.json`). If the
`specify init` output is uncommitted, commit it first as
`chore: initialize Spec Kit`, separate from feature work. Do not infer completion from a document or prior
conversation: compare claims with files and recorded evidence. Resume from the
next action in status; repository documents, not chat history, are the handoff.

After an interruption (crash, usage limit, ended session), re-run every GATE
step whose evidence has not reached `docs/STATUS.md` (verify, review, server
check): a handoff counts only once STATUS records it. A new session may inherit
a model chosen with `/model` elsewhere; check it with `pnpm models:check`.

For a new product from this starter, follow `BOOTSTRAP-PROMPT.md`. The starter
ships no product spec: the first feature's spec is the product spec, starting at
C1. Starter demo code is a walking skeleton, not requirements; starter evidence
and review gates are not product progress or product blockers. For an existing
product, preserve its specs/history and honor its pending gates instead.

## Spec Kit flow

| Step | Command | Autonomy |
| --- | --- | --- |
| Spec | `/speckit-specify <brief>` | Autonomous. Mark unknowns `[NEEDS CLARIFICATION]`. |
| Clarify | `/speckit-clarify` | Ask blocking questions (≤5, each with a recommended answer). Stop only if an answer changes acceptance, domain, privacy, retention, paid usage, external access, or architecture. |
| Plan | `/speckit-plan` | Autonomous. Default to the stack in ADR 001; a departure needs an ADR and approval. Choose the delivery mode (Full, Light, Spike; constitution "Delivery modes") and record it with its reason in plan.md and STATUS. |
| Tasks | `/speckit-tasks` | Autonomous. The override template inserts the GATE tasks of the delivery mode (Full: C1–C3; Light: C3; Spike: C1). |
| Analyze | `/speckit-analyze` | Autonomous. Fix inconsistencies before implementing. Every implementation task cites the `FR-`/`SC-` IDs it satisfies; list remaining coverage gaps in STATUS. Then commit the planning slice (`docs: specify and plan <feature>`). |
| Implement | `/speckit-implement` | Autonomous until the next GATE task, then stop. |
| Feedback | `/speckit-clarify` or spec edit, then `/speckit-tasks` / `/speckit-converge`, then `/speckit-analyze` | After a human decision at a gate. Hand edits to tasks.md are fine for a few tasks; analyze still runs before implementing. |

### Model routing (ADR 006)

The main session runs on the planning tier and owns everything that needs
judgment: specify, clarify, plan, tasks, analyze, untagged tasks, reviewing
delegated work, `pnpm verify`, commits, and GATE handoffs. During
`/speckit-implement`, delegate tasks tagged `[ROUTINE]` to a faster model, then
review the diff and tick the tasks yourself. Delegate a coherent batch (for
example one story's routine tasks) with the task IDs and feature directory,
not one call per line. Redo or take over delegated work that fails checks or
reports a stop.

| Role | Claude Code | Override |
| --- | --- | --- |
| Planning and judgment (main session) | `opus` (start with `claude --model opus`, or `/model opus`) | `fable` for unusually hard products |
| `[ROUTINE]` tasks | `speckit-implementer` subagent: `sonnet`, effort `medium` | `model:` in `.claude/agents/speckit-implementer.md` |
| Pre-PR review at a GATE | `speckit-reviewer` subagent: `opus`, effort `high`, read-only | `model:` in `.claude/agents/speckit-reviewer.md` |

Other agents: use their subagent/model mechanism if they have one, otherwise
implement all tasks in the main session. Routing never relaxes the rules:
delegated work meets the same tests, boundaries, and checks.

Routing sanity check (Claude Code). `pnpm models:check` reads this session's
local transcripts read-only and reports the models that actually answered, per
agent. Exit 0 = routing OK, 1 = mismatch, 2 = no transcript.

1. Before the first implementation task of a feature, delegate a harmless
   read-only probe to `speckit-implementer` (for example: "Read package.json and
   report `engines.node`. Make no edits."), then run
   `pnpm models:check --require-agent`. It must show the main session on
   `opus` and `speckit-implementer` on `sonnet`.
2. At every GATE, run `pnpm models:check` and record its table in
   `docs/STATUS.md` with the delegated task IDs.
3. On a mismatch, stop and report it with the table. Do not silently continue
   on a single model. Typical causes: the session wasn't started with
   `--model opus`; `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set; or an organization
   `availableModels` allowlist blocks the model.

### Language (constitution XII, ADR 005)

| What | Language |
| --- | --- |
| Chat with the user, clarify questions, gate review steps | Spec language |
| `spec.md` prose, its checklists, clarification answers | Spec language |
| Headings, `[NEEDS CLARIFICATION]`, `## Clarifications`, `GATE`, IDs | English, always |
| Constitution, AGENTS, README, ADRs, STATUS, plan, tasks, code, tests, commits | English |
| UI | Default locale = spec language, via message catalog |

Spec language is the language of the user's brief unless they name another; the
spec records it as `**Spec Language**: <BCP 47 tag>`. If a user switches
language mid-project, ask before changing the recorded spec language.
Subagent reports and tool output are English; keep writing to the human in the
spec language anyway, including progress messages.

The constitution is amended only through `/speckit-constitution` with explicit
human approval and an ADR. `/speckit-checklist` is optional; unchecked checklist
items make `/speckit-implement` ask before proceeding.

## Autonomy and gates

- Independently perform reversible implementation, local inspection, and checks
  within the approved spec and environment permissions.
- Ask for decisions that change product acceptance, domain rules, privacy,
  retention, paid usage, external access, destructive operations, or architecture
  commitments. Do not substitute plausible guesses for those decisions.
- Batch at most five blocking questions, each with a recommended answer and its
  consequences. Track nonblocking questions without stopping unrelated work.
  A pending approval is a stop gate for the affected action.
- A GATE task in `tasks.md` is a hard stop: do not mark it done or start later
  phases until `docs/STATUS.md` records an explicit human decision.
- Preserve unrelated and uncommitted work. Do not use destructive Git operations,
  rewrite history, bypass checks, expose secrets, or alter unrelated files.
- Local branches are reversible and always allowed: work on a local feature
  branch from the feature's first commit, never on `main`. Push, PR creation,
  merging, deployment, and paid services
  require authorization. A product grants them through its recorded ship mode
  (see Ship); `local-only` grants none. For the current starter assignment,
  branch work, pushing, and opening/updating its PR are authorized; merging and
  deployment are not. Grants do not transfer to copied projects. Spec Kit's
  optional git extension creates branches, so install it only with that
  authorization.
- Changes to the constitution require human approval plus an ADR. Material
  departures from recorded architecture/process decisions need an ADR and the
  appropriate approval before implementation.
- Standing instructions from the human (working rules) go into the repository,
  in a "Project working rules" section of this file, never only into agent
  memory. If one was saved in agent memory, move it here and delete the memory
  entry.

## Working rules

- Edit files with the agent's edit/write tool. Use the shell for commands
  (tests, git, generators) and for bulk mechanical changes only, not for
  scripted edits of single files. Never run commands that wait for stdin.
- Scratch and probe files go to the session's scratchpad or temp directory,
  never into `src/` or other tracked folders.
- Before discarding or reshaping uncommitted work, save it in git
  (`git stash push -u`, or `git commit-tree` into `refs/backup/<name>`), not
  only in temp files. Delete such refs once the work is committed.
- While a delegated task runs its checks, do not edit files those checks build
  or test. After stopping a subagent that runs tests or servers, check its
  ports and child processes before the next check.

## Context budget

Every turn reprocesses the whole conversation, so session size drives cost.
The repository is the handoff; a long chat adds cost, not information.

- Start a fresh session at every GATE and after the planning commit. Within a
  checkpoint, once the context passes about 250k tokens, stop at the next story
  boundary, write a "`C<n>` in progress" section in STATUS (done, started
  with open points, not started, known problems, checks), commit, and tell the
  human. A short resume prompt then continues.
- Read STATUS and the active phase of tasks.md first, then only the spec,
  plan, and contract sections the phase cites (grep the IDs). Read code by
  range or search, not whole files, unless you are about to edit them.
- Send long test and verify output to a log file in the scratchpad and print
  only the summary and failures.
- Record the context size at the start and end of each session in STATUS.

## Project working rules

Standing rules from the product owner (2026-10-18/19). They apply to every
agent and session; add new owner rules here, never only to agent memory.

- Edit files with the file-edit tool (now also in "Working rules"). Why: a
  broken heredoc corrupted an edit during C1.
- Commit after each finished user story, and work one story at a time (now in
  "Slice workflow"). Why: in C1 the whole slice was uncommitted when the machine
  crashed, and in C2 parallel work on US2, US3, and US5 mixed stories in shared
  files and let a delegated e2e run build a half-edited tree.

## Slice workflow

1. Work the next phase of the active `tasks.md`; each story is an end-to-end
   slice with stable spec IDs (US, `FR-`, `SC-`) and identified risk. Work one
   story at a time: finish, check, tick, and commit it before starting the
   next. Parallelize only within a story (`[P]`), and delegate only tasks of the
   current story.
2. Implement behavior, failure handling, and tests together; tests are mandatory.
3. Run the smallest relevant checks, then `pnpm verify` before claiming
   readiness. A blocked check is a limitation, not a pass.
4. Tick completed tasks, and update `spec.md` (if scope changed) and
   `docs/STATUS.md` in the same change, with commands, outcomes, evidence,
   questions, limits, and next action.
5. Commit each finished story as one coherent slice on the feature branch, not
   individual tasks or files, and never leave a checkpoint uncommitted until its
   gate. Use a conventional WHAT subject and a WHY body with trade-offs and
   evidence.

## Commands and architecture

Inspect `package.json` and the available toolchain before running commands.
Command definitions are not execution evidence; record actual results in status.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm dev --host 127.0.0.1
pnpm test
pnpm test:watch
pnpm lint:fix
pnpm verify
```

Pinned toolchain: Node `24.21.0` in `.node-version`, `.nvmrc`, and package
`engines`; pnpm `10.34.7` in `packageManager`. Spec Kit: `specify-cli` (evaluated
with 1.2.1), which needs Python and `uv`. `pnpm verify` runs, in order, lint,
typecheck, architecture, test, build, and test:e2e. Playwright tests the last
`dist` build: run `pnpm build` before a targeted `pnpm test:e2e <file>`. If
port 4173 is taken, set `KANDIDU_E2E_PORT` (for example
`KANDIDU_E2E_PORT=4174 pnpm verify`). Installing browser system
dependencies may require environment permission; report an unavailable capability.

Production boundaries: `src/domain` is pure and imports neither external packages nor
UI/storage; `src/storage` exposes an asynchronous store port and localStorage
adapter; `src/ui` contains React UI with all user-facing text in `src/ui/i18n`
catalogs (domain/storage throw typed error codes); `src/main.tsx` composes
implementations and selects the locale.
Boundary parsing may use Zod outside the domain. See the ADRs for rationale.
Dependency-cruiser prevents cycles, domain dependencies, storage-to-UI imports,
and UI-to-browser-adapter imports. Unit test files may import their test runner.
`.specify/` is tool-managed and excluded from Biome; the tasks template override
lives in `.specify/templates/overrides/`.

## Checkpoints and handoff

C1–C3 and the delivery modes are defined in the constitution and expressed as
GATE tasks; a feature has only the gates of its mode. Before
requesting review, verify the actual running application and a reachable URL in
the available environment. Never invent a preview or imply loopback is
reachable from another machine. Give at most three user steps and link the
matching spec IDs and evidence. Record the worktree state and next action. Stop
at pending human decisions; silence is not acceptance.

Exact handoff procedure (run at every GATE task):
1. Inspect `git status --short`, branch, and recent commits; preserve existing work.
2. Reconcile implemented spec IDs with files, ticked tasks, and checks. Run
   `pnpm verify` and record any failure or check not run. Run
   `pnpm models:check` and record which tasks were delegated (it reads only the
   current session: merge the delegated task IDs of earlier sessions of this
   checkpoint by hand).
3. Local review: run the `speckit-reviewer` subagent on the branch diff
   (agents without subagents: do the same checklist yourself in a fresh pass).
   Fix blockers and should-fix findings, rerun the affected checks, and list
   remaining findings in the handoff.
4. Start/restart the server using README commands; check the real review URL and
   its access scope. Never promise process survival or remote access from loopback.
5. Update `docs/STATUS.md` with feature, checkpoint, approval, evidence,
   assumptions, limitations, questions, worktree state, and one exact next action.
   Check every state claim in it (branches, refs, commits, servers) against git
   and the running system. Update the spec in the same change. Reference an
   existing commit where useful, not the yet-to-be-created handoff commit's own
   hash.
6. Write the human gate page `specs/NNN-*/review/C<n>.md` from
   `docs/templates/gate-review.md`, in the spec language and at most 30 lines:
   what is new (spec IDs), URL and restart command, ≤3 steps, decisions needed,
   limits, and how to answer. STATUS stays the agent log.
7. Review the diff for secrets and artifacts; make coherent authorized commits.
   Present the URL (or restart limitation), what was proven, review findings,
   and a link to the gate page. Stop and wait at the pending gate; a fresh agent
   may not advance past it.
8. Feedback: the human tries the running app and answers, preferably in
   `specs/NNN-*/feedback/C<n>.md` from `docs/templates/gate-feedback.md`
   (decision, ship mode, items with timing and type), or in chat.
   - Commit the feedback file unchanged first
     (`docs: record C<n> gate feedback`). A decision given in chat is quoted
     verbatim in STATUS. Never infer an answer to a question the human left open.
   - Triage every item: bug within the spec → fix task; behavior other than
     specified → `/speckit-clarify`; new scope → spec backlog or a new feature;
     question → answer it. Record the mapping (item → FR/task) in STATUS.
   - With changes: fold them in, `/speckit-analyze`, implement, back to step 2.
     On approval: record it, tick the GATE task, and ship.

## Ship: PR, merge, deploy (ADR 007)

The ship mode is recorded in `docs/STATUS.md` and comes from the bootstrap
prompt. If none is recorded, ask at the first approved gate (recommend
`auto-merge` for solo products with a public repository).

| Mode | What the agent does after an approved gate |
| --- | --- |
| `local-only` | Nothing beyond local commits. |
| `expert-review` | `pnpm ship --mode expert-review`: push, create/reuse the PR, report its URL, stop. A human reviews and merges. |
| `auto-merge` | `pnpm ship --mode auto-merge`: push, PR, wait for CI, merge (rebase by default), wait for the `main` run including the Pages deploy, verify the live URL, comment it on the PR. |

- Work on a feature branch named after the Spec Kit feature (for example
  `001-bewerbungs-mvp`), created before the feature's first commit. After a
  merge, continue on a new branch from the updated `main` (for example
  `001-bewerbungs-mvp-c2`).
- Before shipping, write the STATUS "Exact next action" as the state after the
  merge (what is live, which branch comes next), so `main` is correct the
  moment it merges.
- First PR: write the body from `docs/STATUS.md` (checkpoint, spec IDs,
  evidence, `pnpm models:check` table, review findings) and pass
  `--title "<conventional subject>" --body-file <file outside the repo>`.
  Later gates on the same branch update the open PR.
- GitHub Pages: `ship` checks it before pushing. If it isn't set up, give the
  human the exact steps the script prints (Settings > Pages > Source: GitHub
  Actions; private repositories need GitHub Pro/Team, and the site is public
  either way). Offer to run the printed `gh api` command only with their
  permission. CI never fails because Pages is missing: it skips the deploy and
  explains why in the run summary.
- Report the outcome: PR URL, check results, and for `auto-merge` the live URL
  and run link. Record them in `docs/STATUS.md` as the first commit of the next
  branch (never push directly to `main`). If no next work starts now, name that
  local branch in the report and in the STATUS next action; it reaches `main`
  with the next PR. Exit codes: 1 = checks or deploy failed (fix on a new
  branch), 3 = precondition (report the printed hint).
