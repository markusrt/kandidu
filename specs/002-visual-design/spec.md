# Feature Specification: Kandidu – Visuelles Design (ruhiger und moderner)

**Feature Branch**: `002-visual-design`

**Created**: 2026-11-27

**Status**: C1 spike accepted on 2026-11-27 with Go for „Geführt“ (GATE T011); Light phase (US2, US3, C3) planned

**Spec Language**: de-DE

**UI Default Locale**: de-DE (unverändert)

**Input**: User description: "Das visuelle Design von Kandidu verbessern, ohne die Funktion zu ändern. Nicht ändern: Abläufe, Daten, Datenformat (Rückwärtskompatibilität), Texte, Barrierefreiheit darf nur besser werden. Erfolgskriterien: alle bestehenden Unit- und E2E-Tests unverändert grün; keine Änderungen in src/domain und src/storage; Rollen und Labels bleiben; WCAG-AA-Kontrast, axe ohne Befund, 360 px ohne horizontales Scrollen, sichtbarer Fokus; Farben, Abstände und Schrift über Design-Tokens."

## Clarifications

### Session 2026-11-27

- Q: Welche Designrichtungen vergleicht der Spike? → A: „Ruhig“ (mehr Weißraum, weiche Flächen, Status als Plaketten, Navigation ohne Unterstreichung) und „Geführt“ (Fortschritt und Schrittleiste als eigene Spalte bzw. kompakte Leiste, farbige Kopfzeile). „Seriös“ (Serifen, Papierton) ist verworfen.
- Q: Welches Designziel gilt? → A: Ruhiger und moderner.
- Q: Welche Schrift und Farben? → A: Paket D: Schrift „Atkinson Hyperlegible Next“ als Webfont, Farbpalette „Waldgrün“ (Akzent #2a6a4c). Gewählt aus vier gerenderten Paketen (A Inter/Schieferblau, B Plus Jakarta Sans/Petrol, C Figtree/Indigo, D Atkinson Hyperlegible Next/Waldgrün).
- Q: Darf die Lead-Tabelle auf schmalen Breiten anders aussehen? → A: Ja, als Kartenliste, aber nur per CSS; die Tabellen-Semantik bleibt.
- Q: Wie wird der Webfont geladen? → A: Selbst gehostet und mit der App ausgeliefert, keine Anfrage an fremde Server (Annahme aus „alles bleibt in diesem Browser“ und dem bestehenden Netzwerk-Schutz der E2E-Tests; die Owner-Wahl „gerne mit Webfonts“ sah die selbst gehosteten Pakete).

### Session 2026-11-27 (C1 gate)

- Q: Welche Richtung gilt? → A: „Geführt“ (Go). „Ruhig“ entfällt als eigene Richtung; seine Grundgestaltung bleibt die Basis, auf der „Geführt“ aufsetzt.
- Q: Was ändert sich zusätzlich? → A: Die Farben der Status-Plaketten (z. B. „offen“, „erledigt“) passen sich der Palette „Waldgrün“ an; die bisherigen Amber/Grün-Töne wirkten nicht zusammengehörig.
- Q: Wie geht es weiter? → A: Light (US2, US3, ein C3-Gate).
- Q: Selbst gehostete Schrift? → A: Ja, sofern sie mit GitHub Pages funktioniert (geprüft: Build mit `--base /kandidu/`, Schriftdateien laden vom selben Ursprung, CSP `font-src 'self'`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Startseite und „Lead prüfen“ wirken ruhig und modern (Priority: P1)

Eine Person, die sich bewirbt, öffnet Kandidu und sieht eine ruhige, moderne und vertrauenswürdige Oberfläche: klare Hierarchie, gut lesbare Schrift, wenig visuelles Rauschen. Auf der Startseite erkennt sie sofort, was in der Einrichtung offen ist und welche Projekte es gibt. Beim Prüfen eines Leads findet sie Kontext, Status, Schritte und den Hinweis zur Prüfung der Angaben auf einen Blick. Alles funktioniert genau wie vorher.

**Why this priority**: Startseite und „Lead prüfen“ sind die am häufigsten gesehenen Bildschirme. An ihnen entscheidet der Owner im Spike, welche Richtung („Ruhig“ oder „Geführt“) für alle Bildschirme gilt. Die riskanteste Annahme ist, dass sich das neue Design ohne Änderung an Rollen, Labels, Texten und Abläufen umsetzen lässt.

**Independent Test**: Startseite und „Lead prüfen“ in beiden Richtungen auf Desktop und 360 px öffnen, Screenshots mit dem Vorher-Zustand vergleichen, alle bestehenden Tests ausführen.

**Acceptance Scenarios**:

1. **Given** eine leere Kandidu-Installation, **When** die Startseite geöffnet wird, **Then** erscheinen dieselben Texte, Überschriften und Bedienelemente wie vorher in der neuen Schrift, Palette und Gestaltung.
2. **Given** ein Projekt mit einem Lead, **When** „Lead prüfen“ geöffnet wird, **Then** sind Kontext, Status, Schrittleiste, Hinweis und Formularfelder neu gestaltet, mit unveränderten Namen für Screenreader.
3. **Given** eine Bildschirmbreite von 360 px, **When** eine der beiden Seiten angezeigt wird, **Then** gibt es kein horizontales Scrollen und die Schrittleiste braucht nicht mehr Platz als heute.
4. **Given** ein Browser, der vor dem Update Daten gespeichert hat, **When** die neue Version geladen wird, **Then** sind alle Daten unverändert da.

---

### User Story 2 - Alle übrigen Bildschirme folgen der gewählten Richtung (Priority: P2)

Nach der Entscheidung im Spike sehen alle Bildschirme einheitlich aus: Einrichtung (Persönliche Daten, Vorlagen, Lebenslauf, Nachweise), Platzhalter, Daten, Projekt-Schritte (Links, Prompt, Antwort, Leads), alle Lead-Schritte (Prüfen, Anschreiben, Freigabe, Paket, Verlauf) und „Seite nicht gefunden“.

**Why this priority**: Ein Design, das nur auf zwei Seiten gilt, wirkt unfertig. Es baut auf den Grundlagen aus US1 auf.

**Independent Test**: Jeden Bildschirm auf Desktop und 360 px öffnen, Screenshots prüfen, axe ausführen, alle bestehenden Tests ausführen.

**Acceptance Scenarios**:

1. **Given** die gewählte Richtung, **When** ein beliebiger Bildschirm geöffnet wird, **Then** nutzt er dieselbe Schrift, Palette, Abstände und Bauteile (Karten, Schaltflächen, Felder, Hinweise, Status).
2. **Given** Fehler- und Warnmeldungen (z. B. ungültige Antwort, Speicherwarnung), **When** sie erscheinen, **Then** sind sie klar als Fehler oder Warnung erkennbar, nicht nur durch Farbe.

---

### User Story 3 - Lead-Liste ist auf schmalen Bildschirmen gut lesbar (Priority: P3)

Auf dem Handy erscheint die Lead-Liste als Liste von Karten statt als gequetschte Tabelle. Auf dem Desktop brechen Spaltenköpfe und Schaltflächen nicht mehr mitten im Wort um („Unterneh-men“, „Lösch-en“).

**Why this priority**: Heute ist die Tabelle auf schmalen Breiten schwer lesbar; das ist der größte Layoutmangel außerhalb der Spike-Seiten.

**Independent Test**: Projekt mit mehreren Leads, Leads-Schritt auf 360 px und Desktop öffnen; Screenshots prüfen; Screenreader-Rollen (Tabelle, Spaltenköpfe, Zellen) per Test prüfen.

**Acceptance Scenarios**:

1. **Given** 360 px Breite, **When** die Lead-Liste angezeigt wird, **Then** steht jeder Lead als Karte mit Beschriftung je Angabe untereinander, ohne horizontales Scrollen.
2. **Given** ein Screenreader, **When** die Lead-Liste gelesen wird, **Then** bleibt sie eine Tabelle mit denselben Spaltenköpfen.

---

### Edge Cases

- Sehr lange Firmen-, Stellen- oder Projekttitel und lange Links umbrechen, ohne das Layout zu sprengen.
- Der Webfont lädt nicht (z. B. blockiert): Die Seite bleibt mit Systemschrift voll nutzbar.
- Vergrößerte Schrift (200 % Browser-Zoom) und Textabstände nach WCAG 1.4.12 verdecken keine Inhalte.
- Hoher-Kontrast-Modus (forced colors): Fokus, Rahmen von Feldern und Schaltflächen bleiben sichtbar.
- Reduzierte Bewegung: Es gibt keine Animation, die nicht abschaltbar ist.
- Deaktivierte Schaltflächen (z. B. „Projekt anlegen“ ohne Titel) bleiben als deaktiviert erkennbar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Die Oberfläche MUST Farben, Abstände, Schriftgrößen, Schriftfamilie, Radien und Rahmen ausschließlich aus einem zentralen Satz benannter Design-Tokens beziehen; außerhalb der Token-Definition stehen keine festen Farbwerte.
- **FR-002**: Die Oberfläche MUST die Schrift „Atkinson Hyperlegible Next“ verwenden, mit der App ausgeliefert und ohne Anfrage an fremde Server; fällt sie aus, MUST eine Systemschrift einspringen.
- **FR-003**: Die Oberfläche MUST die Palette „Waldgrün“ verwenden (Paket D der Clarification vom 2026-11-27) und dabei die Kontrastregeln aus FR-008 einhalten.
- **FR-004**: Im Spike MUST es zwei vollständige Gestaltungen der Startseite und von „Lead prüfen“ geben, „Ruhig“ und „Geführt“, die auf Desktop und 360 px verglichen werden können; nach der Owner-Entscheidung MUST nur die gewählte Richtung bleiben (gewählt: „Geführt“, 2026-11-27).
- **FR-005**: Alle sichtbaren und für Screenreader bestimmten Texte MUST unverändert bleiben (Meldungskatalog unverändert).
- **FR-006**: Rollen, zugängliche Namen, Beschriftungen, Überschriftenebenen, Landmarken und Reihenfolge der Bedienelemente MUST unverändert bleiben.
- **FR-007**: Abläufe, gespeicherte Daten, Datenformat und Sicherungsdateien MUST unverändert bleiben; Daten aus früheren Versionen MUST weiter lesbar sein. Domain- und Speicherschicht werden nicht geändert.
- **FR-008**: Text MUST mindestens 4,5 : 1 Kontrast haben (große Schrift 3 : 1); Rahmen von Eingabefeldern, Fokusanzeige und Zustandsmarken MUST mindestens 3 : 1 gegen ihre Umgebung haben (WCAG 2.1 AA, 1.4.3 und 1.4.11).
- **FR-009**: Jedes bedienbare Element MUST bei Tastaturfokus eine deutlich sichtbare Fokusanzeige haben.
- **FR-010**: Bei 360 px Breite MUST kein Bildschirm horizontal scrollen.
- **FR-011**: Die Lead-Liste MUST auf schmalen Breiten als Kartenliste erscheinen, nur durch Gestaltung, mit erhaltener Tabellen-Semantik; auf dem Desktop MUST kein Spaltenkopf und keine Schaltfläche mitten im Wort umbrechen.
- **FR-012**: Status und Meldungen (offen, erledigt, Fehler, Warnung) MUST außer durch Farbe auch durch Text erkennbar bleiben.
- **FR-013**: Die Gestaltung MUST reduzierte Bewegung respektieren und im Modus „forced colors“ Fokus und Rahmen sichtbar lassen.
- **FR-014**: Startseite und „Lead prüfen“ MUST mit Vorher- und Nachher-Screenshots (Desktop und 360 px) auf der Gate-Seite gezeigt werden; am C3-Gate gilt das für jeden umgestalteten Bildschirm.
- **FR-015**: Status-Plaketten (z. B. „offen“, „erledigt“, „Antwort ausstehend“) MUST Farben aus der Palette „Waldgrün“ verwenden, die mit dem Akzent harmonieren, über eigene Status-Tokens; Kontrast nach FR-008, Zustand weiterhin auch als Text (FR-012).

### Key Entities

Keine neuen oder geänderten Daten. Neu ist nur der Satz der **Design-Tokens** (benannte Werte für Farbe, Schrift, Abstand, Radius, Rahmen, Fokus), der zur Oberfläche gehört.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Alle bestehenden Unit- und E2E-Tests laufen grün, ohne dass eine bestehende Testdatei geändert wurde.
- **SC-002**: Der Branch ändert keine Datei in `src/domain` und `src/storage` und keinen Text im Meldungskatalog.
- **SC-003**: Eine automatische Barrierefreiheitsprüfung (axe, WCAG 2.1 A/AA) findet auf jedem Hauptbildschirm, Desktop und 360 px, keinen einzigen Befund, unabhängig vom Schweregrad.
- **SC-004**: Auf jedem Hauptbildschirm ist bei 360 px die Seitenbreite nicht größer als das Fenster.
- **SC-005**: Jedes per Tab erreichbare Element zeigt bei Fokus eine Anzeige mit mindestens 3 : 1 Kontrast.
- **SC-006**: Eine automatische Prüfung findet außerhalb der Token-Definition keinen festen Farbwert in den Stylesheets.
- **SC-007**: Beim Laden der App gibt es keine Anfrage an fremde Server (auch nicht für die Schrift).
- **SC-008**: Für jeden umgestalteten Bildschirm sind nach höchstens drei Design-Kritik-Runden keine Befunde der Stufen „blocker“ oder „should-fix“ offen; offene „nits“ stehen auf der Gate-Seite.
- **SC-009**: Der Owner wählt am Spike-Gate eine der beiden Richtungen (oder lehnt beide ab) anhand der Screenshots.

## Assumptions

- Nur helles Farbschema; ein dunkles Schema ist nicht Teil dieses Features.
- Kein neues Logo; der Schriftzug „Kandidu“ bleibt Text.
- Die erzeugten Dokumente (DOCX, PDF, Paket) sind nicht betroffen; es geht nur um die Oberfläche im Browser.
- Kleine Markup-Änderungen (zusätzliche Hülle oder Klasse) sind erlaubt, wenn Rollen, Namen, Texte und Reihenfolge gleich bleiben; wo möglich genügt CSS.
- Der Webfont darf das ausgelieferte Paket um etwa 25 KB (zwei Schriftschnitte, nur lateinische Zeichen) vergrößern.
- Deutsch bleibt einzige Sprache; Layouts bleiben tolerant für längere Texte.

## Out of Scope

- Neue Funktionen, neue Texte, geänderte Abläufe.
- Dunkler Modus, Logo, Illustrationen.
- Gestaltung der erzeugten Dokumente.
