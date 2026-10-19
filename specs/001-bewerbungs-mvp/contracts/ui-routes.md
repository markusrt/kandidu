# Contract: UI routes and steps

Hash routes (`src/ui/router.tsx`). Route words are German because they are visible
in the address bar; they are stable identifiers, not catalog text.

| Route | View | Checkpoint |
| --- | --- | --- |
| `#/` | Start: setup progress, project list (C3: status counts), "Neues Projekt" | C1 (list), C3 (overview) |
| `#/einrichtung/profil` | Step 1 Persönliche Daten | C1 |
| `#/einrichtung/vorlagen` | Step 2 Vorlagen: demo downloads, upload, issues, used placeholders | C1 |
| `#/einrichtung/lebenslauf` | Step 3 Lebenslauf-PDF: filled CV DOCX download, CV PDF upload | C1 |
| `#/einrichtung/nachweise` | Step 4 Nachweise with tags | C2 |
| `#/platzhalter` | Placeholder explanation and full list | C1 |
| `#/projekte/:projectId/links` | Project step 1 title, links (C2: many, context; C3: "Stelle (im Anschreiben)") | C1 |
| `#/projekte/:projectId/prompt` | Project step 2 full prompt, copy | C1 |
| `#/projekte/:projectId/antwort` | Project step 3 paste, parse result, response history | C1 |
| `#/projekte/:projectId/leads` | Project step 4 lead list (C3: filter/sort/delete) | C1 |
| `#/projekte/:projectId/leads/:leadId/pruefen` | Lead step 1 review/edit (C3: "Links" block on top, "Stelle im Anschreiben") | C1 |
| `#/projekte/:projectId/leads/:leadId/anschreiben` | Lead step 2 cover letter DOCX + missing-value check | C1 |
| `#/projekte/:projectId/leads/:leadId/freigabe` | Lead step 3 PDF upload + explicit confirm | C1 |
| `#/projekte/:projectId/leads/:leadId/paket` | Lead step 4 compose + ZIP | C1 (one), C2 (many) |
| `#/projekte/:projectId/leads/:leadId/verlauf` | Lead lifecycle, comments | C3 |
| `#/daten` | Storage usage, persistence, backup export/import, reset | C2 |

Unknown routes and missing IDs render a "nicht gefunden" view with a link home.
Opening a project routes to the step matching `promptState` (draft → prompt,
copied → antwort, answered → leads) (FR-017). Every view has one `<h1>`, the
stepper is an `<ol>` with `aria-current="step"`, and status messages use a polite
live region; errors use `role="alert"`.
