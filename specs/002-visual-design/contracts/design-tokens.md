# Contract: design tokens

`src/ui/tokens.css` defines every visual constant as a custom property on
`:root`. Stylesheets reference tokens with `var(--…)` only; no color literal
appears outside `tokens.css` (SC-006, `src/ui/tokens.test.ts`).

| Group | Tokens (names are the contract; values may be tuned) |
| --- | --- |
| Color: text | `--ink`, `--muted` |
| Color: surfaces | `--page`, `--paper`, `--line`, `--border-strong` |
| Color: accent | `--accent`, `--accent-hover`, `--accent-ink`, `--accent-soft`, `--accent-line` |
| Color: status | `--error`, `--error-soft`, `--error-line`, `--warn`, `--warn-soft`, `--warn-line`, `--ok`, `--ok-soft` |
| Color: status chips (FR-015) | `--status-open`, `--status-open-soft`, `--status-open-line`, `--status-done`, `--status-done-soft`, `--status-done-line`, `--status-neutral`, `--status-neutral-soft`, `--status-neutral-line` |
| Focus | `--focus`, `--focus-width`, `--focus-offset` |
| Type | `--font-sans`, `--font-mono`, `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--leading`, `--leading-tight`, `--weight-regular`, `--weight-bold` |
| Space (4 px scale) | `--space-1` … `--space-8` |
| Shape | `--radius-sm`, `--radius`, `--radius-lg`, `--radius-pill`, `--shadow-card`, `--border-width` |
| Layout | `--content-width`, `--content-width-wide` (pages with a step column), `--gutter`, `--target`, `--target-small` |

Rules:

- Text tokens on their surfaces ≥ 4.5:1; `--border-strong` and `--focus` ≥ 3:1
  against `--paper` and `--page` (FR-008).
- Existing token names used by `style.css` today (`--ink`, `--muted`, `--line`,
  `--paper`, `--page`, `--accent`, `--accent-ink`, `--accent-soft`, `--focus`,
  `--error`, `--error-soft`, `--warn`, `--warn-soft`, `--ok`) keep their meaning.
- Status chip text on its soft fill ≥ 4.5:1 (`--status-*` on
  `--status-*-soft`). The `-line` rings are decorative; the chip's word
  carries the state (FR-012), and forced colors draw a `CanvasText` border.
- Proposed at C3 (owner decides): "Moos" chips (open #5a5f1c, done
  #2a6a4c) and a neutral chip for lead statuses.
