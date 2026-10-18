# ADR 007: Local review, ship modes, and GitHub Pages deployment

Status: accepted by the repository owner on 2026-10-18. Amends ADR 003
(deployment was out of scope) and the authorization rules in AGENTS.md.

## Context

Products built from this starter are static, local-first SPAs. The owner wants
each approved gate to end in a reviewed change on `main` and a running
production URL, with as little manual GitHub work as possible, and with a
choice between automatic merging and expert review. Constraints observed on
2026-10-18:

- GitHub Pages and branch protection need a public repository or a paid plan.
  The private starter repo on the free plan gets a 403 for branch protection
  and a 404 for Pages.
- GitHub-native auto-merge (`gh pr merge --auto`) requires branch protection
  with required checks, so it is unavailable in that setting.
- Pages deployment via Actions needs Settings > Pages > Source: GitHub
  Actions. The workflow token cannot enable Pages itself.

## Decision

- **Local review and feedback first.** At every GATE the main session runs the
  read-only `speckit-reviewer` subagent (opus, fresh context) on the branch diff,
  fixes blockers, then shows the human the running app. Shipping happens only
  after explicit approval.
- **Ship modes**, recorded per product: `local-only`, `expert-review`,
  `auto-merge`. The mode is the authorization for branches, push, PR, merge,
  and deployment.
- **`scripts/ship.mjs`** (`pnpm ship`) drives the GitHub side with `gh`:
  preconditions (feature branch, clean tree, Pages status), push, PR create or
  reuse. In auto-merge mode it also waits for checks itself, merges (rebase by
  default to keep slice commits), waits for the `main` run, requires the
  `deploy` job to succeed, polls the live URL, and comments it on the PR. This
  agent-driven wait works on every plan; native auto-merge is not required.
- **CI deploys `main` to GitHub Pages** after `verify` passes, with the Vite base
  path from `configure-pages` and a `404.html` copy for SPA deep links. A
  `pages-check` job skips the deployment with a setup hint when Pages isn't
  configured, so `main` stays green. Auto-merge refuses to start until Pages is
  set up. Action versions are pinned by commit SHA.

## Consequences

The human's GitHub work shrinks to a one-time Pages setting, which ship and CI
both explain when it is missing, plus choosing a mode. Deployed sites are
public. That is acceptable for local-first apps whose data never leaves the
browser, but every product must keep that property or revisit this ADR. Pages
for private repositories costs money (GitHub Pro/Team): a paid-service decision
for the owner. Auto-merge trusts CI plus the local review. Products needing
human code review should use `expert-review`. Rebase merges keep history linear
but require the repository to allow rebase merging (`--method` overrides).
The end-to-end merge-and-deploy path was not executed when this was written,
because merging this starter is the owner's decision. Its first real run should
be watched and its evidence recorded.
