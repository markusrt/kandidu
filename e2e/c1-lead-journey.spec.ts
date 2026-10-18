import { splitRuns } from "../src/files/testing/docxFixture";
import {
  captureDownload,
  docxFile,
  docxText,
  expect,
  PROFILE,
  pdfFile,
  pdfPageCount,
  pdfPageWidths,
  readFixture,
  test,
  textFile,
  zipEntries,
} from "./fixtures";
import {
  copyPrompt,
  createProjectWithLeads,
  fillProfile,
  gotoLeadStep,
  openHome,
  openLead,
  profileLabel,
  uploadCvPdf,
} from "./flows";

// C1 lead journey (User Story 1, quickstart "Manual C1 walkthrough").

const GATE_CONFIRM =
  "Ich habe Anschreiben und Lebenslauf geprüft und gebe diesen Lead frei.";

function coverTemplate(firstNameTag: string) {
  return docxFile(
    "Mein_Anschreiben.docx",
    [
      splitRuns("{Briefanrede}", 4, 5),
      ["{#Motivation}"],
      ["{Absatz}"],
      ["{/Motivation}"],
      splitRuns("{Firma}", 3, 3),
      splitRuns(firstNameTag, 4, 4),
    ],
    { proofErr: true },
  );
}

test("C1 journey: profile → templates → CV → project → prompt → answer → review → cover letter → gate → ZIP", async ({
  page,
}) => {
  // Profile: save, reload, values persist.
  await fillProfile(page, PROFILE);
  await page.reload();
  for (const [label, value] of Object.entries(PROFILE)) {
    await expect(page.getByLabel(profileLabel(label))).toHaveValue(value);
  }

  // Templates: demo downloads, broken upload rejected, corrected one accepted.
  await page.goto("/#/einrichtung/vorlagen");
  for (const kind of ["Lebenslauf", "Anschreiben"]) {
    const card = page.getByRole("region", { name: kind, exact: true });
    const demo = await captureDownload(page, () =>
      card.getByRole("button", { name: "Demo-Vorlage herunterladen" }).click(),
    );
    expect(demo.name).toBe(`Kandidu_Vorlage_${kind}.docx`);
    expect(docxText(demo.bytes).join("\n")).toContain("{Name}");
  }
  const cover = page.getByRole("region", { name: "Anschreiben", exact: true });
  const coverInput = cover.getByLabel(
    "Eigene Vorlage für Anschreiben hochladen (.docx)",
  );
  await coverInput.setInputFiles(coverTemplate("{Vornahme}"));
  await expect(page.getByRole("alert")).toContainText("Meinten Sie {Vorname}?");
  await expect(cover).toContainText("Aktiv: Demo-Vorlage");
  await coverInput.setInputFiles(coverTemplate("{Vorname}"));
  await expect(page.getByRole("status")).toContainText(
    "Vorlage geprüft und gespeichert.",
  );
  await expect(
    cover.getByRole("list").getByText("{Vorname}", { exact: true }),
  ).toBeVisible();

  // CV: filled DOCX download, then a 2-page PDF.
  await page.goto("/#/einrichtung/lebenslauf");
  const cvDocx = await captureDownload(page, () =>
    page
      .getByRole("button", {
        name: /Ausgefüllten Lebenslauf \(DOCX\) herunterladen|Trotzdem herunterladen/,
      })
      .click(),
  );
  expect(docxText(cvDocx.bytes).join("\n")).toContain("Erika Musterfrau");
  await uploadCvPdf(
    page,
    await pdfFile("Lebenslauf.pdf", 2, { label: "CV", width: 600 }),
  );

  // Project and prompt: no personal data in the prompt.
  await openHome(page);
  await page
    .getByLabel("Titel des Projekts")
    .fill("Ausbildung zum Industriekaufmann");
  await page.getByRole("button", { name: "Projekt anlegen" }).click();
  await page
    .getByLabel("Link zur Stellenanzeige")
    .fill("https://example.org/stellen/123");
  await page.getByRole("button", { name: "Link hinzufügen" }).click();
  await page.getByRole("link", { name: "Weiter zum Prompt" }).click();
  const prompt = page.getByLabel("Vollständiger Prompt");
  await expect(prompt).toHaveValue(/https:\/\/example\.org\/stellen\/123/);
  for (const secret of ["Musterfrau", "Musterweg", "erika@example.org"]) {
    await expect(prompt).not.toHaveValue(new RegExp(secret));
  }
  await copyPrompt(page);
  await page.getByRole("link", { name: "Weiter zur Antwort" }).click();

  // Answer: truncated, missing company, then a valid fenced answer.
  const answer = page.getByLabel("Antwort des Sprachmodells");
  const submit = page.getByRole("button", { name: "Antwort einlesen" });
  const truncated = await readFixture("invalid-truncated");
  await answer.fill(truncated);
  await submit.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(answer).toHaveValue(truncated);
  await answer.fill(await readFixture("invalid-missing-company"));
  await submit.click();
  await expect(page.getByRole("alert")).toContainText(
    "Eintrag 1: Firmenname fehlt.",
  );
  const valid = await readFixture("valid-fenced");
  await answer.fill(valid);
  await submit.click();
  await expect(page.getByRole("status")).toContainText("1 Lead angelegt.");

  // The same answer again asks first instead of duplicating leads (FR-021).
  await answer.fill(valid);
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("schon eingelesen");
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(answer).toHaveValue(valid);
  await page.getByRole("link", { name: "Zu den Leads" }).click();
  await expect(page.getByRole("link", { name: "Beispiel GmbH" })).toHaveCount(
    1,
  );

  // Review: edit the motivation, persist across reload.
  await openLead(page, "Beispiel GmbH");
  const newMotivation = "Erster neuer Absatz.\n\nZweiter neuer Absatz.";
  await page.getByLabel("Motivationsteil", { exact: true }).fill(newMotivation);
  await page.getByRole("button", { name: "Lead speichern" }).click();
  await expect(page.getByRole("status")).toContainText("Gespeichert.");
  await page.reload();
  await expect(page.getByLabel("Motivationsteil", { exact: true })).toHaveValue(
    newMotivation,
  );

  // Cover letter DOCX.
  await gotoLeadStep(page, "Anschreiben");
  const letter = await captureDownload(page, () =>
    page
      .getByRole("button", {
        name: /Anschreiben \(DOCX\) herunterladen|Trotzdem herunterladen/,
      })
      .click(),
  );
  expect(letter.name).toMatch(
    /^\d{4}-\d{2}-\d{2}_Beispiel_GmbH_Anschreiben\.docx$/,
  );
  const paragraphs = docxText(letter.bytes);
  const joined = paragraphs.join("\n");
  expect(paragraphs).toContain("Sehr geehrte Frau Dr. Muster,");
  expect(joined).toContain("Beispiel GmbH");
  expect(joined).toContain("Erika");
  expect(paragraphs).toContain("Erster neuer Absatz.");
  expect(paragraphs).toContain("Zweiter neuer Absatz.");

  // Gate: invalid PDF, missing confirmation, then release.
  await gotoLeadStep(page, "Freigabe");
  const coverUpload = page.getByLabel("Anschreiben-PDF hochladen");
  await coverUpload.setInputFiles(textFile("kaputt.pdf", "kein pdf"));
  await expect(page.getByRole("alert")).toContainText(
    "Das ist keine gültige PDF-Datei.",
  );
  await coverUpload.setInputFiles(
    await pdfFile("Anschreiben.pdf", 1, { width: 500 }),
  );
  await expect(page.getByRole("status")).toContainText(
    "Anschreiben-PDF gespeichert.",
  );
  await page.getByRole("button", { name: "Lead freigeben" }).click();
  await expect(page.getByText("Status: Review (Entwurf)")).toBeVisible();
  await page.getByLabel(GATE_CONFIRM).check();
  await page.getByRole("button", { name: "Lead freigeben" }).click();
  await expect(page.getByText("Status: Bereit zum Versenden")).toBeVisible();

  // Package: one PDF of 1 + 2 pages.
  await gotoLeadStep(page, "Paket");
  const zip = await captureDownload(page, () =>
    page.getByRole("button", { name: "ZIP herunterladen" }).click(),
  );
  const entries = [...zipEntries(zip.bytes)];
  expect(entries).toHaveLength(1);
  const [name, merged] = entries[0] ?? ["", new Uint8Array()];
  expect(name).toMatch(/\.pdf$/);
  expect(await pdfPageCount(merged)).toBe(3);
  // Default order: cover letter (500 pt wide) before CV (600 pt).
  expect(await pdfPageWidths(merged)).toEqual([500, 600, 600]);

  // Reordered in the UI: CV first (AS 12 "in der gewählten Reihenfolge").
  await page.getByRole("button", { name: "Lebenslauf-PDF nach oben" }).click();
  const reordered = await captureDownload(page, () =>
    page.getByRole("button", { name: "ZIP herunterladen" }).click(),
  );
  const [, second] = [...zipEntries(reordered.bytes)][0] ?? [
    "",
    new Uint8Array(),
  ];
  expect(await pdfPageWidths(second)).toEqual([600, 600, 500]);

  // The order is stored with the lead (FR-033).
  await page.reload();
  await expect(page.locator(".package-items li").first()).toContainText(
    "Lebenslauf-PDF",
  );
});

test("C1 gate: missing CV PDF blocks release and links to the CV step", async ({
  page,
}) => {
  await createProjectWithLeads(page, "valid-plain");
  await openLead(page, "Beispiel GmbH");
  await gotoLeadStep(page, "Freigabe");
  await page
    .getByLabel("Anschreiben-PDF hochladen")
    .setInputFiles(await pdfFile("Anschreiben.pdf", 1));
  await expect(page.getByRole("status")).toContainText(
    "Anschreiben-PDF gespeichert.",
  );
  await page.getByLabel(GATE_CONFIRM).check();
  await page.getByRole("button", { name: "Lead freigeben" }).click();
  await expect(page.getByText("Status: Review (Entwurf)")).toBeVisible();
  await expect(
    page.getByText("Es fehlt noch das Lebenslauf-PDF."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Lebenslauf-PDF hochladen" }),
  ).toBeVisible();
});

test("C1 keyboard: profile save and prompt copy without a mouse", async ({
  page,
}) => {
  await page.goto("/#/einrichtung/profil");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Persönliche Daten",
  );
  await page.getByLabel(profileLabel("Vorname")).focus();
  // DOM order: first name, last name, street, postal code, city, phone, email.
  const values = [
    PROFILE.Vorname,
    PROFILE.Nachname,
    PROFILE["Straße und Hausnummer"],
    PROFILE.PLZ,
    PROFILE.Ort,
    PROFILE.Telefon,
    PROFILE["E-Mail"],
  ];
  for (const [i, value] of values.entries()) {
    await page.keyboard.type(value);
    if (i < values.length - 1) await page.keyboard.press("Tab");
  }
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Gespeichert.");

  // The project is set up with the mouse; the prompt step is used by keyboard.
  await createProjectWithLeads(page, "valid-plain");
  const base = page.url().replace(/\/leads(\/.*)?$/, "");
  await page.goto(`${base}/prompt`);
  const copy = page.getByRole("button", { name: "Prompt kopieren" });
  await expect(copy).toBeVisible();
  await page.getByLabel("Vollständiger Prompt").focus();
  await page.keyboard.press("Tab");
  await expect(copy).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    "In die Zwischenablage kopiert.",
  );
});
