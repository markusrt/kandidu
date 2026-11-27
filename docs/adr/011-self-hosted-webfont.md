# ADR 011: Self-hosted webfont for the visual design

Status: accepted by the owner at the C1 gate on 2026-11-27 ("Ja wenn das mit
Github Pages auch geht"); font chosen by the owner ("Paket D", 2026-11-27).
GitHub Pages checked: `vite build --base /kandidu/` (the CI command) emits
`url(/kandidu/assets/…woff2)`; served under `/kandidu/`, both files load with
200 and the CSP `font-src 'self'`.

## Context

The owner wants a calmer, more modern look and asked for webfonts. Kandidu
keeps all data in the browser and its E2E tests fail on any request to a
foreign origin. A CDN font (e.g. Google Fonts) would send every visitor's IP
address to a third party.

## Decision

- Runtime dependency `@fontsource/atkinson-hyperlegible-next` 5.3.0
  (OFL-1.1), imported in `src/main.tsx`; only the latin subset in weights 400
  and 700 is bundled (about 25 KB WOFF2). Vite emits the files as app assets.
- Fallback stack `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
  `font-display: swap`.
- All visual constants live in `src/ui/tokens.css` (contract in
  `specs/002-visual-design/contracts/design-tokens.md`).

## Consequences

- No foreign requests; the font works offline once the app is cached by the
  browser like the other assets.
- Bundle grows by about 25 KB. Other subsets and weights are not shipped;
  characters outside latin fall back to the system font.
- Updating the font is a normal dependency update (check license and size).

Alternatives rendered and rejected by the owner: Inter, Plus Jakarta Sans,
Figtree (all OFL-1.1, 20–48 KB variable fonts).
