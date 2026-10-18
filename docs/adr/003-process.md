# ADR 003: Portable evidence-driven delivery

Status: selected process; amended by [ADR 004](004-spec-kit.md), which moves the
constitution to `.specify/memory/constitution.md` and replaces `docs/SPEC.md` with
Spec Kit feature specs under `specs/`. Checkpoint execution and human decisions
remain in `docs/STATUS.md`. [ADR 007](007-ship-flow.md) adds local review, ship
modes, and GitHub Pages deployment.

## Context

A reusable starter should survive agent changes, interrupted sessions, and
independent repository copies without private memory or vendor infrastructure.
Progress must distinguish code that exists from demonstrated or accepted work.

## Decision

Use the canonical reading order: constitution → agent guide → status → spec →
relevant ADRs. Keep durable rules in `CONSTITUTION.md`, operating guidance in
`AGENTS.md`, requirements with stable IDs in `docs/SPEC.md`, current evidence and
next action in `docs/STATUS.md`, and consequential decisions in ADRs.

Bootstrap from a short brief. Inspect first; ask at most five blocking questions
per batch with recommendations. Record nonblocking questions separately.
Autonomy covers reversible approved implementation, not domain/privacy guesses
or implicit permission for external, paid, destructive, or deployment actions.

Deliver coherent end-to-end slices with tests and same-change spec/status
updates. Conventional commit subjects explain WHAT; bodies explain WHY.
Do not split commits by file.

- C1 tests the highest-risk core assumption with a real sample.
- C2 demonstrates useful behavior, reload, failures, recovery, and accessibility.
- C3 demonstrates agreed acceptance criteria and hands off; cloud is optional.

At checkpoints, verify the actual app and reachable URL, explain access limits,
and give at most three user steps. Record spec IDs, commands/results, evidence,
questions, limits, worktree state, pending approvals, and one next action.
If no preview is available, record that limitation instead of inventing one.

Use planned → implemented → verified → accepted states. Human acceptance requires
an explicit decision; silence is not approval. Pause affected work at a gate.
Constitution changes require human approval and an ADR.

## Consequences

Repository documents provide a restart/resume contract for any agent. Keeping
them synchronized adds a little work but prevents hidden assumptions, invented
progress, and dependency on chat history. An agent can finish independent safe
work while a decision is pending, but cannot approve the blocked decision itself.
