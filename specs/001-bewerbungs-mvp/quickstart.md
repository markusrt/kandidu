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
| C3 | `pnpm test:e2e -g "C3"` | lifecycle incl. undo and repeated interviews, comments, filters, cascade deletion verified via IndexedDB contents (SC-011) |

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
