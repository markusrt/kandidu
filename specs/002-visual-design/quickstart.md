# Quickstart: 002-visual-design

```sh
pnpm install --frozen-lockfile
pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort
```

- "Ruhig" (default): `http://127.0.0.1:4173/#/`
- "Geführt" (spike only): `http://127.0.0.1:4173/?design=guided#/`

Screenshots for the gate page (preview must be running):

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
