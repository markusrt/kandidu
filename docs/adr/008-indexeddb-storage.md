# ADR 008: IndexedDB for Kandidu product data

Status: accepted. The storage technology is an owner decision (2026-10-18 brief:
"Speicherung nur lokal im Browser (IndexedDB für Dateien und Daten; als ADR
festhalten), kein Konto und kein Server, dazu manueller Export und Import aller
Daten als Sicherungs-ZIP"). Supersedes [ADR 002](002-storage.md) for product data;
ADR 002's recovery principles still apply.

## Context

Kandidu stores personal data (name, address, birth date, contact), Word templates
up to 10 MB, and PDFs up to 20 MB each (certificates, CV, cover letters). Data must
survive reloads and browser restarts, cascade deletes must remove all related
files, and a backup import must be all-or-nothing. localStorage (ADR 002) holds a
few MB of strings and has no transactions.

## Decision

- One IndexedDB database `kandidu:data` (schema version 1) with object stores
  `meta`, `profile`, `templates`, `documents`, `projects`, `leads`, `files`, accessed
  through the `idb` promise wrapper inside `src/storage/indexeddb.ts` only.
- The UI depends on the asynchronous `KandiduStore` port
  (`specs/001-bewerbungs-mvp/contracts/storage-port.md`); `src/main.tsx` composes the
  adapter.
- Every persisted record is validated with Zod on load. Corrupt data, unknown
  schema versions, and read failures block writes until a successful retry, a
  confirmed reset of this database, or a validated backup import. Nothing is deleted
  or overwritten automatically.
- Writes resolve only after the transaction commits; the UI shows "gespeichert"
  only then. Quota errors surface as `quota-exceeded`.
- File bytes are stored as `ArrayBuffer` next to their metadata in the same
  transaction; deletes remove both together.
- A `meta.revision` counter detects writes from another tab (`conflict`), and a
  `BroadcastChannel` asks other tabs to reload.
- The app requests persistent storage only on an explicit user action and shows
  usage from `navigator.storage.estimate()`.
- Schema migrations, when needed, are explicit tested `onupgradeneeded` steps,
  never a silent reset.

## Consequences

IndexedDB is origin-scoped, unencrypted, and can be evicted or cleared by the user
or browser (especially without persistent storage, in private windows, or under
storage pressure). It is not a backup: the backup ZIP (US5) is the only safeguard,
and the app says so (FR-045). Data does not sync between browsers or devices.
Anyone with access to the browser profile can read it; the MVP does not encrypt.

Tests use `fake-indexeddb` for the adapter in Node and real IndexedDB in Playwright;
fake and real engines can differ in quota and timing behaviour, so quota handling
must also be exercised in the browser (planned with US4, C2; not yet done in C1).

Reconsider when the owner wants sync, multiple devices, encryption at rest, or more
than one user; any cloud option needs the identity/privacy/retention approvals named
in ADR 002.
