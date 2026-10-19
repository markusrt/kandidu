import type { DemoParagraph } from "../../files/demoTemplates";

// German (de-DE) catalog: the default locale (constitution XII). Every
// user-facing string, including prompt text, demo template wording, file-name
// words and letter phrases, lives here. Parameterized text is a function so a
// translator controls word order.

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortDateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const timestampFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});
const numberFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});
const percentFormat = new Intl.NumberFormat("de-DE", {
  style: "percent",
  maximumFractionDigits: 0,
});

const isoToDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

function bytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${numberFormat.format(size / 1024)} KB`;
  return `${numberFormat.format(size / (1024 * 1024))} MB`;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const de = {
  locale: "de-DE",
  documentTitle: "Kandidu",

  format: {
    date: (iso: string) => dateFormat.format(isoToDate(iso)),
    shortDate: (iso: string) => shortDateFormat.format(isoToDate(iso)),
    timestamp: (iso: string) => timestampFormat.format(new Date(iso)),
    bytes,
    percent: (ratio: number) => percentFormat.format(ratio),
    pages: (n: number) => plural(n, "Seite", "Seiten"),
  },

  common: {
    appName: "Kandidu",
    tagline: "Dein Bewerbungs-Assistent – alles bleibt in diesem Browser.",
    skipToContent: "Zum Inhalt springen",
    save: "Speichern",
    saving: "Wird gespeichert …",
    saved: "Gespeichert.",
    unsaved: "Ungespeicherte Änderungen",
    unsavedConfirm:
      "Du hast ungespeicherte Änderungen. Seite trotzdem verlassen? Die Änderungen gehen dann verloren.",
    cancel: "Abbrechen",
    close: "Schließen",
    confirm: "Bestätigen",
    delete: "Löschen",
    retry: "Erneut versuchen",
    working: "Bitte warten …",
    loaded: "Daten geladen.",
    back: "Zurück",
    next: "Weiter",
    optional: "optional",
    required: "Pflichtfeld",
    download: "Herunterladen",
    upload: "Hochladen",
    replace: "Ersetzen",
    copied: "In die Zwischenablage kopiert.",
    notFoundHeading: "Nicht gefunden",
    notFoundText: "Diese Seite gibt es nicht (mehr).",
    toHome: "Zur Startseite",
    staleBanner:
      "Kandidu wurde in einem anderen Tab geändert. Bitte lade die Seite neu, bevor du weiterarbeitest.",
    reload: "Neu laden",
    stepOf: (current: number, total: number) =>
      `Schritt ${current} von ${total}`,
    localNotice:
      "Deine Daten liegen nur in diesem Browser auf diesem Gerät. Wer die Browserdaten löscht, löscht auch Kandidu.",
  },

  nav: {
    label: "Hauptnavigation",
    home: "Start",
    setup: "Einrichtung",
    placeholders: "Platzhalter",
    data: "Daten",
  },

  data: {
    heading: "Daten und Speicher",
    localHeading: "Wo deine Daten liegen",
    localText:
      "Kandidu speichert alles nur in diesem Browser auf diesem Gerät, nichts liegt auf einem Server. Wenn du die Browserdaten löschst, einen anderen Browser nutzt oder der Browser bei Speichermangel aufräumt, sind die Daten weg. Lege deshalb regelmäßig eine Sicherung an.",
    usageHeading: "Speicherstand",
    usage: (used: string, quota: string, percent: string) =>
      `Belegt: ${used} von ${quota} (${percent}).`,
    usageUnknown: "Dieser Browser meldet keinen Speicherstand.",
    usageWarning:
      "Der Speicher ist fast voll. Lege eine Sicherung an und lösche nicht mehr benötigte Dateien, bevor du weitere Dateien hochlädst.",
    persistenceHeading: "Dauerhafter Speicher",
    persistenceGranted:
      "Dauerhafter Speicher ist aktiv: Der Browser löscht die Kandidu-Daten nicht von sich aus, wenn der Speicher knapp wird.",
    persistenceDenied:
      "Der Browser darf die Kandidu-Daten bei Speichermangel von sich aus löschen.",
    persistenceUnsupported:
      "Dieser Browser bietet keinen dauerhaften Speicher an. Lege regelmäßig eine Sicherung an.",
    persistenceExplain:
      "Mit „Speicher dauerhaft anfordern“ bittest du den Browser, die Kandidu-Daten nicht von sich aus zu löschen. Manche Browser fragen dich dann, andere entscheiden selbst. Dabei wird nichts übertragen.",
    persistenceRequest: "Speicher dauerhaft anfordern",
    persistenceGrantedNow: "Der Browser hat dauerhaften Speicher gewährt.",
    persistenceDeniedNow:
      "Der Browser hat dauerhaften Speicher abgelehnt. Deine Daten können bei Speichermangel verloren gehen, lege regelmäßig eine Sicherung an.",
    resetHeading: "Alle Kandidu-Daten löschen",
    resetIntro:
      "Löscht alle Kandidu-Daten in diesem Browser. Lege vorher eine Sicherung an, wenn du sie noch brauchst.",
    uploadWarning: (percent: string) =>
      `Der Speicher dieses Browsers ist zu ${percent} belegt. Lege eine Sicherung an oder räume auf, bevor du weitere Dateien hochlädst.`,
    toData: "Zu „Daten und Speicher“",
  },

  backup: {
    heading: "Sicherung",
    intro:
      "Die Sicherung ist eine ZIP-Datei mit allen Kandidu-Daten und Dateien dieses Browsers. Damit stellst du alles in einem anderen Browser oder nach dem Löschen der Browserdaten wieder her.",
    personalData:
      "Die Sicherung enthält persönliche Daten: dein Profil, deine Vorlagen, deinen Lebenslauf, Nachweise und Bewerbungen. Bewahre sie sicher auf und gib sie nicht weiter.",
    export: "Sicherung herunterladen",
    exporting: "Sicherung wird erstellt …",
    exported: (name: string) => `${name} heruntergeladen.`,
    fileWord: "Sicherung",
    importHeading: "Sicherung importieren",
    importLabel: "Sicherungs-ZIP auswählen",
    importHint:
      "Eine ZIP-Datei, die Kandidu erstellt hat. Sie wird vollständig geprüft, bevor etwas geändert wird.",
    importing: "Sicherung wird geprüft …",
    replacePrompt: (name: string) =>
      `In diesem Browser sind schon Kandidu-Daten gespeichert. Sollen sie vollständig durch die Sicherung „${name}“ ersetzt werden? Das kann nicht rückgängig gemacht werden. Lade vorher eine Sicherung des aktuellen Stands herunter, wenn du ihn noch brauchst.`,
    replaceConfirm: "Ja, aktuellen Stand ersetzen",
    imported: "Sicherung importiert. Alle Daten wurden wiederhergestellt.",
    newerVersion:
      "Diese Sicherung stammt aus einer neueren Kandidu-Version. Lade die Seite neu, damit die aktuelle Version geladen wird, und versuche es dann erneut. Es wurde nichts geändert.",
    recoveryHint:
      "Wenn du eine Sicherung hast, kannst du sie hier importieren. Sie ersetzt den gespeicherten Stand.",
    readme:
      "Kandidu-Sicherung\r\n\r\nDiese ZIP-Datei enthält persönliche Daten: dein Profil, deine Vorlagen, deinen Lebenslauf, Nachweise und Bewerbungen. Bewahre sie sicher auf und gib sie nicht weiter.\r\n\r\nWiederherstellen: Öffne Kandidu, gehe zu „Daten“ und wähle „Sicherung importieren“. Verändere die Dateien in dieser ZIP-Datei nicht, sonst wird die Sicherung abgelehnt.\r\n",
  },

  recovery: {
    heading: "Gespeicherte Daten konnten nicht gelesen werden",
    intro:
      "Kandidu hat nichts überschrieben. Du kannst es erneut versuchen, eine Sicherung importieren oder, wenn die Daten beschädigt sind, die Kandidu-Daten in diesem Browser bewusst zurücksetzen.",
    resetPrompt:
      "Wirklich alle Kandidu-Daten in diesem Browser löschen? Andere Websites sind nicht betroffen. Das kann nicht rückgängig gemacht werden.",
    resetStart: "Kandidu-Daten zurücksetzen …",
    resetConfirm: "Ja, alle Kandidu-Daten löschen",
    resetDone: "Kandidu wurde zurückgesetzt.",
  },

  home: {
    heading: "Deine Bewerbungen",
    setupHeading: "Einrichtung",
    setupDone: "Die Einrichtung ist vollständig.",
    setupOpen:
      "Bevor du Unterlagen erzeugen kannst, richte Kandidu einmal ein:",
    setupItemProfile: "Persönliche Daten",
    setupItemTemplates: "Vorlagen (Demo-Vorlagen sind bereits aktiv)",
    setupItemCv: "Lebenslauf-PDF",
    setupItemDone: "erledigt",
    setupItemOpen: "offen",
    toSetup: "Zur Einrichtung",
    projectsHeading: "Projekte",
    noProjects: "Noch keine Projekte. Lege dein erstes Bewerbungs-Projekt an.",
    newProjectHeading: "Neues Projekt",
    newProjectLabel: "Titel des Projekts",
    newProjectHint: "Zum Beispiel „Ausbildung zum Industriekaufmann“.",
    createProject: "Projekt anlegen",
    leadCount: (n: number) => plural(n, "Lead", "Leads"),
    pendingResponse: "Antwort ausstehend",
    created: "Projekt angelegt.",
  },

  setup: {
    heading: "Einrichtung",
    stepsLabel: "Schritte der Einrichtung",
    steps: {
      profile: "Persönliche Daten",
      templates: "Vorlagen",
      cv: "Lebenslauf-PDF",
      evidence: "Nachweise",
    },
  },

  profile: {
    heading: "Persönliche Daten",
    intro:
      "Diese Angaben setzt Kandidu in deine Vorlagen ein. Sie werden nie in den Prompt für das Sprachmodell übernommen.",
    fields: {
      firstName: "Vorname",
      lastName: "Nachname",
      street: "Straße und Hausnummer",
      postalCode: "PLZ",
      city: "Ort",
      phone: "Telefon",
      email: "E-Mail",
      birthDate: "Geburtsdatum",
      birthPlace: "Geburtsort",
      nationality: "Staatsangehörigkeit",
      website: "Website oder Profil-Link",
    },
    issues: {
      required: "Bitte ausfüllen.",
      "too-long": "Dieser Eintrag ist zu lang.",
      "invalid-format": "Bitte prüfe das Format.",
    },
    issueHints: {
      postalCode: "4 bis 10 Zeichen, Ziffern und Buchstaben.",
      phone: "Nur Ziffern, Leerzeichen und + ( ) / -.",
      email: "Zum Beispiel name@example.org.",
      birthDate: "Ein gültiges Datum in der Vergangenheit.",
      website: "Beginnt mit https:// oder http://.",
    } as Readonly<Record<string, string>>,
    fixErrors: (n: number) =>
      `Bitte korrigiere ${plural(n, "Angabe", "Angaben")}.`,
  },

  templates: {
    heading: "Vorlagen",
    intro:
      "Kandidu füllt Word-Vorlagen (DOCX) mit deinen Daten. Lade dir die Demo-Vorlagen herunter, passe sie in Word oder LibreOffice an und lade sie wieder hoch.",
    kinds: { cv: "Lebenslauf", coverLetter: "Anschreiben" },
    activeDemo: "Aktiv: Demo-Vorlage",
    activeOwn: (fileName: string, date: string) =>
      `Aktiv: ${fileName} (hochgeladen am ${date})`,
    downloadDemo: "Demo-Vorlage herunterladen",
    uploadLabel: (kind: string) =>
      `Eigene Vorlage für ${kind} hochladen (.docx)`,
    checking: "Vorlage wird geprüft …",
    accepted: "Vorlage geprüft und gespeichert.",
    rejectedHeading: "Die Vorlage wurde nicht übernommen",
    rejectedIntro:
      "Bitte korrigiere diese Stellen in Word und lade die Datei erneut hoch. Die bisher aktive Vorlage bleibt aktiv.",
    usedHeading: "Verwendete Platzhalter",
    noneUsed: "Diese Vorlage enthält keine Platzhalter.",
    removeOwn: "Eigene Vorlage entfernen",
    removePrompt:
      "Eigene Vorlage entfernen und wieder die Demo-Vorlage nutzen?",
    removed: "Eigene Vorlage entfernt. Die Demo-Vorlage ist wieder aktiv.",
    helpLink: "Wie funktionieren Platzhalter?",
    demoFileName: (kind: string) => `Kandidu_Vorlage_${kind}.docx`,
    issue: {
      "unknown-placeholder": (tag: string) =>
        `Unbekannter Platzhalter {${tag}}.`,
      "wrong-template": (tag: string) =>
        `{${tag}} gibt es nur im Anschreiben, nicht im Lebenslauf.`,
      "block-misused": (tag: string) =>
        `„${tag}“ ist hier nicht erlaubt. Der Motivationsteil wird als Block geschrieben: {#Motivation}, {Absatz}, {/Motivation} – jeweils in einem eigenen Absatz.`,
      "block-item-outside": (tag: string) =>
        `{${tag}} steht außerhalb des Motivations-Blocks. Setze es zwischen {#Motivation} und {/Motivation}.`,
      "unopened-tag": (tag: string) =>
        `Bei „${tag}“ fehlt die öffnende Klammer {.`,
      "unclosed-tag": (tag: string) =>
        `Bei „${tag}“ fehlt die schließende Klammer }.`,
      "duplicate-open": (tag: string) =>
        `Bei „${tag}“ steht eine öffnende Klammer { zu viel.`,
      "duplicate-close": (tag: string) =>
        `Bei „${tag}“ steht eine schließende Klammer } zu viel.`,
      "loop-mismatch": (tag: string) =>
        `Ein Block wird mit dem falschen Namen geschlossen (${tag}). Öffnen und Schließen müssen gleich heißen, z. B. {#Motivation} … {/Motivation}.`,
      "unclosed-block": (tag: string) =>
        `Der Block „${tag}“ wird nicht geschlossen. Ergänze {/Motivation}.`,
      "unopened-block": (tag: string) =>
        `Der Block „${tag}“ wird geschlossen, aber nie geöffnet. Ergänze {#Motivation}.`,
      "syntax-other": (tag: string) =>
        `Die Vorlage enthält einen Fehler bei „${tag}“.`,
    },
    issueUnknownTag: "(unbekannte Stelle)",
    suggestion: (name: string) => `Meinten Sie {${name}}?`,
    context: (text: string) => `Fundstelle: „${text}“`,
  },

  placeholderHelp: {
    heading: "Platzhalter in Vorlagen",
    intro:
      "Ein Platzhalter ist ein Name in geschweiften Klammern, zum Beispiel {Vorname}. Beim Erzeugen ersetzt Kandidu ihn durch deinen Wert. Formatierung (fett, Schriftart, Farbe) bleibt erhalten.",
    rules: [
      "Schreibe den Namen genau wie in der Liste, mit Groß- und Kleinschreibung: {Vorname}, nicht {vorname}.",
      "Leerzeichen innerhalb der Klammern sind erlaubt: { Vorname } funktioniert auch.",
      "Word zerlegt Text intern manchmal in mehrere Stücke (etwa nach Rechtschreibkorrektur). Das macht nichts: Kandidu erkennt den Platzhalter trotzdem.",
      "Im Lebenslauf sind nur persönliche Daten erlaubt. Firmen- und Stellendaten gibt es nur im Anschreiben.",
      "Steht ein Platzhalter in der Vorlage, aber der Wert fehlt, bleibt die Stelle leer. Kandidu warnt dich vor dem Herunterladen.",
    ],
    blockHeading: "Der Motivationsteil",
    blockText:
      "Der Motivationsteil hat bis zu zwei Absätze. Schreibe in deiner Vorlage drei eigene Absätze untereinander:",
    blockExample: ["{#Motivation}", "{Absatz}", "{/Motivation}"],
    blockAfter:
      "Kandidu wiederholt den mittleren Absatz für jeden Absatz deines Motivationsteils.",
    listHeading: "Alle Platzhalter",
    columnName: "Platzhalter",
    columnMeaning: "Bedeutung",
    columnExample: "Beispiel",
    columnWhere: "Verwendbar in",
    whereBoth: "Lebenslauf und Anschreiben",
    whereCover: "nur Anschreiben",
    entries: {
      Vorname: ["Dein Vorname", "Erika"],
      Nachname: ["Dein Nachname", "Musterfrau"],
      Name: ["Vor- und Nachname", "Erika Musterfrau"],
      Strasse: ["Straße und Hausnummer", "Musterweg 1"],
      PLZ: ["Postleitzahl", "12345"],
      Ort: ["Wohnort", "Musterstadt"],
      Telefon: ["Telefonnummer", "+49 30 1234567"],
      EMail: ["E-Mail-Adresse", "erika@example.org"],
      Geburtsdatum: ["Geburtsdatum", "30.04.2001"],
      Geburtsort: ["Geburtsort", "Beispielhausen"],
      Staatsangehoerigkeit: ["Staatsangehörigkeit", "deutsch"],
      Website: ["Website oder Profil-Link", "https://example.org/erika"],
      Datum: ["Heutiges Datum", "18. Oktober 2026"],
      Stelle: ["Stellenbezeichnung", "Ausbildung zum Industriekaufmann"],
      Referenznummer: ["Kennziffer der Anzeige", "IK-2027"],
      Firma: ["Name des Unternehmens", "Beispiel GmbH"],
      FirmaStrasse: ["Straße des Unternehmens", "Hauptstraße 5"],
      FirmaPLZ: ["PLZ des Unternehmens", "54321"],
      FirmaOrt: ["Ort des Unternehmens", "Beispielstadt"],
      Ansprechpartner: ["Ansprechperson komplett", "Frau Dr. Eva Muster"],
      AnsprechpartnerAnrede: ["Anrede der Ansprechperson", "Frau"],
      AnsprechpartnerTitel: ["Titel der Ansprechperson", "Dr."],
      AnsprechpartnerVorname: ["Vorname der Ansprechperson", "Eva"],
      AnsprechpartnerNachname: ["Nachname der Ansprechperson", "Muster"],
      AnsprechpartnerFunktion: [
        "Funktion der Ansprechperson",
        "Ausbildungsleitung",
      ],
      Briefanrede: ["Anrede-Zeile des Briefs", "Sehr geehrte Frau Dr. Muster,"],
      Motivation: [
        "Block für den Motivationsteil",
        "{#Motivation} … {/Motivation}",
      ],
      Absatz: [
        "Ein Absatz des Motivationsteils (nur im Block)",
        "Ihre Ausbildung …",
      ],
    } as Readonly<Record<string, readonly [string, string]>>,
  },

  demo: {
    cv: [
      { text: "Lebenslauf", style: "Title" },
      { text: "**{Name}**", spaceAfter: 0 },
      { text: "{Strasse}, {PLZ} {Ort}", spaceAfter: 0 },
      { text: "{Telefon} · {EMail}" },
      { text: "Persönliche Daten", style: "Heading1" },
      { text: "Geboren am {Geburtsdatum} in {Geburtsort}", spaceAfter: 0 },
      { text: "Staatsangehörigkeit: {Staatsangehoerigkeit}", spaceAfter: 0 },
      { text: "Web: {Website}" },
      { text: "Schulbildung", style: "Heading1" },
      {
        text: "2017–2027  Beispiel-Realschule, Musterstadt (Beispieltext – bitte ersetzen)",
      },
      { text: "Praktika", style: "Heading1" },
      {
        text: "2025  Zweiwöchiges Praktikum im Büro der Muster AG (Beispieltext – bitte ersetzen)",
      },
      { text: "Kenntnisse", style: "Heading1" },
      {
        text: "Textverarbeitung, Tabellenkalkulation, Englisch (gut) (Beispieltext – bitte ersetzen)",
      },
      // {Datum} exists only in cover letters (CV: personal data only).
      { text: "{Ort}", align: "right" },
    ] as readonly DemoParagraph[],
    coverLetter: [
      { text: "{Name}", spaceAfter: 0, style: "Small" },
      { text: "{Strasse} · {PLZ} {Ort}", style: "Small", spaceAfter: 0 },
      { text: "{Telefon} · {EMail}", style: "Small" },
      { text: "{Firma}", spaceAfter: 0 },
      { text: "{Ansprechpartner}", spaceAfter: 0 },
      { text: "{FirmaStrasse}", spaceAfter: 0 },
      { text: "{FirmaPLZ} {FirmaOrt}" },
      { text: "{Ort}, {Datum}", align: "right" },
      { text: "**Bewerbung als {Stelle}** (Kennziffer {Referenznummer})" },
      { text: "{Briefanrede}" },
      { text: "{#Motivation}" },
      { text: "{Absatz}" },
      { text: "{/Motivation}" },
      {
        text: "Über eine Einladung zu einem persönlichen Gespräch freue ich mich sehr.",
      },
      { text: "Mit freundlichen Grüßen" },
      { text: "{Name}" },
      { text: "Anlagen: Lebenslauf, Zeugnisse", style: "Small" },
    ] as readonly DemoParagraph[],
  },

  letter: {
    female: (title: string, lastName: string) =>
      `Sehr geehrte Frau ${title ? `${title} ` : ""}${lastName},`,
    male: (title: string, lastName: string) =>
      `Sehr geehrter Herr ${title ? `${title} ` : ""}${lastName},`,
    neutral: "Sehr geehrte Damen und Herren,",
    fileWords: {
      coverLetter: "Anschreiben",
      cv: "Lebenslauf",
      application: "Bewerbung",
      coverLetterAndCv: "Anschreiben_Lebenslauf",
      certificates: "Zeugnisse",
    },
  },

  cv: {
    heading: "Lebenslauf-PDF",
    intro:
      "Kandidu verwendet für alle Bewerbungen dasselbe Lebenslauf-PDF. So geht es: ausgefüllten Lebenslauf herunterladen, in Word oder LibreOffice prüfen, als PDF speichern und hier hochladen.",
    downloadFilled: "Ausgefüllten Lebenslauf (DOCX) herunterladen",
    missingHeading: "Diese Platzhalter für Pflichtangaben bleiben leer:",
    missingHint:
      "Ergänze die Angaben unter „Persönliche Daten“ oder lade trotzdem herunter.",
    optionalHeading: "Diese optionalen Platzhalter bleiben leer:",
    optionalHint:
      "Das ist in Ordnung. Wenn du sie im Lebenslauf haben möchtest, ergänze sie unter „Persönliche Daten“.",
    toProfile: "Persönliche Daten ergänzen",
    downloadAnyway: "Trotzdem herunterladen",
    pdfHowTo:
      "PDF erstellen: In Word „Datei → Speichern unter → PDF“, in LibreOffice „Datei → Exportieren als → Als PDF exportieren“.",
    uploadLabel: "Lebenslauf-PDF hochladen",
    current: (name: string, pages: string, size: string, date: string) =>
      `Aktuell: ${name} (${pages}, ${size}, hochgeladen am ${date})`,
    none: "Noch kein Lebenslauf-PDF hochgeladen.",
    replaceWarning:
      "Das neue PDF gilt für alle künftig erzeugten Pakete, auch für bereits versendete Bewerbungen.",
    uploaded: "Lebenslauf-PDF gespeichert.",
    defaultName: "Lebenslauf",
    deleteStart: "Lebenslauf-PDF löschen …",
    deletePrompt: (released: number) =>
      `Lebenslauf-PDF wirklich löschen? ${
        released > 0
          ? `${plural(released, "freigegebener Lead bleibt", "freigegebene Leads bleiben")} freigegeben, aber `
          : ""
      }Pakete mit Lebenslauf kannst du erst wieder erstellen, wenn du ein neues Lebenslauf-PDF hochlädst.`,
    deleteConfirm: "Ja, Lebenslauf-PDF löschen",
    deleted: "Lebenslauf-PDF gelöscht.",
  },

  evidence: {
    heading: "Nachweise",
    intro:
      "Zeugnisse, Zertifikate und andere Nachweise als PDF. Du kannst sie später pro Bewerbung ins Paket aufnehmen. Mit Tags behältst du den Überblick.",
    uploadHeading: "Nachweis hochladen",
    nameLabel: "Name des Nachweises",
    nameHint: (max: number) => `Höchstens ${max} Zeichen.`,
    fileLabel: "PDF-Datei",
    upload: "Hochladen",
    picked: (fileName: string) => `Gewählte Datei: ${fileName}`,
    uploaded: "Nachweis gespeichert.",
    listHeading: "Gespeicherte Nachweise",
    none: "Noch keine Nachweise hochgeladen.",
    filterLabel: "Nach Tag filtern",
    filterAll: "Alle",
    filterEmpty: "Kein Nachweis mit diesem Tag.",
    noTags: "Keine Tags",
    tagsLine: (tags: readonly string[]) => `Tags: ${tags.join(", ")}`,
    meta: (pages: string, size: string, date: string) =>
      `${pages}, ${size}, hochgeladen am ${date}`,
    edit: "Bearbeiten",
    editHeading: (name: string) => `Nachweis bearbeiten: ${name}`,
    save: "Speichern",
    saved: "Nachweis aktualisiert.",
    cancel: "Abbrechen",
    delete: "Löschen …",
    deleteHeading: (name: string) => `Nachweis „${name}“ löschen?`,
    usedIn: "Wird verwendet in:",
    usageItem: (company: string, files: string) => `${company} – ${files}`,
    notUsed: "Wird in keinem Paket verwendet.",
    deleteWarning:
      "Der Nachweis wird auch aus diesen Paketen entfernt. Das lässt sich nicht rückgängig machen.",
    confirmDelete: "Ja, löschen",
    deleted: "Nachweis gelöscht.",
    tagInputLabel: "Tag hinzufügen",
    tagInputHint:
      "Mit Enter eigenen Tag hinzufügen oder einen Vorschlag auswählen.",
    pendingTag: "Der eingegebene Text wird beim Speichern als Tag übernommen.",
    chosenTagsLabel: "Gewählte Tags",
    removeTag: (tag: string) => `Tag entfernen: ${tag}`,
    addTag: (tag: string) => `Tag hinzufügen: ${tag}`,
    suggestionsLabel: "Vorschläge",
    suggestionCount: (n: number) => plural(n, "Vorschlag", "Vorschläge"),
  },

  project: {
    stepsLabel: "Schritte des Projekts",
    steps: {
      links: "Links",
      prompt: "Prompt",
      response: "Antwort",
      leads: "Leads",
    },
    titleLabel: "Titel des Projekts",
    rename: "Titel speichern",
    linksHeading: "Links zu Stellenausschreibungen",
    linksIntro:
      "Füge einen oder mehrere Links zu Stellenanzeigen ein. Nur diese Links, der Titel und dein optionaler Kontext gehen in den Prompt.",
    linkLabel: "Link zur Stellenanzeige",
    linkListLabel: (n: number) => `Link ${n}`,
    addLink: "Link hinzufügen",
    removeLink: (url: string) => `Link entfernen: ${url}`,
    remove: "Entfernen",
    edit: "Bearbeiten",
    editLink: (url: string) => `Link bearbeiten: ${url}`,
    editLinkLabel: (n: number) => `Link ${n} bearbeiten`,
    linkUpdated: "Link geändert.",
    linkRemoved: "Link entfernt.",
    noLinks: "Noch keine Links.",
    toPrompt: "Weiter zum Prompt",
    contextHeading: "Zusätzlicher Kontext (optional)",
    contextIntro:
      "Standardmäßig leer. Wenn du möchtest, beschreibe hier kurz, was das Sprachmodell über dich wissen soll, zum Beispiel deine Qualifikationen oder Interessen. Kandidu übernimmt nie automatisch deine persönlichen Daten.",
    contextNotice:
      "Dieser Text wird mit dem Prompt an das externe Sprachmodell übermittelt. Schreibe nichts hinein, was du dort nicht teilen möchtest.",
    contextLabel: "Kontext für den Prompt",
    contextCount: (used: number, max: number) =>
      `${numberFormat.format(used)} von ${numberFormat.format(max)} Zeichen`,
    contextSave: "Kontext speichern",
  },

  prompt: {
    heading: "Prompt für das Sprachmodell",
    intro:
      "Kopiere diesen Text vollständig in ein Sprachmodell deiner Wahl (mit Internetzugang). Er enthält keine persönlichen Daten – nur den Projekttitel, die Links und, falls du ihn ausgefüllt hast, deinen zusätzlichen Kontext.",
    label: "Vollständiger Prompt",
    copy: "Prompt kopieren",
    copyFailed:
      "Kopieren ist in diesem Browser nicht erlaubt. Markiere den Text mit Strg+A und kopiere ihn mit Strg+C, dann bestätige unten.",
    copiedManually: "Ich habe den Prompt kopiert",
    noLinks: "Füge zuerst mindestens einen Link hinzu.",
    changedSinceCopy:
      "Prompt geändert: Du hast Titel, Links oder Kontext seit dem letzten Kopieren geändert. Bitte kopiere den Prompt erneut.",
    contextIncluded:
      "Der Prompt enthält deinen zusätzlichen Kontext. Dieser Text wird an das externe Sprachmodell übermittelt.",
    toResponse: "Weiter zur Antwort",
    afterCopy:
      "Du kannst Kandidu jetzt schließen. Dein Stand bleibt gespeichert, bis du die Antwort einfügst.",
    build: (input: {
      title: string;
      links: readonly string[];
      context: string;
      schemaJson: string;
    }) =>
      [
        "Du hilfst mir bei einer Bewerbung. Recherchiere bitte jede der folgenden Stellenanzeigen und das jeweilige Unternehmen.",
        "",
        `Projekt: ${input.title}`,
        "",
        "Stellenanzeigen:",
        ...input.links.map((link, i) => `${i + 1}. ${link}`),
        ...(input.context.trim()
          ? [
              "",
              "Zusätzlicher Kontext der bewerbenden Person:",
              input.context.trim(),
            ]
          : []),
        "",
        "Regeln für deine Antwort:",
        "- Antworte ausschließlich mit einem einzigen JSON-Objekt, das dem Schema unten entspricht. Kein Text davor oder danach.",
        '- Lege in "leads" für jede Stellenanzeige genau einen Eintrag an.',
        "- Schreibe auf Deutsch.",
        '- "position": Stellenbezeichnung und, falls angegeben, Kennziffer, Ort, Beginn und Art der Anstellung.',
        '- "company" und "contact": Name und Anschrift des Unternehmens und die Ansprechperson laut Anzeige. Erfinde keine Ansprechperson; lass Felder weg, die du nicht sicher weißt.',
        '- "application": der Bewerbungsweg ("portal", "email", "post" oder "other") mit Portal-Link, E-Mail-Adresse oder Postanschrift, Frist und Hinweisen.',
        '- "process": Infos zum Bewerbungsprozess (Markdown).',
        '- "research": Unternehmensrecherche passend zur Stelle als Markdown, mit Quellenlinks im Format [Titel](https://…).',
        '- "motivation": ein Vorschlag für den Motivationsteil eines Anschreibens, höchstens zwei Absätze, getrennt durch eine Leerzeile, zugeschnitten auf das Unternehmen. Erfinde nichts über mich.',
        "",
        "JSON-Schema:",
        input.schemaJson,
      ].join("\n"),
  },

  response: {
    heading: "Antwort einfügen",
    intro:
      "Füge die komplette Antwort des Sprachmodells ein. Text vor oder nach dem JSON und Code-Blöcke (```) sind kein Problem.",
    label: "Antwort des Sprachmodells",
    draftSaved: "Entwurf gespeichert.",
    submit: "Antwort einlesen",
    reading: "Antwort wird gelesen …",
    created: (n: number) => `${plural(n, "Lead", "Leads")} angelegt.`,
    toLeads: "Zu den Leads",
    errorHeading: "Die Antwort konnte nicht übernommen werden",
    keptHint:
      "Dein eingefügter Text ist gespeichert und bleibt im Feld. Du kannst ihn korrigieren oder das Sprachmodell um eine neue Antwort bitten.",
    errors: {
      "no-json-found":
        "In der Antwort steht kein JSON. Bitte das Sprachmodell, ausschließlich mit dem JSON-Objekt zu antworten.",
      "json-invalid":
        "Das JSON ist unvollständig oder fehlerhaft. Oft fehlt das Ende der Antwort – kopiere sie vollständig.",
      "response-too-large":
        "Die Antwort ist zu lang (höchstens 500 000 Zeichen).",
      "schema-invalid": "Die Antwort passt nicht zum erwarteten Aufbau:",
    },
    jsonPosition: (position: number) =>
      `Fehler ungefähr bei Zeichen ${position}.`,
    issue: (
      entry: number,
      field: string,
      kind: "missing" | "wrong-type" | "invalid",
    ) =>
      `${entry > 0 ? `Eintrag ${entry}: ` : ""}${field} ${
        kind === "missing"
          ? "fehlt."
          : kind === "wrong-type"
            ? "hat den falschen Typ."
            : "ist ungültig."
      }`,
    warning: {
      "motivation-too-long": (entry: number) =>
        `Eintrag ${entry}: Der Motivationsteil hat mehr als zwei Absätze. Bitte kürze ihn im Lead.`,
      "url-dropped": (entry: number) =>
        `Eintrag ${entry}: Ein Link ohne http(s) wurde weggelassen.`,
      "channel-unknown": (entry: number) =>
        `Eintrag ${entry}: Unbekannter Bewerbungsweg – als „Sonstiges“ übernommen.`,
    },
    fields: {
      leads: "Die Liste „leads“",
      sourceUrl: "Link zur Anzeige",
      position: "Stelle",
      "position.title": "Stellenbezeichnung",
      company: "Unternehmen",
      "company.name": "Firmenname",
      "company.website": "Website des Unternehmens",
      "company.address": "Firmenanschrift",
      contact: "Ansprechperson",
      application: "Bewerbungsweg",
      "application.channel": "Art des Bewerbungswegs",
      "application.notes": "Hinweise zum Bewerbungsweg",
      process: "Bewerbungsprozess",
      research: "Recherche",
      motivation: "Motivationsteil",
    } as Readonly<Record<string, string>>,
    fieldFallback: (path: string) => `Feld „${path}“`,
    historyHeading: "Bisherige Antworten",
    historyItem: (date: string, ok: boolean) =>
      `${date} – ${ok ? "übernommen" : "nicht übernommen"}`,
    showText: "Text anzeigen",
    duplicatePrompt: (date: string, leads: number) =>
      `Diese Antwort hast du am ${date} schon eingelesen (${plural(leads, "Lead", "Leads")}). Noch einmal einlesen legt die Leads doppelt an.`,
    duplicateConfirm: "Trotzdem erneut einlesen",
    importValid: (valid: number, total: number) =>
      `Nur gültige Einträge übernehmen (${valid} von ${total})`,
  },

  leads: {
    heading: "Leads",
    empty: "Noch keine Leads. Füge die Antwort des Sprachmodells ein.",
    columnCompany: "Unternehmen",
    columnPosition: "Stelle",
    columnStatus: "Status",
    open: (company: string) => `Lead öffnen: ${company}`,
    status: {
      review: "Review (Entwurf)",
      ready: "Bereit zum Versenden",
      sent: "Versendet",
      interview: "Einladung zum Gespräch",
      accepted: "Zusage",
      rejected: "Absage",
      withdrawn: "Zurückgezogen",
      failed: "Fehlgeschlagen",
    },
  },

  lead: {
    stepsLabel: "Schritte des Leads",
    steps: {
      review: "Prüfen",
      coverLetter: "Anschreiben",
      gate: "Freigabe",
      package: "Paket",
    },
    headingFallback: "Lead",
    eyebrow: (project: string, company: string) => `${project} · ${company}`,
    statusLine: (status: string) => `Status: ${status}`,
    lockedNotice:
      "Dieser Lead ist freigegeben. Zum Ändern gehe in der Freigabe „Zurück in den Review“.",
  },

  review: {
    heading: "Lead prüfen und bearbeiten",
    positionHeading: "Stelle",
    positionTitle: "Stellenbezeichnung",
    referenceNumber: "Kennziffer",
    location: "Arbeitsort",
    startDate: "Beginn",
    employmentType: "Art der Anstellung",
    sourceUrl: "Link zur Anzeige",
    companyHeading: "Unternehmen",
    companyName: "Firmenname",
    website: "Website",
    street: "Straße und Hausnummer",
    postalCode: "PLZ",
    city: "Ort",
    country: "Land",
    contactHeading: "Ansprechperson",
    salutation: "Anrede",
    salutationNone: "keine Angabe",
    salutationFemale: "Frau",
    salutationMale: "Herr",
    title: "Titel",
    firstName: "Vorname",
    lastName: "Nachname",
    role: "Funktion",
    email: "E-Mail",
    phone: "Telefon",
    applicationHeading: "Bewerbungsweg",
    channel: "Art",
    channels: {
      portal: "Online-Portal",
      email: "E-Mail",
      post: "Post",
      other: "Sonstiges",
    },
    portalUrl: "Portal-Link",
    applicationEmail: "E-Mail-Adresse für die Bewerbung",
    postalHeading: "Postanschrift für die Bewerbung (falls abweichend)",
    deadline: "Frist",
    notes: "Hinweise",
    processHeading: "Bewerbungsprozess",
    researchHeading: "Recherche",
    markdownHint: "Markdown: **fett**, - Liste, [Linktext](https://…)",
    showPreview: "Vorschau anzeigen",
    showEditor: "Bearbeiten",
    previewLabel: (section: string) => `Vorschau: ${section}`,
    motivationHeading: "Motivationsteil",
    motivationHint:
      "Reiner Text, höchstens zwei Absätze. Trenne Absätze durch eine Leerzeile.",
    paragraphCount: (n: number) => plural(n, "Absatz", "Absätze"),
    tooManyParagraphs:
      "Mehr als zwei Absätze: Bitte kürze den Motivationsteil.",
    salutationHeading: "Briefanrede",
    salutationSuggestion: (text: string) => `Vorschlag: ${text}`,
    salutationOverride: "Eigene Briefanrede (leer lassen für den Vorschlag)",
    saveLead: "Lead speichern",
    invalid:
      "Bitte fülle Stellenbezeichnung und Firmenname aus und prüfe die Längen.",
  },

  coverLetter: {
    heading: "Anschreiben erzeugen",
    intro:
      "Kandidu füllt deine aktive Anschreiben-Vorlage mit den Daten dieses Leads.",
    download: "Anschreiben (DOCX) herunterladen",
    missingHeading: "Diese Platzhalter bleiben leer:",
    missingHint:
      "Ergänze die Angaben im Lead oder in deinen persönlichen Daten – oder lade trotzdem herunter.",
    toReview: "Lead bearbeiten",
    toProfile: "Persönliche Daten",
    downloadAnyway: "Trotzdem herunterladen",
    pdfHowTo:
      "Öffne die Datei in Word oder LibreOffice, prüfe sie und speichere sie als PDF. Kandidu wandelt DOCX nicht selbst in PDF um.",
    downloaded: "Anschreiben heruntergeladen.",
    toGate: "Weiter zur Freigabe",
  },

  gate: {
    heading: "Freigabe",
    intro:
      "Lade das geprüfte Anschreiben als PDF hoch und gib den Lead bewusst frei. Danach ist er nicht mehr im Review.",
    coverUpload: "Anschreiben-PDF hochladen",
    coverCurrent: (name: string, pages: string, size: string) =>
      `Anschreiben-PDF: ${name} (${pages}, ${size})`,
    coverMissing: "Noch kein Anschreiben-PDF hochgeladen.",
    coverSaved: "Anschreiben-PDF gespeichert.",
    cvPresent: (name: string, pages: string) =>
      `Lebenslauf-PDF: ${name} (${pages})`,
    cvMissing: "Es fehlt noch das Lebenslauf-PDF.",
    toCv: "Lebenslauf-PDF hochladen",
    confirmLabel:
      "Ich habe Anschreiben und Lebenslauf geprüft und gebe diesen Lead frei.",
    release: "Lead freigeben",
    released: "Lead freigegeben – Status „Bereit zum Versenden“.",
    incomplete: "Für die Freigabe fehlt noch:",
    missingCover: "das Anschreiben-PDF",
    missingCv: "das Lebenslauf-PDF",
    missingConfirmation: "deine Bestätigung (Häkchen oben)",
    defaultFileName: "Anschreiben.pdf",
    releasedNotice: "Dieser Lead ist freigegeben.",
    backToReview: "Zurück in den Review …",
    backPrompt:
      "Zurück in den Review? Das hochgeladene Anschreiben-PDF wird dabei entfernt, damit du ein korrigiertes hochlädst.",
    backConfirm: "Ja, zurück in den Review",
    backDone: "Der Lead ist wieder im Review.",
    toPackage: "Weiter zum Paket",
  },

  package: {
    heading: "Paket zusammenstellen",
    intro:
      "Kandidu fügt die gewählten PDFs in der angegebenen Reihenfolge zu einem PDF zusammen und packt es in eine ZIP-Datei. Alles passiert in deinem Browser.",
    notReleased: "Erst nach der Freigabe kannst du ein Paket zusammenstellen.",
    toGate: "Zur Freigabe",
    fileNameLabel: "Dateiname des PDFs",
    itemsLabel: "Inhalt in dieser Reihenfolge",
    items: {
      coverLetter: "Anschreiben-PDF",
      cv: "Lebenslauf-PDF",
      document: (name: string) => `Dokument: ${name}`,
    },
    moveUp: (item: string) => `${item} nach oben`,
    moveDown: (item: string) => `${item} nach unten`,
    removeItem: (item: string) => `${item} aus dem Paket entfernen`,
    lastItemHint: "Ein Paket braucht mindestens ein PDF.",
    addHeading: "PDF hinzufügen",
    tagFilter: "Nachweise nach Tag filtern",
    tagFilterAll: "Alle Tags",
    addLabel: "PDF auswählen",
    addButton: "Hinzufügen",
    nothingToAdd: "Alle vorhandenen PDFs sind schon in diesem Paket.",
    noEvidence: "Noch keine Nachweise hochgeladen.",
    toEvidence: "Nachweise verwalten",
    documentMissing: (name: string) =>
      `„${name}“ gibt es nicht mehr. Entferne es aus dem Paket.`,
    added: (item: string) => `${item} hinzugefügt.`,
    packageHeading: (n: number) => `Paket-PDF ${n}`,
    removePackage: (n: number) => `Paket-PDF ${n} entfernen`,
    packageAdded: (n: number) => `Paket-PDF ${n} hinzugefügt.`,
    packageRemoved: (n: number) => `Paket-PDF ${n} entfernt.`,
    addPackageHeading: "Weiteres Paket-PDF",
    addPackageHint:
      "Jedes Paket-PDF landet als eigene Datei in derselben ZIP-Datei, zum Beispiel „Anschreiben und Lebenslauf“ und „Zeugnisse“ getrennt.",
    presetLabel: "Vorlage für das neue Paket-PDF",
    presets: {
      coverLetterAndCv: "Anschreiben und Lebenslauf",
      evidence: "Alle Nachweise (Zeugnisse)",
      all: "Alles in einem PDF",
    },
    addPackage: "Paket-PDF hinzufügen",
    builtMany: (n: number, pages: string) =>
      `ZIP mit ${n} PDFs erstellt (zusammen ${pages}).`,
    saveDefinition: "Zusammenstellung speichern",
    download: "ZIP herunterladen",
    building: "Paket wird erstellt …",
    built: (name: string, pages: string) => `${name} erstellt (${pages}).`,
    cvMissing: "Das Lebenslauf-PDF fehlt. Lade es zuerst hoch.",
    toCv: "Lebenslauf-PDF hochladen",
  },

  markdown: {
    empty: "Noch kein Text.",
  },

  errors: {
    "read-failed": "Die gespeicherten Daten konnten nicht gelesen werden.",
    "data-invalid":
      "Die gespeicherten Daten sind beschädigt oder unvollständig.",
    "save-failed":
      "Nicht gespeichert: Speichern ist fehlgeschlagen. Deine Eingaben sind noch da, bitte versuche es erneut.",
    "quota-exceeded":
      "Nicht gespeichert: Der Speicher dieses Browsers ist voll. Deine Eingaben sind noch da. Lösche nicht mehr benötigte Dateien oder lege eine Sicherung an, dann versuche es erneut.",
    conflict:
      "Kandidu wurde in einem anderen Tab geändert. Bitte lade die Seite neu und wiederhole die Änderung.",
    "file-missing": "Eine benötigte Datei fehlt im Speicher.",
    "delete-failed": "Löschen ist fehlgeschlagen. Bitte versuche es erneut.",
    "unsupported-version":
      "Die gespeicherten Daten stammen aus einer neueren Kandidu-Version.",
    "store-blocked":
      "Speichern ist gesperrt, solange die gespeicherten Daten nicht gelesen werden konnten.",
    "record-invalid": "Die Daten sind ungültig und wurden nicht gespeichert.",
    "backup-invalid":
      "Die Sicherung ist unvollständig, beschädigt oder keine Kandidu-Sicherung. Es wurde nichts geändert.",
    "file-too-large":
      "Die Datei ist zu groß. Erlaubt sind höchstens 20 MB je PDF und 10 MB je Word-Vorlage.",
    "docx-invalid":
      "Das ist keine gültige Word-Datei (.docx). Speichere sie in Word als „Word-Dokument (.docx)“.",
    "pdf-invalid": "Das ist keine gültige PDF-Datei.",
    "pdf-encrypted":
      "Diese PDF ist mit einem Passwort zum Öffnen geschützt. Bitte lade eine Version ohne Öffnen-Passwort hoch.",
    "render-failed":
      "Die Vorlage konnte nicht ausgefüllt werden. Prüfe sie unter „Vorlagen“.",
    "zip-failed": "Die ZIP-Datei konnte nicht erstellt werden.",
    "profile-invalid": "Bitte prüfe deine persönlichen Daten.",
    "title-invalid": "Bitte gib einen Titel mit höchstens 120 Zeichen ein.",
    "link-invalid":
      "Bitte gib einen vollständigen Link ein, der mit https:// oder http:// beginnt.",
    "tag-invalid": "Ein Tag darf höchstens 40 Zeichen haben.",
    "link-duplicate": "Diesen Link gibt es in diesem Projekt schon.",
    "too-many-links": "Ein Projekt kann höchstens 20 Links haben.",
    "no-links": "Füge zuerst mindestens einen Link hinzu.",
    "context-too-long": "Der Zusatztext darf höchstens 2 000 Zeichen haben.",
    "draft-too-large": "Die Antwort ist zu lang (höchstens 500 000 Zeichen).",
    "link-not-found": "Dieser Link existiert nicht mehr.",
    "not-in-review":
      "Dieser Lead ist freigegeben und kann nicht mehr bearbeitet werden.",
    "gate-incomplete": "Für die Freigabe fehlt noch etwas.",
    "transition-not-allowed": "Dieser Statuswechsel ist nicht möglich.",
    "nothing-to-undo": "Es gibt nichts rückgängig zu machen.",
    "lead-invalid": "Bitte prüfe die Angaben des Leads.",
    "already-imported": "Aus dieser Antwort wurden bereits Leads angelegt.",
    unexpected: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  },

  fileLimits: {
    pdf: "PDF, höchstens 20 MB.",
    docx: "Word-Datei (.docx), höchstens 10 MB.",
    tooLarge: (limit: string) => `Die Datei ist größer als ${limit}.`,
  },
};

export type Messages = typeof de;
