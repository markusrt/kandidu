# ADR 004: Adopt GitHub Spec Kit for the spec flow

Status: accepted by the repository owner on 2026-10-18 (requested change);
amends ADR 003 and the constitution (v2.0.0). Evaluated with `specify-cli` 1.2.1.

## Context

The starter used a hand-written process: one `docs/SPEC.md` with a disposable
demo spec that each new product had to rewrite. The owner wants an opinionated,
maintained spec flow while keeping the core delivery mode: an agent works
autonomously and stops at checkpoints (C1–C3) where the owner reviews a running
MVP.

Options considered: keep the custom flow, Spec Kit, BMAD Method. Spec Kit has the
smallest artifact set (spec → plan → tasks per feature), supports many agents
from one `specify init`, and has a template override stack. BMAD adds persona
agents, a PRD/architecture/epic/story hierarchy, and per-story ceremony. That
fits multi-person, long-lived products better than a solo, checkpointed MVP.

## Decision

- Spec Kit is the spec flow. Requirements live in `specs/NNN-feature/` (spec,
  plan, tasks, research, data-model, contracts, quickstart) created by
  `/speckit-*` commands. No sample spec ships with the starter; `docs/SPEC.md` is
  removed. The first product feature's spec is the product spec.
- The constitution moves to `.specify/memory/constitution.md`, Spec Kit's
  canonical location, so `/speckit-plan` gates on it. `specify init --here`
  preserves an existing constitution (verified with 1.2.1).
- `.specify/templates/overrides/tasks-template.md` overrides the core tasks
  template: tests are mandatory, paths match this stack, commits are per slice,
  and each checkpoint ends in a GATE task where `/speckit-implement` must stop.
- `docs/STATUS.md` remains the cross-feature checkpoint ledger: approvals,
  evidence, reachable URL, and next action. Spec Kit has no equivalent.
- The template stays agent-neutral: it does not commit `specify init` output.
  Each product runs `specify init --here --integration <agent>` once and commits
  the result, so later agents resume from the repository.
- `.specify/` is excluded from Biome because Spec Kit's generated JSON does not
  match the repository's formatter settings and is tool-managed.
- The git-branching extension is not installed by default; branch creation
  remains an authorization decision (AGENTS.md).

## Consequences

Product setup gains a prerequisite (Python, `uv`, `specify-cli`) and one manual
step. Feature specs follow Spec Kit's template (prioritized user stories, `FR-`
and `SC-` IDs) instead of custom `S`-IDs. The tasks override is a full copy of
the 1.2.1 core template: on a Spec Kit upgrade, diff the new core
`tasks-template.md` against the override and port relevant changes. If the
override drifts too far, package it as a local preset instead.

The starter demo code remains as a runnable walking skeleton that proves the
stack and the `pnpm verify` gate. It has no spec; the first feature's Setup phase
replaces or removes it.
