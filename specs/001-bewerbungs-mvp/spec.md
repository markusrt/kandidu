# Feature Specification: Kandidu – Bewerbungs-Assistent (MVP)

**Feature Branch**: `001-bewerbungs-mvp`

**Created**: 2026-10-18

**Status**: C1 (US1) accepted by the owner on 2026-10-18 and shipped; C2 (US2–US5) implemented and verified, awaiting the owner's decision at GATE T057 (2026-10-19)

**Spec Language**: de-DE

**UI Default Locale**: de-DE (Englisch später möglich, eigenes Feature)

**Input**: User description: "Kandidu (Bewerbungs-Assistent): eine lokale Web-App (reine Browser-SPA), die eine einzelne Person durch den Bewerbungsprozess führt, von den Unterlagen über die Recherche bis zum versendeten Paket und dessen Verlauf." Vollständiger Owner-Brief vom 2026-10-18 inkl. Owner-Entscheidungen, Checkpoint-Plan und offenen Fragen.

## Overview

Kandidu ist ein Bewerbungs-Assistent für genau eine Person, der vollständig im
Browser läuft. Die Person hinterlegt einmalig ihre persönlichen Daten, Word-Vorlagen
für Lebenslauf und Anschreiben sowie Nachweise (Zeugnisse, Zertifikate). Pro
Bewerbungs-Projekt erzeugt die App einen Prompt für ein beliebiges externes
Sprachmodell (LLM), liest dessen strukturierte Antwort tolerant ein und macht
daraus Bewerbungs-Leads. Pro Lead erzeugt die App ausgefüllte DOCX-Dokumente, nimmt
nach bewusster Freigabe die vom Nutzer selbst erstellten PDFs entgegen, stellt
daraus Bewerbungspakete als ZIP zusammen und verfolgt den weiteren Verlauf.

### Confirmed Owner Decisions (2026-10-18, nicht neu verhandeln)

- Kein DOCX→PDF im Browser: Die App liefert DOCX, der Nutzer wandelt selbst in PDF
  (Word/LibreOffice) und lädt die PDFs als bewussten Gate-Schritt hoch.
- Speicherung ausschließlich lokal im Browser (Dateien und Daten), kein Konto, kein
  Server. Manueller Export und Import aller Daten als Sicherungs-ZIP.
- C1 = ein Lead durchgängig (siehe Checkpoint Mapping).
- Desktop zuerst (aktuelle Chrome, Edge, Firefox), am Smartphone bedienbar.
- Keine Telemetrie, keine Übertragung an Dritte durch die App. Der LLM-Prompt
  enthält standardmäßig keine persönlichen Daten (nur Links und Projekttitel) und
  wird vor dem Kopieren vollständig angezeigt.
- Nur kostenfreie Open-Source-Bausteine; keine kostenpflichtigen Zusatzmodule.
- In Tests, Demos und Repository ausschließlich synthetische Daten.
- Aufbewahrung: bis der Nutzer löscht; Löschen entfernt wirklich alle zugehörigen
  Daten und Dateien.

### Checkpoint Mapping

| Checkpoint | User Stories | Inhalt |
| --- | --- | --- |
| C1 – Risky core | US1 | Ein Lead durchgängig mit synthetischen Daten |
| C2 – Useful and recoverable | US2, US3, US4, US5 | Dokumente mit Tags, mehrere Links/Leads, flexible Pakete, Fortsetzen nach Pause, Sicherung, Fehler/Wiederherstellung, Tastatur, Barrierefreiheit, Mobil |
| C3 – Agreed acceptance | US6, US7 | Lebenszyklus mit Kommentaren und Daten, Übersicht und Verwaltung, Löschen, Abnahme |

## Clarifications

### Session 2026-10-18

- Q: Wird das Lebenslauf-PDF pro Lead hochgeladen oder einmal als wiederverwendbarer Standard? → A: Nur einmal, global für alle Leads, ohne Überschreibung je Lead.
- Q: Welche Zustände und Übergänge soll der Lebenszyklus eines Leads haben? → A: Hauptpfad Review → Bereit zum Versenden → Versendet (Datum) → Einladung zum Gespräch (mehrfach möglich) → Zusage | Absage; zusätzlich Zurückgezogen und Fehlgeschlagen; der jeweils letzte Statuswechsel ist rückgängig machbar; jeder Wechsel wird datiert im Verlauf geführt.
- Q: Darf der LLM-Prompt optional einen selbst geschriebenen Kurztext (z. B. Qualifikationen) enthalten? → A: Ja, optional je Projekt, standardmäßig leer/aus; wenn befüllt, im vollständigen Prompt sichtbar mit Hinweis, dass der Text an das externe LLM geht; nie automatisch Profildaten.
- Q: Welche Größengrenzen für Uploads und welches Verhalten bei knappem Browser-Speicher? → A: Höchstens 20 MB je PDF und 10 MB je DOCX-Vorlage; Speicherstand anzeigen, Warnung ab 80 % des vom Browser gemeldeten Kontingents, Browser um dauerhaften Speicher bitten; bei Ablehnung Hinweis auf möglichen Datenverlust und Sicherung empfehlen.

### Session 2026-10-19

- Q: Soll der Lebenslauf-Download „Trotzdem herunterladen“ verlangen, wenn nur optionale Profilfelder (Geburtsdatum, Geburtsort, Staatsangehörigkeit, Website) leer sind? → A: Nein. Leere optionale Platzhalter werden nur als Hinweis angezeigt, der Download geht normal; die bewusste Bestätigung („Trotzdem herunterladen“) gibt es nur, wenn Platzhalter für Pflichtangaben leer bleiben würden. Das Anschreiben bleibt unverändert.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ein Lead durchgängig vom Profil bis zum ZIP (Priority: P1)

Eine Person richtet Kandidu einmalig ein (persönliche Daten, Vorlagen; den
ausgefüllten Lebenslauf lädt sie einmal als DOCX herunter, wandelt ihn selbst in
PDF um und lädt dieses Lebenslauf-PDF einmal hoch), legt ein Bewerbungs-Projekt mit einem Link zu einer Stellenausschreibung an, kopiert den
angezeigten Prompt in ein externes LLM, fügt dessen JSON-Antwort ein und erhält
einen Lead. Sie prüft und bearbeitet den Lead, lädt das ausgefüllte Anschreiben als
DOCX herunter, wandelt es selbst in PDF um, lädt das Anschreiben-PDF hoch und
verlässt damit bewusst den Review-Modus. Anschließend stellt sie ein
einzelnes PDF zusammen und lädt es als ZIP herunter.

Diese Story prüft die drei riskantesten Annahmen: (1) vom Nutzer in Word
bearbeitete Vorlagen werden zuverlässig befüllt und Platzhalterfehler verständlich
erklärt; (2) beliebige LLM-Antworten werden robust eingelesen und geprüft;
(3) Speichern und Zusammenführen von PDFs sowie das Erstellen eines ZIP gelingen im
Browser bei realistischen Dateigrößen.

**Why this priority**: Ohne diesen Durchstich hat das Produkt keinen Nutzen, und
alle drei technischen Kernrisiken liegen auf diesem Pfad (Verfassung, Prinzip I).

**Independent Test**: Mit synthetischen Daten vollständig im Browser durchspielbar:
Profil anlegen → Demo-Vorlagen laden, eine bearbeitete Vorlage hochladen → Projekt
mit einem Link → Prompt kopieren → Beispiel-JSON (mit Code-Fences) einfügen →
Lebenslauf-DOCX herunterladen und Lebenslauf-PDF einmal hochladen → Lead
bearbeiten → Anschreiben-DOCX herunterladen und Inhalt prüfen → Anschreiben-PDF
hochladen und Freigabe bestätigen → ein zusammengeführtes PDF im ZIP prüfen
(Seitenzahl = Summe der Eingaben).

**Acceptance Scenarios**:

1. **Given** ein leeres Kandidu, **When** die Person ihre persönlichen Daten erfasst
   und speichert, **Then** werden sie erst nach erfolgreichem Schreiben als
   „gespeichert“ angezeigt und sind nach dem Neuladen der Seite noch vorhanden.
2. **Given** die Einrichtung, **When** die Person die Demo-Vorlage für Lebenslauf
   bzw. Anschreiben herunterlädt, **Then** erhält sie je eine gültige DOCX-Datei, die
   nur bekannte Platzhalter enthält und in Word/LibreOffice öffnet.
3. **Given** eine hochgeladene DOCX-Vorlage mit einem unbekannten Platzhalter (z. B.
   `{Vornahme}`) oder einer fehlerhaften Klammerung (z. B. `{Vorname`), **When** die
   Vorlage geprüft wird, **Then** wird sie abgelehnt bzw. nicht als nutzbar markiert
   und die Meldung nennt den betroffenen Platzhalter bzw. Textausschnitt, den
   Fehlertyp in verständlicher Sprache und einen Lösungshinweis; bekannte Platzhalter
   werden auch dann erkannt, wenn Word ihren Text intern in mehrere Abschnitte
   zerlegt hat.
4. **Given** eine fehlerfreie eigene Vorlage, **When** sie hochgeladen wird, **Then**
   ersetzt sie die bisher aktive Vorlage ihres Typs und die Liste der darin
   verwendeten Platzhalter wird angezeigt.
5. **Given** ein neues Projekt mit Titel und einem Link, **When** die Person den
   Prompt öffnet, **Then** sieht sie den vollständigen Prompt-Text inkl. JSON-Schema,
   der nur Projekttitel und Links (keine persönlichen Daten) enthält, und kann ihn
   mit einem Klick kopieren, mit sichtbarer Bestätigung.
6. **Given** ein Projekt mit kopiertem Prompt, **When** die Person eine Antwort
   einfügt, die gültiges JSON gemäß Schema enthält, auch umgeben von Code-Fences oder
   erklärendem Text, **Then** entsteht genau ein Lead pro Eintrag in der Antwort und
   die eingefügte Antwort bleibt im Projekt gespeichert.
7. **Given** eine eingefügte Antwort, die kein JSON enthält, ungültiges JSON ist oder
   dem Schema nicht entspricht, **When** sie eingelesen wird, **Then** werden keine
   Leads erzeugt, die Meldung nennt verständlich, was fehlt oder falsch ist (mit
   Feldangabe), und der eingefügte Text bleibt unverändert erhalten und bearbeitbar.
8. **Given** ein Lead im Review, **When** die Person Motivationsteil (Absätze durch
   Leerzeile, höchstens 2), Recherche (Markdown, als formatierte Vorschau sichtbar),
   Kontaktdaten, Firmenadresse und Bewerbungsweg bearbeitet und speichert, **Then**
   sind die Änderungen nach dem Neuladen vorhanden.
9. **Given** ein Lead mit vollständigen Daten und aktiven Vorlagen, **When** die
   Person das Anschreiben herunterlädt, **Then** erhält sie eine DOCX-Datei, in der
   alle Platzhalter durch die Daten von Profil und Lead ersetzt sind, der
   Motivationsteil als eigene Absätze erscheint und die Formatierung der Vorlage
   erhalten bleibt; ebenso liefert der Lebenslauf-Download in der Einrichtung eine
   mit den Profildaten ausgefüllte DOCX.
10. **Given** ein Lead, für den Pflichtdaten eines in der Vorlage verwendeten
    Platzhalters fehlen, **When** die Person herunterladen will, **Then** zeigt die
    App vorher, welche Platzhalter leer bleiben würden, und lässt die Person
    ergänzen oder bewusst trotzdem herunterladen.
11. **Given** ein Lead im Review und ein einmal hochgeladenes Lebenslauf-PDF,
    **When** die Person das Anschreiben-PDF hochlädt und die Freigabe ausdrücklich
    bestätigt, **Then** verlässt der Lead den Review-Modus (Status „Bereit zum
    Versenden“); ohne Anschreiben-PDF, ohne Lebenslauf-PDF oder ohne Bestätigung
    bleibt er im Review, und fehlt das Lebenslauf-PDF, führt die App direkt zu dessen
    Upload.
12. **Given** ein freigegebener Lead, **When** die Person ein Paket „alles in einem
    PDF“ zusammenstellt und herunterlädt, **Then** erhält sie ein ZIP mit einem
    sinnvoll benannten PDF, dessen Seiten in der gewählten Reihenfolge den
    hochgeladenen PDFs entsprechen.
13. **Given** eine hochgeladene Datei, die kein lesbares PDF ist (falscher Typ,
    beschädigt, passwortgeschützt), **When** sie hochgeladen oder zusammengeführt
    wird, **Then** meldet die App das verständlich und bewahrt alle bisherigen Daten.

---

### User Story 2 - Nachweise mit Namen und Tags verwalten (Priority: P2)

Die Person lädt Zeugnisse, Zertifikate usw. als PDF hoch, vergibt je einen Namen
und Tags. Vorgegebene Tags stehen bereit, eigene Tags können angelegt werden,
vorhandene Tags werden beim Tippen vorgeschlagen. Diese Dokumente stehen in jedem
Paket zur Auswahl.

**Why this priority**: Vollständige Bewerbungspakete brauchen Nachweise; der Kern
(US1) funktioniert aber auch ohne.

**Independent Test**: Drei synthetische PDFs hochladen, benennen, taggen (ein
vorgegebener, ein eigener Tag), nach Tag filtern, umbenennen, löschen; nach dem
Neuladen ist der Stand erhalten.

**Acceptance Scenarios**:

1. **Given** die Dokumentverwaltung, **When** die Person ein PDF mit Namen und Tag
   „zeugnis“ hochlädt, **Then** erscheint es in der Liste mit Name, Tags, Seitenzahl
   und Dateigröße.
2. **Given** vorhandene Tags, **When** die Person im Tag-Feld tippt, **Then** werden
   passende vorhandene Tags vorgeschlagen; ein neuer Begriff kann als eigener Tag
   angelegt werden.
3. **Given** ein Dokument, das in keinem Paket verwendet wird, **When** die Person
   es nach Bestätigung löscht, **Then** sind Eintrag und Datei vollständig entfernt.

---

### User Story 3 - Mehrere Links und Leads, flexible Pakete (Priority: P2)

Ein Projekt enthält mehrere Links; eine LLM-Antwort erzeugt mehrere Leads. Pro
Lead stellt die Person ein oder mehrere PDFs aus beliebiger Kombination von
Anschreiben-PDF, Lebenslauf-PDF und Nachweisen zusammen (z. B. „Anschreiben +
Lebenslauf“ und „Zeugnisse“ getrennt), benennt sie und lädt alles als ein ZIP.

**Why this priority**: Macht das Produkt für reale Bewerbungsrunden nützlich;
baut direkt auf US1 auf.

**Independent Test**: Projekt mit drei Links, Antwort mit drei Leads einfügen; für
einen Lead zwei Paket-PDFs definieren, Reihenfolge ändern, ZIP prüfen.

**Acceptance Scenarios**:

1. **Given** ein Projekt, **When** die Person mehrere Links hinzufügt, entfernt
   oder ändert, **Then** spiegelt der Prompt genau diese Links wider.
2. **Given** eine Antwort mit n Einträgen, **When** sie eingelesen wird, **Then**
   entstehen n Leads; ungültige Einträge werden einzeln benannt, und die Person kann
   entscheiden, nur die gültigen zu übernehmen.
3. **Given** ein freigegebener Lead, **When** die Person zwei Paket-PDFs mit je
   eigener Auswahl, Reihenfolge und Dateiname definiert, **Then** enthält das ZIP
   genau diese zwei PDFs mit den gewählten Namen.
4. **Given** eine Paketdefinition, **When** die Person sie erneut öffnet, **Then**
   ist die zuletzt gespeicherte Zusammenstellung vorbelegt.

---

### User Story 4 - Pausieren, Fortsetzen und Fehler überstehen (Priority: P2)

Zwischen Prompt-Kopieren und Antwort-Einfügen kann beliebig Zeit vergehen. Kommt
die Person zurück, landet sie wieder im richtigen Schritt. Lese-/Schreibfehler,
knapper Speicher und ungültige gespeicherte Daten werden verständlich gemeldet,
ohne Daten stillschweigend zu verlieren. Die App ist vollständig per Tastatur und
mit Screenreader bedienbar; Übersicht, Status und Kommentare funktionieren am
Smartphone.

**Why this priority**: Kernversprechen „Zwischenstand bleibt erhalten“ und
Verfassungsprinzip V; Voraussetzung für C2.

**Independent Test**: Prompt kopieren, Tab schließen, wieder öffnen → Projekt steht
auf „Antwort einfügen“; simulierter Schreibfehler zeigt Fehlermeldung und bewahrt
Eingaben; kompletter US1-Pfad per Tastatur; Übersicht in Smartphone-Breite.

**Acceptance Scenarios**:

1. **Given** ein Projekt mit kopiertem, aber unbeantwortetem Prompt, **When** die
   Person die App nach einem Neustart des Browsers öffnet, **Then** zeigt sie das
   Projekt als „Antwort ausstehend“ und führt direkt zum Einfügen.
2. **Given** ein Speicherfehler beim Sichern, **When** die Person speichert,
   **Then** erscheint eine verständliche Meldung mit Wiederholen-Möglichkeit, die
   Eingaben bleiben im Formular und nichts wird als gespeichert angezeigt.
3. **Given** der Browser-Speicher ist fast voll, **When** die Person eine Datei
   hochlädt, **Then** warnt die App vorher und empfiehlt Sicherung bzw. Aufräumen.
4. **Given** beschädigte oder unbekannte gespeicherte Daten, **When** die App
   startet, **Then** zeigt sie eine Wiederherstellungsansicht (erneut versuchen,
   Sicherung importieren) und überschreibt nichts automatisch.
5. **Given** eine Tastatur ohne Maus, **When** die Person den US1-Pfad durchläuft,
   **Then** ist jedes Bedienelement erreichbar, der Fokus sichtbar und jede
   Statusmeldung wird für Screenreader angesagt.

---

### User Story 5 - Sicherung exportieren und importieren (Priority: P2)

Die Person exportiert alle Daten und Dateien als Sicherungs-ZIP und kann sie in
einem anderen Browser oder nach dem Löschen der Browserdaten wieder importieren.

**Why this priority**: Browser-Speicher kann gelöscht oder verdrängt werden; die
Sicherung ist die einzige Absicherung (Owner-Entscheidung).

**Independent Test**: Vollständigen US1-Stand exportieren, in frischem Browserprofil
importieren, alle Leads, Vorlagen, PDFs und Pakete sind identisch vorhanden.

**Acceptance Scenarios**:

1. **Given** vorhandene Daten, **When** die Person exportiert, **Then** erhält sie
   ein ZIP mit allen Daten und Dateien, das ausdrücklich als „enthält persönliche
   Daten“ gekennzeichnet ist.
2. **Given** ein leeres Kandidu, **When** die Person eine gültige Sicherung
   importiert, **Then** ist der vollständige Stand wiederhergestellt.
3. **Given** vorhandene Daten, **When** die Person eine Sicherung importiert,
   **Then** fragt die App vorher ausdrücklich, ob der aktuelle Stand ersetzt werden
   soll, und ändert bei Abbruch oder ungültiger Sicherung nichts.

---

### User Story 6 - Lebenszyklus mit Daten und Kommentaren (Priority: P3)

Pro Lead verfolgt die Person den Verlauf: Entwurf/Review → Bereit zum Versenden →
Versendet (Datum) → Einladung zum Gespräch (Datum, Ort/Adresse oder online) →
Zusage/Absage, dazu die Zustände Zurückgezogen (durch die Person) und
Fehlgeschlagen (Bewerbung konnte nicht abgeschickt werden) sowie datierte Kommentare (z. B. „Bestätigungs-E-Mail erhalten“).

**Why this priority**: Nutzen nach dem Versand; setzt US1 voraus.

**Independent Test**: Lead durch alle Hauptzustände führen, je ein Datum erfassen,
zwei Kommentare anlegen; Verlauf zeigt alle Einträge chronologisch.

**Acceptance Scenarios**:

1. **Given** ein freigegebener Lead, **When** die Person „Versendet“ mit Datum
   setzt, **Then** erscheint der Statuswechsel mit Datum im Verlauf.
2. **Given** ein versendeter Lead, **When** die Person eine Einladung mit Termin
   und Ort oder „online“ (mit optionalem Link) erfasst, **Then** ist der Termin am
   Lead und in der Übersicht sichtbar.
3. **Given** ein beliebiger Lead, **When** die Person einen Kommentar mit Datum
   hinzufügt, bearbeitet oder löscht, **Then** wird der Verlauf entsprechend
   aktualisiert.
4. **Given** ein Lead in einem Zustand, **When** die Person einen neuen Zustand
   wählt, **Then** sind nur die erlaubten Übergänge gemäß FR-034 wählbar.
5. **Given** ein Lead mit mindestens einem Statuswechsel, **When** die Person den
   letzten Statuswechsel rückgängig macht und bestätigt, **Then** gilt wieder der
   vorherige Zustand, und der Verlauf vermerkt die Rücknahme.
6. **Given** ein Lead mit Einladung, **When** die Person eine weitere Einladung
   (zweite Gesprächsrunde) erfasst, **Then** stehen beide Termine im Verlauf, und
   die Übersicht zeigt den nächsten anstehenden Termin.

---

### User Story 7 - Übersicht, Verwaltung und Löschen (Priority: P3)

Die Person sieht alle Projekte und je Projekt alle Leads mit Firma, Stelle, Status,
nächstem Termin und letzter Aktivität, gut lesbar auch am Smartphone. Sie kann
filtern/sortieren und Leads sowie Projekte nach Bestätigung löschen; dabei werden
alle zugehörigen Daten und Dateien entfernt.

**Why this priority**: Verwaltbarkeit bei vielen Bewerbungen; Abschluss der
Abnahme (C3).

**Independent Test**: Zwei Projekte mit je mehreren Leads; nach Status filtern;
einen Lead und ein Projekt löschen und prüfen, dass keine zugehörigen Dateien mehr
gespeichert sind.

**Acceptance Scenarios**:

1. **Given** mehrere Projekte, **When** die Person die Startseite öffnet, **Then**
   sieht sie je Projekt Titel, Anzahl Leads je Status und ob eine Antwort aussteht.
2. **Given** ein Projekt, **When** die Person die Lead-Übersicht nach Status filtert
   oder nach Datum sortiert, **Then** wird die Liste entsprechend angezeigt.
3. **Given** ein Lead, **When** die Person ihn löscht und bestätigt, **Then** sind
   Lead, sein Anschreiben-PDF, Pakete, Verlauf und Kommentare entfernt; ohne
   Bestätigung bleibt alles erhalten.
4. **Given** ein Projekt, **When** die Person es löscht und bestätigt, **Then** sind
   das Projekt, alle seine Leads und alle zugehörigen Dateien entfernt; Profil,
   Vorlagen und Nachweise bleiben erhalten.

---

### Edge Cases

- Word zerlegt `{Vorname}` intern in mehrere Textabschnitte (z. B. nach
  Rechtschreibkorrektur oder Formatierung einzelner Buchstaben): Der Platzhalter muss
  trotzdem erkannt werden.
- Vorlage enthält typografische Klammern, Leerzeichen im Platzhalter (`{ Vorname }`),
  falsche Groß-/Kleinschreibung (`{vorname}`), doppelte oder fehlende Klammern,
  nicht geschlossene Schleifen: verständliche Meldung, möglichst mit Vorschlag
  („Meinten Sie {Vorname}?“).
- Hochgeladene Datei ist kein DOCX (z. B. `.doc`, `.odt`, `.pdf`, umbenannte Datei)
  oder ist beschädigt.
- LLM-Antwort enthält Code-Fences mit Sprachangabe, Text davor/danach, mehrere
  JSON-Blöcke, ein einzelnes Objekt statt einer Liste, abschließende Kommas,
  typografische Anführungszeichen, unbekannte Zusatzfelder, fehlende optionale Felder,
  zu lange Motivation (mehr als 2 Absätze).
- Sehr lange eingefügte Antwort (z. B. > 200 000 Zeichen).
- Ansprechpartner unbekannt: Anschreiben nutzt eine neutrale Anrede.
- Bewerbungsweg ohne Firmenadresse (nur Portal): Adressplatzhalter bleiben leer und
  werden vor dem Download angekündigt.
- PDF ist passwortgeschützt, beschädigt, sehr groß oder hat viele Seiten.
- Speicher-Kontingent erreicht oder Browser verweigert dauerhaften Speicher;
  privater Modus mit flüchtigem Speicher.
- Zwei Tabs mit Kandidu gleichzeitig geöffnet: kein stilles Überschreiben.
- Gespeicherte Daten aus einer neueren/unbekannten Version oder beschädigt.
- Sicherungs-ZIP ist unvollständig, manipuliert oder aus einer neueren Version.
- Dateinamen mit Umlauten, Sonderzeichen, Schrägstrichen oder sehr langen Firmennamen.
- Löschen einer Vorlage oder eines Nachweises, der in Leads/Paketen verwendet wird.
- Ersetzen des globalen Lebenslauf-PDFs: Es gilt danach für alle künftig erzeugten
  Pakete, auch von bereits versendeten Leads; die App weist vor dem Ersetzen darauf
  hin.
- Löschen des Lebenslauf-PDFs, während Leads bereits freigegeben sind: Pakete mit
  Lebenslauf können erst nach erneutem Hochladen erzeugt werden; die Freigabe bleibt
  bestehen.
- Upload über der Größengrenze (20 MB PDF, 10 MB DOCX): Ablehnung mit Nennung der
  Grenze, vor jedem Speichern.

## Requirements *(mandatory)*

### Functional Requirements

**Einrichtung: Profil**

- **FR-001**: Nutzer MÜSSEN ihre persönlichen Daten erfassen und bearbeiten können:
  Vorname, Nachname, Straße und Hausnummer, PLZ, Ort, Telefon, E-Mail (Pflicht) sowie
  Geburtsdatum, Geburtsort, Staatsangehörigkeit, Website/Profil-Link (optional).
- **FR-002**: Das System MUSS Eingaben prüfen (z. B. E-Mail-Format, gültiges Datum)
  und Fehler am jeweiligen Feld verständlich anzeigen.

**Einrichtung: Vorlagen**

- **FR-003**: Das System MUSS je eine Demo-DOCX-Vorlage für Lebenslauf und
  Anschreiben zum Herunterladen bereitstellen, die ausschließlich synthetische
  Beispieltexte und gültige Platzhalter enthält.
- **FR-004**: Nutzer MÜSSEN je Typ (Lebenslauf, Anschreiben) eine eigene DOCX-Vorlage
  hochladen können; genau eine Vorlage je Typ ist aktiv. Ohne eigene Vorlage ist die
  Demo-Vorlage aktiv.
- **FR-005**: Das System MUSS eine verständliche Erklärung der Platzhalter-Syntax
  (z. B. `{Vorname}`, Absatz-Wiederholung für den Motivationsteil) und eine
  vollständige Liste aller verfügbaren Platzhalter je Vorlagentyp mit Beschreibung
  und Beispielwert anzeigen.
- **FR-006**: Platzhalter für den Lebenslauf MÜSSEN auf persönliche Daten beschränkt
  sein. Platzhalter für das Anschreiben MÜSSEN persönliche Daten, Ansprechpartner,
  Firmenname und Firmenadresse, Stellenbezeichnung, Briefanrede, Datum und den
  Motivationsteil abdecken.
- **FR-007**: Das System MUSS hochgeladene Vorlagen beim Hochladen prüfen und
  unbekannte Platzhalter, Platzhalter des falschen Vorlagentyps, fehlerhafte
  Klammerungen und nicht geschlossene Abschnitte mit Fundstelle (Textausschnitt),
  verständlicher Erklärung und Lösungshinweis melden. Intern zerlegter Text MUSS
  dabei wie zusammenhängender Text behandelt werden.
- **FR-008**: Eine Vorlage mit Fehlern DARF NICHT aktiv werden; die bisher aktive
  Vorlage bleibt unverändert.

**Einrichtung: Nachweise**

- **FR-009**: Nutzer MÜSSEN PDF-Dokumente (Zeugnisse, Zertifikate usw.) mit Namen und
  beliebig vielen Tags hochladen, umbenennen, umtaggen und löschen können.
- **FR-010**: Das System MUSS vorgegebene Tags bereitstellen (mindestens „zeugnis“,
  „zertifikat“, „arbeitszeugnis“, „schulzeugnis“, „referenz“), eigene Tags erlauben
  und vorhandene Tags beim Eingeben vorschlagen. Tags werden ohne Beachtung der
  Groß-/Kleinschreibung als gleich behandelt.
- **FR-011**: Nutzer MÜSSEN Nachweise nach Tag filtern können.

**Projekt und Prompt**

- **FR-012**: Nutzer MÜSSEN Bewerbungs-Projekte mit Titel anlegen, umbenennen und
  ihnen einen oder mehrere Links zu Stellenausschreibungen hinzufügen, ändern und
  entfernen können. Links MÜSSEN gültige http(s)-Adressen sein.
- **FR-013**: Das System MUSS aus Projekttitel und Links einen Prompt erzeugen, der
  das von der App definierte JSON-Antwortschema enthält und vom LLM verlangt: Stelle,
  Unternehmen, Ansprechpartner, Firmenadresse, Bewerbungsweg (Portal-Link, E-Mail,
  Post, Sonstiges), Infos zum Bewerbungsprozess, Unternehmensrecherche passend zur
  Stelle mit Quellenlinks (Markdown) und einen Vorschlag für den Motivationsteil
  (höchstens 2 Absätze), je Stellenausschreibung ein Eintrag.
- **FR-014**: Der Prompt DARF standardmäßig keine persönlichen Daten enthalten und
  MUSS vor dem Kopieren vollständig und unverändert so angezeigt werden, wie er
  kopiert wird.
- **FR-015**: Das System MUSS je Projekt einen optionalen, vom Nutzer selbst
  geschriebenen Kontext für den Prompt (z. B. Qualifikationen, höchstens 2 000 Zeichen)
  unterstützen. Er ist standardmäßig leer, wird nur übernommen, wenn der Nutzer ihn
  befüllt, erscheint dann im vollständig angezeigten Prompt und wird mit dem
  Hinweis versehen, dass dieser Text an das externe LLM übermittelt wird. Profildaten
  werden nie automatisch in den Prompt übernommen.
- **FR-016**: Das System MUSS das Kopieren per Schaltfläche ermöglichen, den Erfolg
  bestätigen und bei verweigertem Zwischenablage-Zugriff ein manuelles Markieren und
  Kopieren ermöglichen.
- **FR-017**: Das System MUSS den Zwischenstand „Prompt erzeugt/kopiert, Antwort
  ausstehend“ je Projekt dauerhaft speichern und beim nächsten Öffnen dort
  fortsetzen; eine bereits teilweise eingefügte Antwort MUSS als Entwurf erhalten
  bleiben.

**Antwort einlesen**

- **FR-018**: Das System MUSS die eingefügte Antwort tolerant einlesen: JSON in
  Code-Fences oder zwischen erklärendem Text finden, ein einzelnes Objekt wie eine
  Liste mit einem Eintrag behandeln und unbekannte Zusatzfelder ignorieren.
- **FR-019**: Das System MUSS jeden Eintrag gegen das Schema prüfen und Fehler
  feldgenau und verständlich melden (z. B. „Eintrag 2: Firmenname fehlt“). Fehlende
  optionale Felder sind kein Fehler.
- **FR-020**: Die eingefügte Antwort DARF NIE verloren gehen: Sie wird vor dem
  Einlesen gespeichert und bleibt nach Erfolg und Fehler einsehbar, und eine neue
  Antwort ersetzt eine frühere nur nach Bestätigung.
- **FR-021**: Aus einer gültigen Antwort MÜSSEN 1–n Leads im Projekt entstehen. Bei
  teilweise ungültigen Antworten MUSS der Nutzer wählen können, nur die gültigen
  Einträge zu übernehmen (C2). Erneutes Einlesen derselben Antwort DARF KEINE
  Duplikate stillschweigend erzeugen.

**Lead: Review und Dokumente**

- **FR-022**: Nutzer MÜSSEN je Lead bearbeiten können: Stelle, Unternehmen,
  Ansprechpartner (Anrede, Titel, Vor-/Nachname, Funktion, E-Mail, Telefon),
  Firmenadresse, Bewerbungsweg, Prozess-Infos, Recherche (Markdown, mit formatierter
  Vorschau; Links öffnen in neuem Tab) und Motivationsteil (Plain-Text, Absätze durch
  Leerzeile, höchstens 2 Absätze, mit sichtbarem Hinweis bei Überschreitung).
- **FR-023**: Das System MUSS eine Briefanrede vorschlagen (bekannter Ansprechpartner
  mit Anrede → „Sehr geehrte Frau …“/„Sehr geehrter Herr …“, sonst „Sehr geehrte
  Damen und Herren“), die der Nutzer überschreiben kann.
- **FR-024**: Nutzer MÜSSEN je Lead das ausgefüllte Anschreiben und in der Einrichtung
  den ausgefüllten Lebenslauf als DOCX herunterladen können; alle Platzhalter werden
  mit den aktuellen Daten von Profil (und beim Anschreiben des Leads) ersetzt, Formatierung und Layout der Vorlage bleiben
  erhalten, und der Motivationsteil erscheint als getrennte Absätze.
- **FR-025**: Vor dem Download MUSS das System anzeigen, welche in der Vorlage
  verwendeten Platzhalter leer bleiben würden, und Ergänzen oder bewusstes
  Fortfahren ermöglichen. Beim Lebenslauf verlangt nur ein leerer Platzhalter für
  eine Pflichtangabe (FR-001) das bewusste Fortfahren; leere optionale Platzhalter
  werden nur als Hinweis angezeigt (Clarification 2026-10-19).
- **FR-026**: Das System DARF KEIN DOCX in PDF umwandeln; es erklärt dem Nutzer
  stattdessen, wie er die PDF in Word bzw. LibreOffice erstellt.
- **FR-027**: Downloads MÜSSEN sinnvoll benannt sein: `JJJJ-MM-TT_Firma_Anschreiben.docx`
  bzw. `JJJJ-MM-TT_Vorname_Nachname_Lebenslauf.docx` (Datum = Erstelldatum, Namen in
  dateisystemsicherer Form).

**Lead: Freigabe-Gate**

- **FR-028**: Nutzer MÜSSEN je Lead genau ein Anschreiben-PDF hochladen (und ersetzen)
  können. Das Lebenslauf-PDF wird einmal global hochgeladen (in der Einrichtung oder
  direkt aus dem Freigabe-Schritt, wenn es fehlt), gilt für alle Leads, kann ersetzt
  und gelöscht werden und hat keine Überschreibung je Lead. Vor dem Ersetzen weist
  die App darauf hin, dass es für alle künftig erzeugten Pakete gilt.
- **FR-029**: Ein Lead DARF den Review-Modus nur verlassen, wenn sein Anschreiben-PDF
  und das globale Lebenslauf-PDF vorliegen und der Nutzer die Freigabe ausdrücklich
  bestätigt. Danach sind die Review-Daten
  schreibgeschützt; ein bewusstes „Zurück in den Review“ ist möglich und verwirft die
  hochgeladene Anschreiben-PDF erst nach Bestätigung.

**Paket**

- **FR-030**: Nutzer MÜSSEN je freigegebenem Lead ein oder mehrere Paket-PDFs aus
  beliebiger Kombination von Anschreiben-PDF, Lebenslauf-PDF und Nachweisen
  zusammenstellen, die Reihenfolge festlegen und jedes Paket-PDF benennen können
  (C1: ein Paket-PDF; C2: mehrere).
- **FR-031**: Das System MUSS Vorschläge für Paketnamen machen
  (`JJJJ-MM-TT_Firma_Bewerbung.pdf`, `…_Anschreiben_Lebenslauf.pdf`,
  `…_Zeugnisse.pdf`) und Namenskonflikte im ZIP verhindern.
- **FR-032**: Das System MUSS die Paket-PDFs vollständig im Browser zusammenführen und
  als ein ZIP herunterladen; keine Datei verlässt das Gerät.
- **FR-033**: Die Paketzusammenstellung je Lead MUSS gespeichert werden.

**Lebenszyklus und Übersicht**

- **FR-034**: Jeder Lead MUSS einen Status mit datiertem Verlauf haben. Zustände:
  Review, Bereit zum Versenden, Versendet (Datum), Einladung zum Gespräch
  (Datum/Uhrzeit, Ort/Adresse oder online mit optionalem Link), Zusage, Absage,
  Zurückgezogen, Fehlgeschlagen. Erlaubte Übergänge: Review → Bereit (nur über das
  Freigabe-Gate, FR-029); Bereit → Versendet; Versendet → Einladung; Einladung →
  Einladung (weitere Runde); Versendet oder Einladung → Zusage oder Absage; jeder
  Zustand außer Zusage, Absage, Zurückgezogen, Fehlgeschlagen → Zurückgezogen;
  Bereit oder Versendet → Fehlgeschlagen. Zusätzlich MUSS der jeweils letzte
  Statuswechsel nach Bestätigung rückgängig gemacht werden können (auch aus
  Abschlusszuständen); die Rücknahme wird im Verlauf vermerkt. Die Rücknahme von
  Bereit nach Review folgt FR-029 („Zurück in den Review“).
- **FR-035**: Nutzer MÜSSEN je Lead datierte Kommentare anlegen, bearbeiten und
  löschen können.
- **FR-036**: Das System MUSS eine Projektliste und je Projekt eine Lead-Übersicht mit
  Firma, Stelle, Status, nächstem Termin und letzter Aktivität anzeigen, nach Status
  filterbar und nach Datum sortierbar, auch am Smartphone lesbar und bedienbar.
- **FR-037**: Nutzer MÜSSEN Leads und Projekte nach ausdrücklicher Bestätigung löschen
  können; das Löschen MUSS alle zugehörigen Daten und Dateien entfernen (Leads:
  Anschreiben-PDF, Pakete, Verlauf, Kommentare; Projekte: zusätzlich gespeicherte
  Prompt-Antworten und alle Leads).
- **FR-038**: Das Löschen einer Vorlage oder eines Nachweises MUSS anzeigen, wo er
  noch verwendet wird, und nach Bestätigung auch diese Verwendungen entfernen;
  gelöschte Vorlagen fallen auf die Demo-Vorlage zurück.

**Speicherung, Sicherung, Robustheit**

- **FR-039**: Alle Daten und Dateien MÜSSEN ausschließlich lokal im Browser gespeichert
  werden. Die App DARF KEINE Netzwerkanfragen mit Nutzerdaten senden, keine
  Telemetrie erfassen und keine externen Ressourcen zur Laufzeit nachladen.
- **FR-040**: Das System DARF Daten erst als gespeichert anzeigen, wenn das Schreiben
  erfolgreich war; Schreibfehler MÜSSEN gemeldet werden und Wiederholen ermöglichen,
  ohne Eingaben zu verwerfen.
- **FR-041**: Gespeicherte Daten MÜSSEN beim Laden geprüft werden; beschädigte oder
  unbekannte Daten führen zu einer Wiederherstellungsansicht, nie zu automatischem
  Löschen oder Überschreiben.
- **FR-042**: Das System MUSS Uploads auf höchstens 20 MB je PDF und 10 MB je
  DOCX-Vorlage begrenzen und größere Dateien vor dem Speichern mit Nennung der Grenze
  ablehnen. Es MUSS den Speicherstand anzeigen, ab 80 % des vom Browser gemeldeten
  Kontingents vor weiteren Uploads warnen und den Browser um dauerhaften Speicher
  bitten, mit verständlicher Erklärung; lehnt der Browser ab, weist es auf möglichen
  Datenverlust hin und empfiehlt eine Sicherung.
- **FR-043**: Nutzer MÜSSEN alle Daten und Dateien als Sicherungs-ZIP exportieren und
  wieder importieren können. Der Import prüft die Sicherung vollständig, bevor er
  etwas ändert, und ersetzt vorhandene Daten nur nach ausdrücklicher Bestätigung.
- **FR-044**: Gleichzeitiges Arbeiten in zwei Tabs DARF NICHT zu stillem Überschreiben
  führen; das System erkennt veraltete Stände und fordert zum Neuladen auf.
- **FR-045**: Das System MUSS die Person deutlich darauf hinweisen, dass Daten nur in
  diesem Browser liegen, durch Löschen der Browserdaten verloren gehen können und
  regelmäßig gesichert werden sollten.

**Bedienbarkeit und Sprache**

- **FR-046**: Einrichtung und Projekt-Workflow MÜSSEN als klare Schritte (Stepper)
  mit erkennbarem Fortschritt und aktuellem Schritt geführt werden.
- **FR-047**: Alle Funktionen MÜSSEN per Tastatur bedienbar sein, mit sichtbarem
  Fokus, beschrifteten Bedienelementen, semantischer Struktur und für Screenreader
  angesagten Status- und Fehlermeldungen.
- **FR-048**: Alle Texte der Oberfläche MÜSSEN auf Deutsch (de-DE) aus einem
  Sprachkatalog kommen; Daten und Zahlen werden gemäß de-DE formatiert.

### Key Entities *(include if feature involves data)*

- **Profil**: persönliche Daten der einen Person; genau eines.
- **Lebenslauf-PDF**: genau ein globales, vom Nutzer erzeugtes PDF; gilt für alle
  Leads, ohne Überschreibung je Lead.
- **Vorlage**: DOCX-Datei mit Typ (Lebenslauf/Anschreiben), Name, Hochladedatum,
  Prüfergebnis und Liste verwendeter Platzhalter; je Typ ist eine aktiv; Demo-Vorlagen
  sind eingebaut.
- **Platzhalter**: Name, Vorlagentyp(en), Bedeutung, Beispielwert, Datenquelle
  (Profil/Lead), Pflicht ja/nein.
- **Nachweis (Dokument)**: PDF-Datei mit Name, Tags, Seitenzahl, Größe, Hochladedatum.
- **Tag**: Bezeichnung; vorgegeben oder eigen.
- **Projekt**: Titel, Links, optionaler Prompt-Kontext, Prompt-Zwischenstand
  (erzeugt/kopiert/Antwort ausstehend/eingelesen), gespeicherte Antworten, Leads.
- **Antwort (LLM-Rohtext)**: eingefügter Text mit Zeitpunkt und Einleseergebnis;
  geht nie verloren, bis Projekt gelöscht wird.
- **Lead**: Stelle, Unternehmen, Ansprechpartner, Firmenadresse, Bewerbungsweg,
  Prozess-Infos, Recherche (Markdown), Motivationsteil, Briefanrede, Quelle (Link),
  Status mit Verlauf, Kommentare, Anschreiben-PDF, Pakete.
- **Paket**: Name, geordnete Liste von Bestandteilen (Anschreiben-PDF, Lebenslauf-PDF,
  Nachweise).
- **Statuseintrag**: Zustand, Datum, Details (z. B. Gesprächsort, online-Link),
  Kennzeichen „rückgängig gemacht“.
- **Kommentar**: Datum, Text.
- **Sicherung**: ZIP mit allen Entitäten und Dateien sowie Format-Version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Eine Person ohne Vorkenntnisse durchläuft mit vorbereiteten
  synthetischen Daten (Profil, PDFs, Beispiel-Antwort) den US1-Pfad vom leeren
  Kandidu bis zum ZIP in höchstens 15 Minuten, ohne externe Hilfe.
- **SC-002**: 100 % der Platzhalter in den Demo-Vorlagen und in mindestens drei in
  Word bzw. LibreOffice bearbeiteten Testvorlagen (inkl. intern zerlegter
  Platzhalter) werden korrekt ersetzt; die gelieferte DOCX öffnet ohne
  Reparaturmeldung in Word und LibreOffice.
- **SC-003**: Für jede der dokumentierten fehlerhaften Vorlagen-Varianten (Edge Cases)
  nennt die Meldung den betroffenen Platzhalter/Textausschnitt und einen
  Lösungshinweis.
- **SC-004**: Aus einem Testkorpus von mindestens 10 Antwortvarianten (mit/ohne
  Code-Fences, Text davor/danach, Einzelobjekt, fehlende optionale Felder) werden
  alle schemagültigen korrekt eingelesen; alle ungültigen werden ohne Leads und mit
  feldgenauer Meldung abgelehnt; in 100 % der Fälle bleibt der eingefügte Text
  erhalten.
- **SC-005**: Ein Paket aus PDFs mit zusammen mindestens 25 MB und 60 Seiten wird auf
  einem üblichen Desktop-Rechner in unter 30 Sekunden als ZIP bereitgestellt, und die
  Seitenzahl des Ergebnisses entspricht der Summe der Eingaben.
- **SC-006**: Nach Neuladen, Tab-Schließen oder Browser-Neustart ist jeder als
  gespeichert angezeigte Stand vollständig vorhanden, einschließlich ausstehender
  Prompts und eingefügter Antworten.
- **SC-007**: Ein Export mit anschließendem Import in ein frisches Browserprofil stellt
  100 % der Daten und Dateien wieder her (Dateien bitgleich).
- **SC-008**: Bei automatisierten Prüfungen sendet die App keine einzige
  Netzwerkanfrage an fremde Ziele.
- **SC-009**: Der US1-Pfad ist ausschließlich per Tastatur durchführbar, und
  automatisierte Barrierefreiheitsprüfungen der Hauptansichten zeigen keine
  kritischen Verstöße.
- **SC-010**: Projekt- und Lead-Übersicht, Statuswechsel und Kommentare sind bei 360 px
  Breite ohne horizontales Scrollen bedienbar.
- **SC-011**: Nach dem Löschen eines Leads oder Projekts sind keine zugehörigen Daten
  oder Dateien mehr gespeichert (geprüft über den Speicherinhalt).

## Assumptions

- Genau eine Person nutzt Kandidu je Browserprofil; keine Konten, keine Mehrbenutzer.
- Die Person hat Zugang zu einem externen LLM mit Webzugriff und kopiert Prompt und
  Antwort selbst; die App ruft kein LLM auf und prüft die inhaltliche Richtigkeit der
  Recherche nicht.
- Die Person kann DOCX in Word, LibreOffice o. Ä. öffnen und als PDF speichern.
- Geburtsdatum ist optional, da es in deutschen Bewerbungen nicht verpflichtend ist.
- Nur DOCX-Vorlagen (kein `.doc`, `.odt`, `.dotx`); nur PDF für Nachweise, Anschreiben- und Lebenslauf-PDF.
- Lebenslauf-Inhalte (Stationen, Kenntnisse) pflegt die Person direkt in ihrer
  Vorlage; Kandidu verwaltet keinen Lebenslauf.
- Ein für alle Bewerbungen gleicher Lebenslauf genügt (Clarification 2026-10-18);
  stellenbezogene Lebensläufe sind nicht Teil des MVP.
- Paketnamen und Downloadnamen folgen `JJJJ-MM-TT_Firma_Inhalt` (FR-027, FR-031);
  anpassbar.
- Die App muss nach dem ersten Laden nicht offline funktionieren (kein Offline-Betrieb
  zugesichert); sie lädt zur Laufzeit aber keine externen Ressourcen nach.
- Verschlüsselung der lokalen Daten ist nicht Teil des MVP; der Schutz hängt vom
  Gerät und Browserprofil ab. Das wird in der App und in der Doku offen benannt.

### Out of Scope

- DOCX→PDF-Umwandlung, LLM-Anbindung per API, Versand von E-Mails oder
  Portal-Bewerbungen durch die App.
- Lebenslauf-Verwaltung (Stationen, Kenntnisse), Vorlagen-Editor im Browser.
- Konten, Synchronisation, Server, Cloud-Speicher, Mehrbenutzer.
- Weitere Sprachen als Deutsch (Englisch später als eigenes Feature).
- Kostenpflichtige Bibliotheken oder Dienste (z. B. Bezahlmodule für Vorlagen).
- Hosting/Deployment über den aufgezeichneten Ship-Mode hinaus.

### Open Items (nicht blockierend)

- Markenrecherche (DPMA/EUIPO/WIPO) vor einem öffentlichen Start; die Namensprüfung
  vom 2026-10-18 (keine Marke/kein Produkt im Web gefunden, Domains frei) ist keine
  Markenfreigabe.
