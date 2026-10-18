# ADR 002: Replaceable local demo storage

Status: selected starter direction; actual implementation/evidence in `docs/STATUS.md`.
Superseded for Kandidu product data by [ADR 008](008-indexeddb-storage.md)
(IndexedDB); the recovery principles below still apply.

## Context

The demo needs reload persistence without a backend. Product data requirements
are not yet known, so the initial mechanism must be small, explicit, and
replaceable rather than presented as a general durability solution.

## Decision

Use an asynchronous `DemoStore` boundary in `src/storage` and a localStorage
adapter composed in `src/main.tsx`. Keep domain code pure and unaware of storage
or validation libraries.

Own only `mvp-starter:demo:v1`. Validate persisted data with Zod as
`{version:1,items:[{id,title,completed}]}` with unique nonempty IDs, trimmed
nonempty titles of at most 120 characters, and boolean completion. Absence means
empty; corrupt data, unsupported versions, and access exceptions mean failure.
No migration is implemented. Future migrations must be explicit tested
transforms, never automatic deletion or fallback to empty.

A read error blocks writes until successful retry or a deliberate,
user-confirmed reset of this key. A failed reset does not unblock writes. Never
clear unrelated origin storage. Show saved state only after writes succeed;
surface failures and support retry without silently losing or overwriting data.

## Consequences and reconsideration

localStorage is synchronous, small, origin-specific, and vulnerable to eviction,
clearing, quota/access failures, and competing-tab overwrites. The async boundary
does not make the underlying operation nonblocking or transactional. It is
appropriate only for discardable, nonsensitive demo data here.

There is no export/backup, durable-record guarantee, encryption guarantee,
cross-device sync, or offline application-loading guarantee. Reassess before
storing real product data; local-first is a design preference, not a security
or durability claim.

Consider IndexedDB when size, transactions, blobs, or querying justify it.
Consider cloud storage only with approved requirements for identity,
authentication, authorization, privacy/retention, imports, conflicts, offline
behavior, cost, and operations. Neither IndexedDB nor cloud adoption removes the
need for tested recovery, migration, or backup decisions.
