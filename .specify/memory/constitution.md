# MVP Starter Constitution

Durable rules for humans and any coding agent. Spec Kit reads this file during
`/speckit-plan` (Constitution Check) and amends it only through
`/speckit-constitution`. Product requirements belong in `specs/<feature>/spec.md`;
current checkpoint, evidence, and next action belong in `docs/STATUS.md`.

## Core Principles

### I. Learn before building

Identify the riskiest assumption early. Deliver small, end-to-end slices that
test it before adding breadth or infrastructure. The P1 user story of a product's
first feature MUST exercise that riskiest assumption.

### II. Do not invent the domain

Record confirmed facts, assumptions, unanswered questions, and explicit
exclusions separately. Mark unknowns `[NEEDS CLARIFICATION]` instead of guessing.
Human silence is not approval.

### III. Local first, deliberately

Prefer a useful local experience and reversible choices with a replaceable
asynchronous storage seam for future cloud needs. Local storage is not
automatically private, durable, backed up, or available offline. Reassess storage
against actual product requirements.

### IV. Keep boundaries honest and simple

Prefer the smallest usable slice over speculative abstractions. Use strict
typing. Validate untrusted input and persisted data at runtime; types alone do
not validate boundaries. Keep domain logic independent of UI, storage, and
external services.

### V. Make the experience usable

Semantic structure, keyboard operation, visible focus, labels, understandable
errors, accessible feedback, and mobile-friendly layouts are acceptance
requirements, not finishing touches.

### VI. Choose a compatible, maintained stack

Prefer current stable releases supported together, not new majors for their own
sake. Verify compatibility and record dated decisions. Pin the toolchain and
preserve reproducibility. The default stack is recorded in `docs/adr/001-stack.md`;
a plan that departs from it needs an ADR.

### VII. Protect people and credentials

Never commit secrets or real personal data. Do not guess privacy, retention,
consent, identity, or authorization rules. Obtain approval before sensitive
integrations, paid services, or irreversible operations.

### VIII. Prove what changed (tests are mandatory)

Cover meaningful behavior, boundaries, failure paths, accessibility, and
regressions with proportionate tests in every task list, whether or not the
spec mentions tests. Run the applicable checks and record actual commands,
outcomes, and limitations. Never fabricate passing checks, reachable URLs,
screenshots, or human acceptance. Tests are part of done, not a follow-up.

### IX. Keep one truth

Each feature has exactly one spec (`specs/<feature>/spec.md`) with stable
requirement IDs (user stories, `FR-`, `SC-`). Update spec, tasks, and
`docs/STATUS.md` in the same change as behavior: implementation state, evidence,
open questions, and next action must agree. Distinguish planned, implemented,
verified, and human-accepted work.

### X. Commit complete slices

Use conventional commit subjects describing **WHAT** changed (for example,
`feat: recover unreadable demo storage`). Explain **WHY**, trade-offs, and
relevant evidence in the body. Do not create one commit per file or per task
merely because files changed.

### XI. Preserve human control

Respect existing work and explicit scope. Stop at delivery checkpoints with a
running application and wait for an explicit human decision; an agent cannot
approve its own exception or advance past a pending gate.

### XII. Speak the user's language; build for localization

- **Spec language**: the language that best fits the user, which is the language
  of their brief unless they state another. Conversation with the user,
  clarification questions, review steps, and the prose of `spec.md` (and its
  checklists) use it. The spec records it as `**Spec Language**: <BCP 47 tag>`.
- **Technical language is English**: constitution, AGENTS.md, README, ADRs,
  `docs/STATUS.md`, plan/research/data-model/contracts/quickstart/tasks, code,
  identifiers, comments, test names, and commit messages.
- **Structure stays English in every document**: template headings, markers such
  as `[NEEDS CLARIFICATION]`, `## Clarifications`, `### Session`, and `GATE`, and
  IDs (`US1`, `P1`, `FR-001`, `SC-001`, `T001`). Spec Kit commands look for them.
- **UI**: the default locale is the spec language unless the spec states
  otherwise. Every user-facing string comes from a locale message catalog, never
  hardcoded in components or thrown from domain/storage code (those layers
  return typed error codes the UI maps to messages). Set `<html lang>`, format
  dates/numbers/plurals with `Intl`, avoid sentence concatenation, and keep
  layouts tolerant of longer text. Shipping more than the default locale is a
  separate, approved feature.

## Delivery Checkpoints

Agents work autonomously between checkpoints and stop at each one:

- **C1 — Risky core**: the P1 story runs end to end on real (synthetic,
  discardable) data and tests its important failures.
- **C2 — Useful and recoverable**: the approved workflow survives reload, invalid
  data, read/write failures, recovery, keyboard use, and agreed devices.
- **C3 — Agreed acceptance**: acceptance criteria demonstrated, checks run,
  limits and restart steps documented, explicit acceptance requested.

At each checkpoint: `pnpm verify` passes (or its failure is recorded), the app is
actually running at a verified URL, and `docs/STATUS.md` gives at most three
human steps. `AGENTS.md` defines the exact procedure.

## Governance

This constitution supersedes conflicting template text and plan output. Amend it
only with explicit human approval, through `/speckit-constitution`, plus an ADR
in `docs/adr/` describing the reason and consequences. Bump the version per
semantic versioning (MAJOR: removed or redefined principle; MINOR: added
principle or section; PATCH: wording). Reading order and operational approval
gates are defined in `AGENTS.md`. These are generic project defaults; override
them consciously for a product.

**Version**: 2.1.0 | **Ratified**: 2026-10-16 | **Last Amended**: 2026-10-18
