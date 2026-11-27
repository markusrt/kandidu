# Contract: design tokens

`src/ui/tokens.css` defines every visual constant as a custom property on
`:root`. Stylesheets reference tokens with `var(--…)` only; no color literal
appears outside `tokens.css` (SC-006, `src/ui/tokens.test.ts`).

| Group | Tokens (names are the contract; values may be tuned) |
| --- | --- |
| Color: text | `--ink`, `--muted` |
| Color: surfaces | `--page`, `--paper`, `--line`, `--border-strong` |
| Color: accent | `--accent`, `--accent-hover`, `--accent-ink`, `--accent-soft` |
| Color: status | `--error`, `--error-soft`, `--warn`, `--warn-soft`, `--ok`, `--ok-soft` |
| Color: status chips (FR-015) | `--status-open`, `--status-open-soft`, `--status-done`, `--status-done-soft` |
| Focus | `--focus`, `--focus-width`, `--focus-offset` |
| Type | `--font-sans`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--leading`, `--weight-regular`, `--weight-bold` |
| Space (4 px scale) | `--space-1` … `--space-8` |
| Shape | `--radius-sm`, `--radius`, `--radius-lg`, `--radius-pill`, `--shadow-card` |
| Layout | `--content-width`, `--gutter` |

Rules:

- Text tokens on their surfaces ≥ 4.5:1; `--border-strong` and `--focus` ≥ 3:1
  against `--paper` and `--page` (FR-008).
- Existing token names used by `style.css` today (`--ink`, `--muted`, `--line`,
  `--paper`, `--page`, `--accent`, `--accent-ink`, `--accent-soft`, `--focus`,
  `--error`, `--error-soft`, `--warn`, `--warn-soft`, `--ok`) keep their meaning.
- The "Geführt" layer may only override tokens and layout under
  `html[data-direction="guided"]`; it may not add color literals.
