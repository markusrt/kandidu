# Copyable bootstrap prompt

Prerequisite (human, once per product repository): run
`specify init --here --integration <agent>` and commit the result (see README).
Then copy the complete block below into that agent. Replace bracketed inputs;
leave optional fields unspecified when unknown.

```text
Build a small, useful product from this starter using Spec Kit.

IDEA (required): [problem, intended users, desired outcome]
NAME (optional): [product name; used for UI title, package name, storage keys, repository; default: ask]
SPEC LANGUAGE (optional): [default: the language this brief is written in]
UI LANGUAGE (optional): [default: the spec language; list any later locales]
DEVICES (optional): [desktop/mobile/tablet, browsers, assistive needs]
DESIGN (optional): [references, constraints, existing assets]
SENSITIVITY (optional): [data types, privacy/retention obligations; unknown is OK]
BUDGET (optional): [money, time, hosting/service constraints]
SHIP MODE (optional): [local-only | expert-review | auto-merge; default: ask at the first approved gate]
PERMISSIONS (optional): [anything beyond the ship mode; default: nothing else]
MODELS (optional): [default: AGENTS.md model routing; "single" = no delegation]

START / RESUME
Work from the repository, not remembered chat or vendor-specific memory. Read
.specify/memory/constitution.md -> AGENTS.md -> docs/STATUS.md -> active
specs/NNN-*/ files -> relevant ADRs. Inspect capabilities, branch/worktree,
existing implementation, commands, and prior evidence before editing. Confirm
the speckit-* commands are installed; if not, stop and ask the human to run
specify init. If docs/STATUS.md names an active feature or pending gate, this is
a RESUME: continue its next action within its gates and never re-specify it.

LANGUAGE (constitution XII)
Talk to the user and write spec.md prose in the spec language. Keep template
headings, Spec Kit markers ([NEEDS CLARIFICATION], ## Clarifications, GATE) and
IDs (US1, P1, FR-001, SC-001, T001) in English. Everything technical is English:
plan, tasks, status, ADRs, code, tests, commits. Build the UI in the spec
language as the default locale through a message catalog, never hardcoded.

NEW PRODUCT (no product feature in specs/ yet)
1. /speckit-specify with the inputs above as the brief; record
   **Spec Language** and the UI default locale in the spec. Order user stories so
   P1 exercises the riskiest core assumption; record confirmed facts,
   assumptions, exclusions, and [NEEDS CLARIFICATION] markers, never guesses.
2. /speckit-clarify. Ask at most five blocking questions with a recommended
   answer and trade-off each, and wait only for answers that affect acceptance,
   domain, privacy, retention, paid usage, external access, or architecture.
   Record nonblocking questions in docs/STATUS.md and proceed.
3. /speckit-plan. Reuse this starter's stack and boundaries (ADR 001-002);
   do not regenerate tooling. Departures need an ADR and approval.
4. /speckit-tasks, then /speckit-analyze; resolve reported inconsistencies.
   Tag only fully specified tasks [ROUTINE]; leave design-shaping ones untagged.
5. /speckit-implement until the C1 GATE task, then hand off and STOP. Delegate
   [ROUTINE] tasks per AGENTS.md model routing; review their diffs, keep
   untagged tasks, verification, commits, and handoff in this session.
Starter demo code is a walking skeleton: adapt or remove it in the Setup
phase, keeping relevant quality/failure coverage. Starter evidence and review
gates are not product progress or blockers. Never clear existing browser data.

DELIVERY CHECKPOINTS (GATE tasks in tasks.md)
C1 - Risky core: smallest real end-to-end sample exercising the riskiest
assumption, with synthetic discardable data and tested important failures. A
mock or static screen is not proof.
C2 - Useful and recoverable: approved workflow with reload/persistence, invalid
data, read/write failures, recovery, keyboard use, accessible feedback, and
agreed devices. Describe storage and durability limits honestly; never claim
saved before the write succeeds.
C3 - Agreed acceptance: demonstrate acceptance criteria, document limits and
exact restart/resume steps, request explicit acceptance. The static GitHub Pages
deployment follows the ship mode; cloud identity, sync, backends, and other
infrastructure are optional follow-on features.
Work only within the approved checkpoint; do not add speculative features.

AT EACH GATE
Run pnpm verify and record its actual outcome. Run the speckit-reviewer local
review, fix blockers, and report the remaining findings. Verify the app runs and the
stated URL is reachable in your environment; state who can reach it (loopback
is local only). Never fabricate a URL, preview, passing check, or review. Give
the human at most three steps: how to reach/start the app, what to try, and what
decision is needed. Update docs/STATUS.md and the spec in the same commit, with
spec IDs, results, questions, limits, worktree state, and one next action. Make
authorized local commits only, as coherent slices with conventional WHAT
subjects and WHY bodies. Then STOP for my local feedback. After I approve,
ship per SHIP MODE with pnpm ship (AGENTS.md, Ship): expert-review stops at the
PR URL; auto-merge waits for CI, merges, waits for the GitHub Pages deployment,
and reports the live URL. If Pages is not set up, tell me the exact steps.

AFTER FEEDBACK
Record the human decision in docs/STATUS.md. Fold requested changes into
spec.md with /speckit-clarify (stable IDs; never redefine accepted work
silently), refresh remaining work with /speckit-tasks or /speckit-converge, then
/speckit-implement to the next GATE. After C3 acceptance, each new capability is
a new /speckit-specify feature with its own gate.

LIMITS
Do not guess domain, privacy, identity, consent, retention, or authorization
rules. Do not add paid services, expose data, create remote resources,
destructively change Git, or bypass checks without explicit permission. Branches,
push, PRs, merges, and deployment only as the recorded SHIP MODE allows. Copied starters do not inherit permission grants.
Constitution changes need human approval, /speckit-constitution, and an ADR.
Silence is not approval. A fresh agent must be able to resume solely from the
repository; process/server survival is not guaranteed, so document restart
commands and recheck the URL on resume.
```
