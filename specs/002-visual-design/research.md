# Research: 002-visual-design

## R1 Direction

- Decision: compare "Ruhig" and "Geführt" in a spike on the home page and
  "Lead prüfen" (owner, 2026-11-27). "Seriös" (serif headings, paper tone) was
  shown and rejected.
- Rationale: the two directions differ on one axis each (density/surface vs.
  guidance layout); both use the same tokens, font and palette, so the owner
  compares structure, not colors.
- Evidence: interactive mockup artifact "Kandidu design directions" and
  before-screenshots taken from `main` at `0a90efd`.

## R2 Font and palette

- Decision: package D — "Atkinson Hyperlegible Next" (Braille Institute,
  OFL-1.1, `@fontsource/atkinson-hyperlegible-next` 5.3.0) with the palette
  "Waldgrün".
- Alternatives rendered with real fonts at 1000 px and 360 px: A Inter /
  slate blue, B Plus Jakarta Sans / petrol, C Figtree / indigo. All passed the
  contrast checks below; the owner chose D.
- Weight cost (latin WOFF2): 400 = 12.1 KB, 700 = 12.7 KB. Variable fonts of
  the alternatives were 20–48 KB.
- Self-hosting: fontsource ships the files; Vite bundles them as assets, so
  no request leaves the app origin (SC-007, existing E2E network guard).
  Google Fonts CDN rejected: foreign request, IP disclosure.
- Fallback: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` with
  `font-display: swap`.

## R3 Contrast (computed, WCAG relative luminance)

| Pair | Ratio | Need |
| --- | --- | --- |
| ink #1d2721 on page #f6f8f6 | 14.4 | 4.5 |
| muted #56645b on page #f6f8f6 | 5.8 | 4.5 |
| white on accent #2a6a4c | 6.4 | 4.5 |
| warn #7a4b00 on warn-soft #fcf3e3 | 6.7 | 4.5 |
| ok #2a6a4c on ok-soft #e5f0ea | 5.5 | 4.5 |
| card line #dfe6e1 on white | 1.3 | decorative only |

Field borders and the focus ring need ≥ 3:1 (1.4.11); they get their own
tokens, checked again in the implementation with a script and the e2e test.

## R4 Spike switch

- Decision: `?design=guided` query parameter read once in `src/main.tsx`,
  sets `html[data-direction]`. Removed after C1.
- Rationale: hash routes are untouched; nothing is stored; the reviewer can
  open both directions at the same URL. Alternatives: two builds (owner can't
  compare at one URL), a UI toggle (needs text, violates FR-005).

## R5 Token enforcement

- Decision: a Vitest test scans `src/ui/**/*.css` and fails on color literals
  (`#hex`, `rgb(`, `hsl(`) outside `src/ui/tokens.css`. Biome has no CSS rule
  for this; stylelint would be a new tool for one rule.

## R6 Critique loop

- Decision: read-only `design-critic` agent definition in `.claude/agents/`
  modeled on `speckit-reviewer`: inputs are screenshots, spec FR/SC and the
  style diff; output findings ranked blocker / should-fix / nit with screen,
  evidence and smallest fix. Max 3 rounds per screen.
