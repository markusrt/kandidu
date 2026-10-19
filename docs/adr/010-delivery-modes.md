# ADR 010: Delivery modes (Full, Light, Spike)

Status: accepted by the product owner on 2026-10-19; the same decision as
mvp-starter ADR 008. Amends ADR 003 and the constitution's "Delivery
Checkpoints" (v2.1.0 → v2.2.0, MINOR: added section).

## Context

The constitution defined one delivery shape: every feature stops at C1, C2,
and C3. Kandidu delivered its MVP feature (001-bewerbungs-mvp) that way. Its
backlog then held two follow-ups of a different shape:

- R5 (cover letter template per project): a small extension of a proven
  workflow. Three gates would add two review rounds without new information.
- R6 (date in the PDF stays fixed): a question with an open outcome, closer to
  a spike than to a feature, where the first answer is go or no-go.

After C3, the agent's outlook "plan, tasks, analyze up to C1" read to the owner
as if the project restarted. The owner decided to support more than one mode
and to let the agent choose.

## Decision

- Three delivery modes, defined in the constitution: **Full** (C1 → C2 → C3),
  **Light** (one C3 gate after the last story that covers C1–C3 criteria for
  the feature's scope), **Spike** (one time-boxed C1 gate with a go/no-go
  result).
- The agent chooses the mode in `/speckit-plan`, records it with a one-line
  reason as `**Delivery Mode**` in `plan.md` and in `docs/STATUS.md`, and
  reports it. `/speckit-tasks` (override template) inserts only that mode's
  GATE tasks.
- A product's first feature is always Full.
- When in doubt, the mode with more gates. The agent may move to more gates on
  its own; fewer gates need human approval. The human may set or change the
  mode at any time.
- A Spike ends with a human decision: continue as Light or Full (tasks are
  refreshed), or stop and record the learning.

## Consequences

Small follow-ups reach the owner sooner and with one review instead of three.
The cost is judgment: a Light feature whose risk was underestimated reaches the
owner only at its end. The "more gates when in doubt" rule, the recorded reason,
and the owner's right to change the mode limit that risk. The mode lives in
`plan.md`, which uses Spec Kit's core plan template, so nothing but the
constitution check prompts the agent to write it; the tasks template's
`**Delivery Mode**` field makes a missing mode visible.
