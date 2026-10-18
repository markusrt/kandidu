# ADR 001: Compatible typed web stack

Status: selected starter direction; implementation and verification tracked in
`docs/STATUS.md`. Dependency metadata checked on 2026-10-16; Node raised from
22.23.3 to 24.21.0 on 2026-10-18 at the owner's request. This records a dated
selection, not a claim that every dependency is the newest major.

## Context

The starter needs a small interactive browser application, strict boundaries,
fast feedback, realistic browser tests, and reproducible tooling. Compatibility
and maintenance matter more than upgrading majors for their own sake.

## Decision

- React 19 for UI; Vite 7 for development and production bundling.
- TypeScript 5.9 in strict mode for application code.
- Zod for runtime validation at untrusted persistence/input boundaries, outside
  the pure domain.
- Vitest 4 for unit tests; Playwright with Chromium for browser workflows.
- Biome for lint/format checks; dependency-cruiser for architecture checks.
- Pin Node `24.21.0` (Active LTS "Krypton") in `.node-version`, `.nvmrc`, and `engines`; pin pnpm
  `10.34.7` in `packageManager`. Commit the lockfile and use frozen installs.
- The verification gate runs lint, typecheck, architecture, test, build, and
  test:e2e; CI must exercise the same interface.

These maintained stable lines were selected as a compatible set. Exact package
versions and the lockfile are the executable record; validate them rather than
assuming compatibility from this ADR alone.

## Consequences

One language spans domain, adapter, and UI. The project keeps a small but explicit
toolchain instead of a full-stack framework or service dependency. Runtime
validation and tests remain necessary despite strict types. Browser installation
may require system packages and environment permission.

Review compatibility, maintenance, and advisories before upgrades; record
material departures in an ADR. Updating a major merely because it exists is not
an objective.

Sources: [Node release schedule](https://nodejs.org/en/about/previous-releases)
confirms Node 24 is Active LTS. Official npm metadata (`npm view <package>
version engines peerDependencies`) informed exact selection. Vite 7 supports
Node ≥22.12 (so Node 24), plugin-react 5 and Vitest 4 support Vite 7. Newer majors exist;
this deliberately selects compatible stable lines rather than newest majors.
The full `pnpm audit` caught advisories in an initial Vitest 3 selection;
Vitest 4.1.12 removes those affected dependencies and passes the same suite.
