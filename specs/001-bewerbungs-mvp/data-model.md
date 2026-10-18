# Data Model: Kandidu MVP (001-bewerbungs-mvp)

Types live in `src/domain/` (pure TypeScript). Persisted shapes are validated with
Zod in `src/storage/schema.ts` on every load (constitution IV). IDs are
`crypto.randomUUID()` strings created in the UI/composition layer and passed into
domain functions. Timestamps are ISO-8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`);
calendar dates entered by the user are `YYYY-MM-DD`.

## Storage layout (IndexedDB `kandidu:data`, version 1)

| Object store | Key | Value |
| --- | --- | --- |
| `meta` | `"meta"` | `{ schemaVersion: 1, revision: number }` |
| `profile` | `"profile"` | `Profile` |
| `templates` | `TemplateKind` | `TemplateRecord` (only user uploads; absence = demo active) |
| `documents` | `id` | `DocumentRecord` (Nachweise and the global CV PDF) |
| `projects` | `id` | `Project` |
| `leads` | `id` (index `projectId`) | `Lead` |
| `files` | `id` | `{ id, bytes: ArrayBuffer }` |

Every write transaction includes `meta` and increments `revision` (R1). File bytes
and their metadata are written in the same transaction.

## Entities

### Profile (FR-001, FR-002)

| Field | Type | Rules |
| --- | --- | --- |
| firstName, lastName | string | required, trimmed, 1–80 |
| street | string | required, 1–120 (Straße und Hausnummer) |
| postalCode | string | required, 4–10, `[0-9A-Za-z -]` |
| city | string | required, 1–80 |
| phone | string | required, 3–40, digits, spaces, `+()/-` |
| email | string | required, basic `local@domain.tld` check, ≤ 254 |
| birthDate | `YYYY-MM-DD` \| undefined | optional, valid past date |
| birthPlace, nationality | string \| undefined | optional, ≤ 80 |
| website | string \| undefined | optional, http(s) URL |
| updatedAt | timestamp | |

Validation returns `{ field, code: "required" | "too-long" | "invalid-format" }[]`.

### TemplateRecord (FR-003–FR-008)

| Field | Type | Rules |
| --- | --- | --- |
| kind | `"cv" \| "coverLetter"` | key |
| fileName | string | original name, ≤ 200 |
| fileId | string | → `files` |
| size | number | ≤ 10 MB (FR-042) |
| uploadedAt | timestamp | |
| tags | string[] | placeholder names used (from inspection) |

Only templates that passed validation are stored (FR-008). Absence of a record means
the built-in demo template for that kind is active.

### DocumentRecord (FR-009–FR-011, FR-028)

| Field | Type | Rules |
| --- | --- | --- |
| id | string | |
| role | `"evidence" \| "cv"` | exactly one `cv` record at most (global CV PDF) |
| name | string | required, 1–120 (display name) |
| fileName | string | original name |
| tags | string[] | evidence only; lower-cased, trimmed, unique, 1–40 chars each |
| fileId | string | → `files` |
| size | number | ≤ 20 MB |
| pageCount | number | ≥ 1, from PDF parse |
| uploadedAt | timestamp | |

Predefined tags (FR-010): `zeugnis`, `zertifikat`, `arbeitszeugnis`, `schulzeugnis`,
`referenz`. Tag suggestions = predefined ∪ tags in use, prefix/substring match.

### Project (FR-012–FR-017)

| Field | Type | Rules |
| --- | --- | --- |
| id | string | |
| title | string | required, 1–120 |
| links | `{ id, url }[]` | 1–20 at prompt time; http(s) URL ≤ 2 000; unique |
| promptContext | string | default `""`, ≤ 2 000; included only when non-empty (FR-015) |
| promptState | `"draft" \| "copied" \| "answered"` | see transitions |
| promptCopiedAt | timestamp \| undefined | |
| responses | `Response[]` | append-only until project deletion (FR-020) |
| responseDraft | string | text in the paste box not yet submitted (FR-017), ≤ 500 000 |
| createdAt, updatedAt | timestamp | |

`promptState` transitions: `draft → copied` (copy pressed or text selected
manually and confirmed); `copied → answered` (a response produced ≥ 1 lead);
editing links/title/context in `copied` keeps `copied` but marks the prompt as
changed so the UI suggests copying again; `answered → copied` when the user copies
again for a new round.

### Response (FR-018–FR-021)

| Field | Type | Rules |
| --- | --- | --- |
| id | string | |
| text | string | raw paste, ≤ 500 000 chars, stored before parsing |
| receivedAt | timestamp | |
| result | `ParseResult` | see contracts/llm-response.md |
| importedLeadIds | string[] | leads created from this response; non-empty → re-import asks first |

### Lead (FR-022–FR-035)

| Field | Type | Rules |
| --- | --- | --- |
| id, projectId | string | |
| responseId, responseIndex | string, number | origin (duplicate guard, FR-021) |
| sourceUrl | string \| undefined | http(s) |
| position | `{ title, referenceNumber?, location?, startDate?, employmentType? }` | title required 1–200 |
| company | `{ name, website?, address?: Address }` | name required 1–200 |
| contact | `Contact \| undefined` | `{ salutation?: "Frau"\|"Herr", title?, firstName?, lastName?, role?, email?, phone? }` |
| application | `{ channel: "portal"\|"email"\|"post"\|"other", portalUrl?, email?, postalAddress?: Address, deadline?, notes? }` | |
| process | string | Markdown, ≤ 20 000 |
| research | string | Markdown, ≤ 50 000 |
| motivation | string | plain text, ≤ 5 000; paragraphs split on blank lines; > 2 → warning |
| salutationOverride | string \| undefined | replaces the suggested Briefanrede (FR-023) |
| coverLetterPdf | `FileRef \| undefined` | `{ fileId, fileName, size, pageCount, uploadedAt }` |
| status | `LeadStatus` | current state, derived = last non-undone history entry |
| history | `StatusEntry[]` | append-only |
| comments | `Comment[]` | C3 |
| packages | `PackageDef[]` | C1: one; C2: many |
| createdAt, updatedAt | timestamp | |

`Address = { street?, postalCode?, city?, country? }`.

Review fields are editable only while `status = "review"` (FR-029).

### StatusEntry and lifecycle (FR-029, FR-034)

`StatusEntry = { id, status, at (timestamp), date? (YYYY-MM-DD for sent/decision),
interview?: { dateTime, mode: "onsite"|"online", location?, link? }, undoneAt? }`.

```text
review ──(gate: coverLetterPdf + global CV PDF + explicit confirm)──▶ ready
ready ──▶ sent(date) ──▶ interview(dateTime, onsite|online) ──▶ interview (next round)
sent | interview ──▶ accepted | rejected
review | ready | sent | interview ──▶ withdrawn
ready | sent ──▶ failed
undo: the latest non-undone entry gets undoneAt; the previous entry is current again.
      Undo of ready→review uses "Zurück in den Review" (removes coverLetterPdf only
      after confirmation).
```

Terminal: `accepted`, `rejected`, `withdrawn`, `failed` (left only via undo).
Initial entry `review` is created with the lead and cannot be undone. Domain
function `allowedTransitions(status)` and `applyTransition(lead, input, id, now)`
throw `LeadError("transition-not-allowed" | "gate-incomplete" | "nothing-to-undo")`.

### PackageDef (FR-030–FR-033)

`{ id, fileName, items: PackageItem[] }` with
`PackageItem = { kind: "coverLetter" } | { kind: "cv" } | { kind: "document", documentId }`.
Rules: ≥ 1 item, no duplicate item in one package; `fileName` ends with `.pdf`,
sanitized, unique within the lead (case-insensitive) — the domain appends ` (2)` etc.
Default package: `[coverLetter, cv]`, name `JJJJ-MM-TT_Firma_Bewerbung.pdf`.

### Comment (FR-035)

`{ id, date (YYYY-MM-DD), text (1–2 000), createdAt, updatedAt }`.

### Placeholder (FR-005–FR-007) — static catalog, not persisted

See contracts/placeholders.md. `{ name, kind: "text"|"block"|"blockItem",
templates: TemplateKind[], source: "profile"|"lead"|"system" }`.

## Error codes (typed, mapped to text in `src/ui/i18n`)

- `StoreError`: `read-failed`, `data-invalid`, `save-failed`, `quota-exceeded`,
  `conflict`, `file-missing`, `delete-failed`, `unsupported-version`,
  `store-blocked`, `record-invalid`.
- `FileError` (`src/files`): `file-too-large`, `docx-invalid`, `pdf-invalid`,
  `pdf-encrypted`, `render-failed`, `zip-failed`.
- `TemplateIssue` codes: `unknown-placeholder`, `wrong-template`, `block-misused`,
  `block-item-outside`, `unopened-tag`, `unclosed-tag`, `duplicate-open`,
  `duplicate-close`, `loop-mismatch`, `unclosed-block`, `unopened-block`,
  `syntax-other`.
- `ParseIssue` (`src/llm`): `no-json-found`, `json-invalid`, `schema-invalid`,
  `response-too-large`, plus per-field `missing`, `wrong-type`, `invalid`.
- `LeadError`: `not-in-review`, `gate-incomplete`, `transition-not-allowed`,
  `nothing-to-undo`, `lead-invalid`, `already-imported`.
- `ProjectError`: `title-invalid`, `link-invalid`, `link-duplicate`,
  `too-many-links`, `no-links`, `context-too-long`, `draft-too-large`,
  `link-not-found`. `ProfileError`: `profile-invalid`.
