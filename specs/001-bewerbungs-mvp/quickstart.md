# Quickstart / validation guide: Kandidu MVP

## Prerequisites

Node 24.21.0, pnpm 10.34.7 (see README). Chromium for Playwright:
`pnpm exec playwright install --with-deps chromium`. Optional for the manual
SC-002 check: Microsoft Word or LibreOffice.

```sh
pnpm install --frozen-lockfile
pnpm verify                     # lint → typecheck → architecture → test → build → test:e2e
pnpm dev --host 127.0.0.1 --port 5173 --strictPort
```

`127.0.0.1` is reachable only on the machine running the server.

## Automated evidence per checkpoint

| Checkpoint | Command | Proves |
| --- | --- | --- |
| C1 | `pnpm test` | placeholder catalog/validation incl. split runs and every issue code (SC-002/003), letter data and salutation, LLM corpus (SC-004), lifecycle gate, file naming, PDF validate/merge, ZIP, IndexedDB adapter incl. read/write failures |
| C1 | `pnpm test:e2e -g "C1"` | US1 journey desktop + mobile; downloaded DOCX contains filled values; ZIP contains one PDF with expected pages; no foreign network requests (SC-008); 60-page/≈ 27 MB package < 30 s (SC-005) |
| C2 | `pnpm test:e2e -g "C2"` | reload/resume pending prompt (SC-006), write-failure and recovery, backup round trip (SC-007), keyboard-only US1 and axe scan (SC-009), 360 px layouts (SC-010) |
| C3 | `pnpm test:e2e -g "C3"` | C2 follow-ups R1–R4 (links block, prompt rules, original posting and sources, project "Stelle", a seeded v1 database upgraded to v2), lifecycle incl. undo and repeated interviews, comments, overview filter/sort, cascade deletion verified via IndexedDB contents (SC-011), keyboard focus after removals, axe on the new views, 360 px and 40 % longer text |

`-g` matches anywhere in the test title, so `-g "C1"` also runs the C2 test
"a full C1 state survives export and import". Validated on 2026-10-19:
C1 13 passed + 1 skipped (size test on chromium only), C2 48 passed, C3 48
passed (`KANDIDU_E2E_PORT=4174` on the agent machine).

## Manual C1 walkthrough (synthetic data only)

1. Open the app → Einrichtung → Persönliche Daten: enter "Erika Musterfrau",
   "Musterweg 1", "12345", "Musterstadt", "+49 30 1234567", "erika@example.org";
   save; reload → data still there.
2. Vorlagen: download both demo templates; open the cover letter in Word or
   LibreOffice, change `{Vorname}` formatting of one letter (forces split runs),
   add `{Vornahme}`, save, upload → rejected with "Meinten Sie {Vorname}?". Fix it,
   upload again → accepted, placeholder list shown.
3. Lebenslauf: download the filled CV DOCX, save as PDF, upload it.
4. Neues Projekt "Ausbildung zum Industriekaufmann", one link
   `https://example.org/stellen/123`; Prompt: check that no personal data appears;
   copy.
5. Antwort: paste `src/llm/fixtures/valid-fenced.txt` content → one lead.
   Paste `src/llm/fixtures/invalid-missing-company.txt` → error names "Eintrag 1:
   Firmenname", text still in the box.
6. Lead: edit motivation (two paragraphs), research preview; Anschreiben: download
   DOCX, open in Word/LibreOffice (expect no repair prompt, both paragraphs, all
   values filled), save as PDF.
7. Freigabe: upload that PDF, confirm → status "Bereit zum Versenden".
8. Paket: keep "Anschreiben + Lebenslauf", download ZIP → one PDF, pages =
   cover letter pages + CV pages.

Expected failures to try: upload a `.txt` renamed to `.pdf` (→ "keine gültige
PDF"), a PDF over 20 MB (→ size limit named), invalid JSON (→ error, text kept).

## Manual C3 walkthrough (synthetic data only)

Continue with the state of the C1 walkthrough (or any released lead).

1. Project step "Links": set "Stelle ({Stelle})" to "Industriekaufmann", save.
   Prompt: it asks for the original advertisement, the address research and
   a "sources" list; it does not contain "Industriekaufmann" from that field.
2. Antwort: paste `src/llm/fixtures/valid-original-sources.txt` → the lead's
   "Prüfen" step starts with the "Links" block (entered link, original
   posting, portal, website, three sources), each with "Öffnen" (new tab).
   Edit a link, add and remove a source, save, reload. Set "Stelle im
   Anschreiben" on this lead; the cover letter DOCX uses it, other leads use
   "Industriekaufmann".
3. Verlauf: Versendet → Einladung (vor Ort) → second Einladung (online) →
   Zusage; undo once; add, edit and delete a comment.
4. Start page: per-project counts per status and the next interview; lead
   list: filter by status, sort by next interview; delete a lead and a
   project (cancel first), then check that the other data is still there.

SC-001 (a person without prior knowledge finishes US1 in ≤ 15 minutes) can
only be checked by a person; the agent cannot measure it.
