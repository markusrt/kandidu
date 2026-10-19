import type { Locator, Page } from "@playwright/test";
import {
  captureDownload,
  expect,
  pdfFile,
  pdfPageCount,
  test,
  zipEntries,
} from "./fixtures";
import { gotoLeadStep, setupReleasedLead, uploadCvPdf } from "./flows";

// C2 evidence documents (User Story 2): upload, tags, filter, edit, package
// use, deletion with usage, and CV PDF deletion.

const EVIDENCE_URL = "/#/einrichtung/nachweise";

/** Uploads one evidence PDF; tags are typed (Enter) or picked from suggestions. */
async function uploadEvidence(
  page: Page,
  options: {
    fileName: string;
    name: string;
    pages: number;
    suggest?: { prefix: string; tag: string };
    own?: string;
  },
): Promise<void> {
  await page
    .getByLabel("PDF-Datei", { exact: true })
    .setInputFiles(await pdfFile(options.fileName, options.pages));
  const name = page.getByLabel("Name des Nachweises");
  await expect(name).toHaveValue(options.fileName.replace(/\.pdf$/, ""));
  await name.fill(options.name);
  const tagInput = page.getByRole("textbox", {
    name: "Tag hinzufügen",
    exact: true,
  });
  if (options.suggest) {
    await tagInput.fill(options.suggest.prefix);
    await page
      .getByRole("button", {
        name: `Tag hinzufügen: ${options.suggest.tag}`,
        exact: true,
      })
      .click();
  }
  if (options.own) {
    await tagInput.fill(options.own);
    await tagInput.press("Enter");
    await expect(
      page.getByRole("button", {
        name: `Tag entfernen: ${options.own.toLowerCase()}`,
        exact: true,
      }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Hochladen", exact: true }).click();
  await expectSaved(page, options.name);
}

/**
 * Waits until this upload is listed and the form was reset. The status text
 * alone is not enough: it is the same for every upload.
 */
async function expectSaved(page: Page, name: string): Promise<void> {
  await expect(
    page.locator(".document-list").getByRole("heading", { name, exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Name des Nachweises")).toHaveValue("");
}

const item = (page: Page, name: string): Locator =>
  page
    .locator(".document-list > li")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });

test("C2 evidence: upload, tags, suggestions, filter, edit and reload", async ({
  page,
}) => {
  await page.goto(EVIDENCE_URL);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nachweise");
  await expect(
    page.getByText("Noch keine Nachweise hochgeladen."),
  ).toBeVisible();

  // A predefined tag (suggestion after a prefix) plus an own tag (Enter).
  await uploadEvidence(page, {
    fileName: "abitur.pdf",
    name: "Abitur Zeugnis",
    pages: 2,
    suggest: { prefix: "zeug", tag: "zeugnis" },
    own: "Praktikum",
  });

  // The own tag is now offered for the next document (tags in use).
  await page
    .getByLabel("PDF-Datei", { exact: true })
    .setInputFiles(await pdfFile("bescheinigung.pdf", 1));
  await page
    .getByRole("textbox", { name: "Tag hinzufügen", exact: true })
    .fill("prak");
  const ownSuggestion = page.getByRole("button", {
    name: "Tag hinzufügen: praktikum",
    exact: true,
  });
  await expect(ownSuggestion).toBeVisible();
  await ownSuggestion.click();
  await page.getByLabel("Name des Nachweises").fill("Praktikumsbescheinigung");
  await page.getByRole("button", { name: "Hochladen", exact: true }).click();
  await expectSaved(page, "Praktikumsbescheinigung");

  await uploadEvidence(page, {
    fileName: "excel.pdf",
    name: "Zertifikat Excel",
    pages: 3,
    suggest: { prefix: "zertif", tag: "zertifikat" },
  });

  // The list shows name, tags, pages and size.
  const abitur = item(page, "Abitur Zeugnis");
  await expect(abitur).toContainText("Tags: zeugnis, praktikum");
  await expect(abitur).toContainText("2 Seiten");
  await expect(abitur).toContainText(/\d+(,\d)? (B|KB)/);
  await expect(item(page, "Praktikumsbescheinigung")).toContainText(
    "Tags: praktikum",
  );
  await expect(item(page, "Praktikumsbescheinigung")).toContainText("1 Seite,");
  await expect(item(page, "Zertifikat Excel")).toContainText("3 Seiten");
  await expect(page.locator(".document-list > li")).toHaveCount(3);

  // Filter by tag.
  const filter = page.getByLabel("Nach Tag filtern");
  await filter.selectOption("praktikum");
  await expect(page.locator(".document-list > li")).toHaveCount(2);
  await expect(item(page, "Zertifikat Excel")).toHaveCount(0);
  await filter.selectOption("");
  await expect(page.locator(".document-list > li")).toHaveCount(3);

  // Rename and retag.
  await item(page, "Zertifikat Excel")
    .getByRole("button", { name: "Bearbeiten" })
    .click();
  // In edit mode the entry's heading names the edited document.
  const excel = item(page, "Nachweis bearbeiten: Zertifikat Excel");
  await excel.getByLabel("Name des Nachweises").fill("Excel-Zertifikat");
  await excel
    .getByRole("button", { name: "Tag entfernen: zertifikat", exact: true })
    .click();
  const editTags = excel.getByRole("textbox", {
    name: "Tag hinzufügen",
    exact: true,
  });
  await editTags.fill("Kurs");
  await editTags.press("Enter");
  await excel.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Nachweis aktualisiert.",
  );
  await expect(item(page, "Zertifikat Excel")).toHaveCount(0);
  await expect(item(page, "Excel-Zertifikat")).toContainText("Tags: kurs");

  // Everything survives a reload.
  await page.reload();
  await expect(page.locator(".document-list > li")).toHaveCount(3);
  await expect(item(page, "Excel-Zertifikat")).toContainText("Tags: kurs");
  await expect(item(page, "Excel-Zertifikat")).toContainText("3 Seiten");
  await expect(item(page, "Abitur Zeugnis")).toContainText(
    "Tags: zeugnis, praktikum",
  );
  await expect(item(page, "Praktikumsbescheinigung")).toContainText(
    "Tags: praktikum",
  );
});

test("C2 evidence: use in a package, delete with usage and confirmation", async ({
  page,
}) => {
  await page.goto(EVIDENCE_URL);
  await uploadEvidence(page, {
    fileName: "abitur.pdf",
    name: "Abitur Zeugnis",
    pages: 2,
    suggest: { prefix: "zeug", tag: "zeugnis" },
  });
  await uploadEvidence(page, {
    fileName: "excel.pdf",
    name: "Excel-Zertifikat",
    pages: 3,
    own: "Kurs",
  });

  // Released lead: cover letter 1 page, CV 2 pages.
  await setupReleasedLead(page, { cvPages: 2, coverPages: 1 });
  await gotoLeadStep(page, "Paket");
  const packageUrl = page.url();

  // The tag filter narrows the selection list.
  await page.getByLabel("Nachweise nach Tag filtern").selectOption("kurs");
  const choice = page.getByLabel("PDF auswählen");
  await expect(choice.locator("option")).toHaveText([
    "Dokument: Excel-Zertifikat",
  ]);
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await page.getByLabel("Nachweise nach Tag filtern").selectOption("");
  await choice.selectOption({ label: "Dokument: Abitur Zeugnis" });
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  const items = page.locator(".package-items li");
  await expect(items).toHaveText([
    /Anschreiben-PDF/,
    /Lebenslauf-PDF/,
    /Dokument: Excel-Zertifikat/,
    /Dokument: Abitur Zeugnis/,
  ]);

  // Cover letter 1 + CV 2 + evidence 3 + 2 pages.
  const zip = await captureDownload(page, () =>
    page.getByRole("button", { name: "ZIP herunterladen" }).click(),
  );
  const entries = [...zipEntries(zip.bytes)];
  expect(entries).toHaveLength(1);
  expect(await pdfPageCount(entries[0]?.[1] ?? new Uint8Array())).toBe(8);

  // Deletion shows where the document is used; cancel keeps it.
  await page.goto(EVIDENCE_URL);
  const excel = item(page, "Excel-Zertifikat");
  await excel.getByRole("button", { name: "Löschen …" }).click();
  await expect(excel).toContainText("Wird verwendet in:");
  await expect(excel).toContainText(/Beispiel GmbH – .*Bewerbung\.pdf/);
  await excel.getByRole("button", { name: "Abbrechen" }).click();
  await expect(excel).toBeVisible();
  await expect(excel.getByRole("button", { name: "Löschen …" })).toBeVisible();

  // Confirming removes it from the list and from the package.
  await excel.getByRole("button", { name: "Löschen …" }).click();
  await excel.getByRole("button", { name: "Ja, löschen" }).click();
  await expect(page.getByRole("status")).toContainText("Nachweis gelöscht.");
  await expect(item(page, "Excel-Zertifikat")).toHaveCount(0);
  await expect(item(page, "Abitur Zeugnis")).toBeVisible();

  await page.goto(packageUrl);
  await expect(page.locator(".package-items li")).toHaveText([
    /Anschreiben-PDF/,
    /Lebenslauf-PDF/,
    /Dokument: Abitur Zeugnis/,
  ]);
  await page.reload();
  await expect(page.locator(".package-items li")).toHaveText([
    /Anschreiben-PDF/,
    /Lebenslauf-PDF/,
    /Dokument: Abitur Zeugnis/,
  ]);
  await expect(page.getByText("Dokument: Excel-Zertifikat")).toHaveCount(0);
});

test("C2 evidence: deleting the CV PDF keeps the release and blocks the ZIP until a new upload", async ({
  page,
}) => {
  await setupReleasedLead(page, { cvPages: 2, coverPages: 1 });
  const leadUrl = page.url();

  await page.goto("/#/einrichtung/lebenslauf");
  await expect(page.getByText(/^Aktuell: Lebenslauf\.pdf/)).toBeVisible();
  await page.getByRole("button", { name: "Lebenslauf-PDF löschen …" }).click();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByText(/^Aktuell: Lebenslauf\.pdf/)).toBeVisible();

  await page.getByRole("button", { name: "Lebenslauf-PDF löschen …" }).click();
  await expect(page.getByText(/freigegebener Lead bleibt/)).toBeVisible();
  await page
    .getByRole("button", { name: "Ja, Lebenslauf-PDF löschen" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Lebenslauf-PDF gelöscht.",
  );
  await expect(
    page.getByText("Noch kein Lebenslauf-PDF hochgeladen."),
  ).toBeVisible();

  // The lead stays released; its package waits for a new CV PDF.
  await page.goto(leadUrl);
  await expect(page.getByText("Status: Bereit zum Versenden")).toBeVisible();
  await gotoLeadStep(page, "Paket");
  await expect(
    page.getByText("Das Lebenslauf-PDF fehlt. Lade es zuerst hoch."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Lebenslauf-PDF hochladen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ZIP herunterladen" }),
  ).toBeDisabled();

  await uploadCvPdf(page, await pdfFile("Lebenslauf-neu.pdf", 3));
  await page.goto(leadUrl);
  await gotoLeadStep(page, "Paket");
  const zip = await captureDownload(page, () =>
    page.getByRole("button", { name: "ZIP herunterladen" }).click(),
  );
  const [entry] = [...zipEntries(zip.bytes)];
  expect(await pdfPageCount(entry?.[1] ?? new Uint8Array())).toBe(4);
});

test("C2 evidence: a tag typed without Enter is kept on upload and on save", async ({
  page,
}) => {
  await page.goto(EVIDENCE_URL);
  await page
    .getByLabel("PDF-Datei", { exact: true })
    .setInputFiles(await pdfFile("Praktikum.pdf", 1));
  const tagInput = page.getByRole("textbox", {
    name: "Tag hinzufügen",
    exact: true,
  });
  await tagInput.fill("Praktikum");
  await expect(
    page.getByText(
      "Der eingegebene Text wird beim Speichern als Tag übernommen.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hochladen", exact: true }).click();
  await expectSaved(page, "Praktikum");
  await expect(item(page, "Praktikum")).toContainText("Tags: praktikum");
  await expect(tagInput).toHaveValue("");

  await item(page, "Praktikum")
    .getByRole("button", { name: "Bearbeiten" })
    .click();
  const list = page.getByRole("region", { name: "Gespeicherte Nachweise" });
  await list
    .getByRole("textbox", { name: "Tag hinzufügen", exact: true })
    .fill("Sommer 2026");
  await list.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(item(page, "Praktikum")).toContainText(
    "Tags: praktikum, sommer 2026",
  );
});
