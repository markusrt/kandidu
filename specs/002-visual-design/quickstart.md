# Quickstart: 002-visual-design

```sh
pnpm install --frozen-lockfile
pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/#/`. The direction "Geführt" is the only style
(the spike's `?design=` switch was removed after C1).

Screenshots of all screens for the gate page (preview must be running; the
script seeds synthetic data through the UI). Optional last argument: a comma
list of screen names to write.

```sh
node scripts/capture-design.mjs http://127.0.0.1:4173 specs/002-visual-design/review/img after
```

Checks:

```sh
pnpm test                          # includes src/ui/tokens.test.ts
pnpm build && pnpm test:e2e e2e/design.spec.ts
pnpm verify
git diff --stat main -- src/domain src/storage src/ui/i18n e2e/c1-* e2e/c2-* e2e/c3-* e2e/fixtures.ts e2e/flows.ts   # must be empty
```
