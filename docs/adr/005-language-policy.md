# ADR 005: Spec language, technical English, localizable UI

Status: accepted by the repository owner on 2026-10-18; adds constitution
principle XII (v2.1.0).

## Context

Product owners may not think best in English, and specs are where domain
nuance matters most. Technical artifacts are read by agents, tooling, and future
contributors, and stay consistent in one language. Spec Kit (1.2.1) is
language-agnostic in its scripts, which do not parse spec content. Its commands
are prompts that look for literal English structure: `[NEEDS CLARIFICATION]`,
`## Clarifications` / `### Session` (clarify), `## Phase N: Convergence`
(converge), checkbox lines (implement), and IDs such as `US1`, `FR-001`, `SC-001`.
Our tasks override adds `GATE`. Products start in one UI language but may need
others later.

## Decision

- Conversation with the user and the prose of `spec.md` and its checklists use
  the **spec language**: the user's best-fit language, which is the language of
  the brief unless the brief says otherwise. The spec records it as
  `**Spec Language**: <BCP 47 tag>`.
- All technical documents, code, tests, and commits are English.
- Template headings, Spec Kit markers, and IDs stay English in every document,
  so commands keep working regardless of spec language.
- The UI defaults to the spec language and is built localizable from the first
  slice: a typed per-locale message catalog, typed error codes instead of
  user-facing strings in domain/storage, `<html lang>`, `Intl` formatting.
  No i18n library by default; adopt one by ADR when multiple locales,
  ICU message syntax, or translator workflows justify it.

## Consequences

Specs mix English headings with prose in another language. That looks
unusual, but it keeps Spec Kit parsing reliable without maintaining a translated
spec-template override. Plan and tasks are English while their source spec may
not be: agents translate requirements into technical language and cite IDs, not
prose. Users reviewing a running app at a gate get review steps in their
language, while `docs/STATUS.md` records them in English.

The starter demo is the reference: `ItemError`/`StoreError` carry codes,
`src/ui/i18n/` holds the typed `Messages` shape, the `en` catalog, the locale
registry, and `errorMessage`, and `src/main.tsx` sets `<html lang>` and the
document title from the active locale. Adding a locale means adding one catalog
file and registering it.
