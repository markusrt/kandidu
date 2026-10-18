# Contract: Template placeholders

Source of truth in code: `src/domain/placeholders.ts`. User-facing descriptions and
example values live in the `de` catalog (`placeholderHelp`). Syntax is docxtemplater
default delimiters `{` `}`; names are case-sensitive; surrounding spaces inside
braces are tolerated (`{ Vorname }` = `{Vorname}`).

## Personal data (CV and cover letter; source `profile`)

| Placeholder | Value |
| --- | --- |
| `{Vorname}` | first name |
| `{Nachname}` | last name |
| `{Name}` | "Vorname Nachname" |
| `{Strasse}` | street and number |
| `{PLZ}` | postal code |
| `{Ort}` | city |
| `{Telefon}` | phone |
| `{EMail}` | e-mail |
| `{Geburtsdatum}` | `TT.MM.JJJJ` or empty |
| `{Geburtsort}` | optional |
| `{Staatsangehoerigkeit}` | optional |
| `{Website}` | optional |

## Cover letter only (source `lead` or `system`)

| Placeholder | Value |
| --- | --- |
| `{Datum}` | today, long German date, e.g. "18. Oktober 2026" (system) |
| `{Stelle}` | position title |
| `{Referenznummer}` | reference number or empty |
| `{Firma}` | company name |
| `{FirmaStrasse}` / `{FirmaPLZ}` / `{FirmaOrt}` | company address (postal address of the application channel wins if set) |
| `{Ansprechpartner}` | e.g. "Frau Dr. Erika Muster" or empty |
| `{AnsprechpartnerAnrede}` / `{AnsprechpartnerTitel}` / `{AnsprechpartnerVorname}` / `{AnsprechpartnerNachname}` / `{AnsprechpartnerFunktion}` | contact parts |
| `{Briefanrede}` | salutationOverride, else "Sehr geehrte Frau Dr. Muster," / "Sehr geehrter Herr Muster," / "Sehr geehrte Damen und Herren," |
| `{#Motivation}` … `{Absatz}` … `{/Motivation}` | block repeated per motivation paragraph (max. 2). `{#Motivation}` and `{/Motivation}` must each stand in their own paragraph, `{Absatz}` in the paragraph between them. |

## Validation rules (FR-007)

| Situation | Issue code | Example message hint |
| --- | --- | --- |
| Name not in catalog | `unknown-placeholder` (+ suggestion) | `{Vornahme}` → „Meinten Sie {Vorname}?“ |
| Cover-letter placeholder in CV | `wrong-template` | `{Firma}` im Lebenslauf |
| `{Motivation}` used as plain tag, or `{#Vorname}` | `block-misused` | |
| `{Absatz}` outside the Motivation block | `block-item-outside` | |
| `}` without `{` / `{` without `}` | `unopened-tag` / `unclosed-tag` | |
| `{{Vorname}` / `{Vorname}}` | `duplicate-open` / `duplicate-close` | |
| `{#Motivation}`…`{/Andere}` | `loop-mismatch` | |
| `{#Motivation}` without close / close without open | `unclosed-block` / `unopened-block` | |
| anything else the engine rejects | `syntax-other` (engine id kept for diagnostics) | |

Each issue carries `{ code, tag?, context?, suggestion? }`. `context` is a short
text excerpt (≤ 60 chars) around the problem so the user can find it in Word.

## Demo templates (FR-003)

Generated at runtime from catalog paragraphs. They validate cleanly and contain a
core set: CV `Name, Strasse, PLZ, Ort, Telefon, EMail, Geburtsdatum`; cover letter
`Name, Datum, Stelle, Referenznummer, Firma, FirmaStrasse, FirmaPLZ, FirmaOrt,
Ansprechpartner, Briefanrede` and the Motivation block. Redundant variants (e.g.
`{Vorname}` next to `{Name}`) are listed on the help page instead. All sample text
is synthetic and comes from the catalog.
