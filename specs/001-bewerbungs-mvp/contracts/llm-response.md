# Contract: LLM prompt and response

Source of truth: `src/llm/schema.ts` (Zod). The JSON Schema in the prompt is
generated from it with `z.toJSONSchema()`. Prompt wording: `de` catalog
`prompt.build(...)`.

## Prompt (FR-013–FR-015)

Contents, in order:

1. Role and task: research each linked job advertisement and the company.
2. Project title.
3. Numbered list of links (exactly the project links).
4. Optional user context, only if non-empty, introduced as "Zusätzlicher Kontext
   der bewerbenden Person".
5. Output rules: answer **only** with one JSON object matching the schema; one
   entry in `leads` per advertisement; German language; research as Markdown with
   source links; motivation as at most two paragraphs separated by one blank line,
   tailored to the company, no invented facts about the applicant; use empty string
   or omit fields that are unknown, never guess contact persons.
6. The JSON Schema.

The prompt never includes profile data (FR-014). The UI shows the exact string that
the copy button copies.

## Response schema (version 1)

```jsonc
{
  "leads": [
    {
      "sourceUrl": "https://…",                 // optional
      "position": {
        "title": "Ausbildung zum Industriekaufmann (m/w/d)", // required
        "referenceNumber": "…", "location": "…", "startDate": "…", "employmentType": "…"
      },
      "company": {
        "name": "Beispiel GmbH",                  // required
        "website": "https://…",
        "address": { "street": "…", "postalCode": "…", "city": "…", "country": "…" }
      },
      "contact": {
        "salutation": "Frau" | "Herr" | "",       // anything else → treated as absent
        "title": "Dr.", "firstName": "…", "lastName": "…",
        "role": "…", "email": "…", "phone": "…"
      },
      "application": {
        "channel": "portal" | "email" | "post" | "other", // required
        "portalUrl": "…", "email": "…",
        "postalAddress": { "street": "…", "postalCode": "…", "city": "…", "country": "…" },
        "deadline": "…", "notes": "…"
      },
      "process": "Markdown …",                   // optional
      "research": "Markdown mit [Quellen](https://…)", // required
      "motivation": "Absatz 1\n\nAbsatz 2"      // required
    }
  ]
}
```

Tolerance rules:

- Root may also be an array of lead objects or a single lead object.
- Unknown keys are ignored; `null` and `""` mean absent; strings are trimmed.
- `channel` matching is case-insensitive; synonyms `e-mail`, `mail` → `email`,
  `online`, `website` → `portal`, `postal`, `brief` → `post`; else → `other`
  with the original value appended to `notes`.
- URLs that are not http(s) are dropped with a warning, not an error.

## ParseResult

```ts
type ParseResult =
  | { ok: true; leads: LeadDraft[]; warnings: ParseWarning[] }
  | { ok: false; error: "no-json-found" | "json-invalid" | "response-too-large";
      detail?: { line?: number; column?: number } }
  | { ok: false; error: "schema-invalid"; issues: EntryIssue[];
      validLeads: LeadDraft[] };              // C2: "nur gültige übernehmen"

type EntryIssue = { entry: number; path: string[]; kind: "missing" | "wrong-type" | "invalid" };
type ParseWarning = { entry: number; kind: "motivation-too-long" | "url-dropped" | "channel-unknown"; path?: string[] };
```

`entry` is 1-based for display. The UI maps `path` to German field labels.

## Test corpus (SC-004)

`src/llm/fixtures/` holds ≥ 10 synthetic responses: plain JSON; ```json fence;
fence without language; prose before/after; single object; root array; missing
optional fields; trailing commas; typographic quotes as delimiters; two JSON
blocks (first valid wins); invalid: no JSON, truncated JSON, missing
`company.name`, wrong type for `leads`, empty `leads` array.
