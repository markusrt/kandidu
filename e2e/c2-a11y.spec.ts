import type { Locator, Page } from "@playwright/test";
import {
  downloadBytes,
  expect,
  expectNoSeriousViolations,
  PROFILE,
  pdfFile,
  pdfPageCount,
  readFixture,
  test,
  type UploadFile,
  zipEntries,
} from "./fixtures";
import {
  createProjectWithLeads,
  openLead,
  PORTAL_LINK,
  profileLabel,
  releaseLead,
  setupReleasedLead,
} from "./flows";

// C2 keyboard and accessibility proof (User Story 4, SC-009): the US1 path
// without a mouse, and axe scans of the main views.

/**
 * Presses Tab until `target` has focus, which proves it is reachable by
 * keyboard, and checks that the focus is visible.
 */
async function tabTo(page: Page, target: Locator, max = 200): Promise<void> {
  await expect(target).toBeVisible();
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) {
      const visible = await target.evaluate((el) => {
        const style = getComputedStyle(el);
        return (
          style.outlineStyle !== "none" &&
          Number.parseFloat(style.outlineWidth) > 0
        );
      });
      expect(visible, `visible focus on ${target}`).toBe(true);
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error(`not reachable with Tab: ${target}`);
}

async function activate(page: Page, target: Locator, key = "Enter") {
  await tabTo(page, target);
  await page.keyboard.press(key);
}

/** Opens the file chooser of a focused file input with Space. */
async function chooseFile(page: Page, input: Locator, file: UploadFile) {
  await tabTo(page, input);
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.keyboard.press("Space"),
  ]);
  await chooser.setFiles(file);
}

const status = (page: Page) => page.getByRole("status");

test("C2 keyboard: the whole US1 path works without a mouse", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });

  // Profile.
  await activate(page, nav.getByRole("link", { name: "Einrichtung" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Persönliche Daten",
  );
  for (const [label, value] of Object.entries(PROFILE)) {
    await tabTo(page, page.getByLabel(profileLabel(label)));
    await page.keyboard.type(value);
  }
  await activate(page, page.getByRole("button", { name: "Speichern" }));
  await expect(status(page)).toContainText("Gespeichert.");

  // CV PDF (the demo templates are active by default).
  const setupSteps = page.getByRole("navigation", {
    name: "Schritte der Einrichtung",
  });
  await activate(
    page,
    setupSteps.getByRole("link", { name: "Lebenslauf-PDF" }),
  );
  await chooseFile(
    page,
    page.getByLabel("Lebenslauf-PDF hochladen"),
    await pdfFile("Lebenslauf.pdf", 2),
  );
  await expect(status(page)).toContainText("Lebenslauf-PDF gespeichert.");

  // Project, link, prompt.
  await activate(page, nav.getByRole("link", { name: "Start" }));
  await tabTo(page, page.getByLabel("Titel des Projekts"));
  await page.keyboard.type("Tastatur-Projekt");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Links zu Stellenausschreibungen",
  );
  await tabTo(page, page.getByLabel("Link zur Stellenanzeige"));
  await page.keyboard.type("https://example.org/stellen/tastatur");
  await page.keyboard.press("Enter");
  await expect(status(page)).toContainText("Gespeichert.");
  await activate(page, page.getByRole("link", { name: "Weiter zum Prompt" }));
  await activate(page, page.getByRole("button", { name: "Prompt kopieren" }));
  await expect(status(page)).toContainText("kopiert");
  await activate(page, page.getByRole("link", { name: "Weiter zur Antwort" }));

  // Response → lead.
  await tabTo(page, page.getByLabel("Antwort des Sprachmodells"));
  await page.keyboard.insertText(await readFixture("valid-plain"));
  await activate(page, page.getByRole("button", { name: "Antwort einlesen" }));
  await expect(status(page)).toContainText("1 Lead angelegt.");
  await activate(page, page.getByRole("link", { name: "Zu den Leads" }));
  await activate(page, page.getByRole("link", { name: "Beispiel GmbH" }));

  // Cover letter DOCX, release, package.
  const leadSteps = page.getByRole("navigation", {
    name: "Schritte des Leads",
  });
  await activate(page, leadSteps.getByRole("link", { name: "Anschreiben" }));
  const [docx] = await Promise.all([
    page.waitForEvent("download"),
    activate(
      page,
      page.getByRole("button", { name: "Anschreiben (DOCX) herunterladen" }),
    ),
  ]);
  expect(docx.suggestedFilename()).toMatch(/\.docx$/);

  await activate(page, leadSteps.getByRole("link", { name: "Freigabe" }));
  await chooseFile(
    page,
    page.getByLabel("Anschreiben-PDF hochladen"),
    await pdfFile("Anschreiben.pdf", 1),
  );
  await expect(status(page)).toContainText("Anschreiben-PDF gespeichert.");
  await activate(
    page,
    page.getByLabel(
      "Ich habe Anschreiben und Lebenslauf geprüft und gebe diesen Lead frei.",
    ),
    "Space",
  );
  await activate(page, page.getByRole("button", { name: "Lead freigeben" }));
  await expect(page.getByText("Status: Bereit zum Versenden")).toBeVisible();

  await activate(page, leadSteps.getByRole("link", { name: "Paket" }));
  const [zip] = await Promise.all([
    page.waitForEvent("download"),
    activate(page, page.getByRole("button", { name: "ZIP herunterladen" })),
  ]);
  const entries = [...zipEntries(await downloadBytes(zip)).values()];
  expect(entries).toHaveLength(1);
  expect(await pdfPageCount(entries[0] ?? new Uint8Array())).toBe(3);
});

test("C2 a11y: axe finds no critical or serious violations in the main views", async ({
  page,
}) => {
  await setupReleasedLead(page, { cvPages: 1, coverPages: 1 });
  const match = /#\/projekte\/([^/]+)\/leads\/([^/]+)\//.exec(page.url());

  // One evidence PDF, so lists, tags and the package picker have content.
  await page.goto("/#/einrichtung/nachweise");
  await page
    .getByLabel("PDF-Datei", { exact: true })
    .setInputFiles(await pdfFile("Zeugnis.pdf", 1));
  const tagInput = page.getByRole("textbox", {
    name: "Tag hinzufügen",
    exact: true,
  });
  await tagInput.fill("zeug");
  await page
    .getByRole("button", { name: "Tag hinzufügen: zeugnis", exact: true })
    .click();
  await page.getByRole("button", { name: "Hochladen", exact: true }).click();
  await expect(
    page.locator(".document-list").getByRole("heading", { name: "Zeugnis" }),
  ).toBeVisible();
  await tagInput.fill("z");
  await expect(
    page.getByRole("button", { name: "Tag hinzufügen: zeugnis", exact: true }),
  ).toBeVisible();
  await expectNoSeriousViolations(page, "evidence with suggestions");
  const projectId = match?.[1] ?? "";
  const leadId = match?.[2] ?? "";
  expect(projectId && leadId).toBeTruthy();

  const project = `/#/projekte/${projectId}`;
  const lead = `${project}/leads/${leadId}`;
  for (const route of [
    "/#/",
    "/#/einrichtung/profil",
    "/#/einrichtung/vorlagen",
    "/#/einrichtung/lebenslauf",
    "/#/einrichtung/nachweise",
    "/#/platzhalter",
    "/#/daten",
    `${project}/links`,
    `${project}/prompt`,
    `${project}/antwort`,
    `${project}/leads`,
    `${lead}/pruefen`,
    `${lead}/anschreiben`,
    `${lead}/freigabe`,
    `${lead}/paket`,
    `${lead}/verlauf`,
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoSeriousViolations(page, route);
  }

  // Error states use the same structure.
  await page.goto(`${project}/antwort`);
  await page
    .getByLabel("Antwort des Sprachmodells")
    .fill(await readFixture("invalid-missing-company"));
  await page.getByRole("button", { name: "Antwort einlesen" }).click();
  await expect(page.getByRole("alert")).toContainText("Eintrag 1");
  await expectNoSeriousViolations(page, "parse errors");
});

test("C3 a11y: the links block of the lead review, also with errors", async ({
  page,
}) => {
  await createProjectWithLeads(
    page,
    "valid-original-sources",
    undefined,
    PORTAL_LINK,
  );
  await openLead(page, "Beispiel GmbH");
  await expect(page.getByRole("group", { name: "Links" })).toBeVisible();
  await expectNoSeriousViolations(page, "links block");

  await page
    .getByLabel("Original-Ausschreibung des Unternehmens", { exact: true })
    .fill("kaputt");
  await page.getByRole("button", { name: "Quelle hinzufügen" }).click();
  await page.getByLabel("Link der Quelle 4").fill("auch kaputt");
  await page.getByRole("button", { name: "Lead speichern" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expectNoSeriousViolations(page, "links block with errors");
});

/** Focus is on a real element, never left on <body> (T066). */
async function expectFocusKept(page: Page, where: string) {
  const tag = await page.evaluate(() => document.activeElement?.tagName);
  expect(tag, `focus after ${where}`).not.toBe("BODY");
}

test("C3 keyboard: Verlauf, comments and every removal keep the focus", async ({
  page,
}) => {
  await setupReleasedLead(page, { cvPages: 1, coverPages: 1 });
  const leadUrl = page.url();

  // Lifecycle and comments with the keyboard only.
  await page
    .getByRole("navigation", { name: "Schritte des Leads" })
    .getByRole("link", { name: "Verlauf" })
    .click();
  await activate(page, page.getByRole("button", { name: "Versendet" }));
  await expect(status(page)).toContainText("Status geändert: Versendet.");
  // The pressed button is not offered any more; focus is on the new state.
  await expect(
    page.getByRole("heading", { level: 2, name: "Aktueller Stand" }),
  ).toBeFocused();
  await tabTo(page, page.getByLabel("Kommentar", { exact: true }));
  await page.keyboard.type("Per Tastatur notiert");
  await activate(
    page,
    page.getByRole("button", { name: "Kommentar hinzufügen" }),
  );
  await expect(status(page)).toContainText("Kommentar hinzugefügt.");

  const deleteComment = page.getByRole("button", {
    name: "Kommentar 1 löschen",
  });
  await activate(page, deleteComment);
  await expect(page.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(deleteComment).toBeFocused();

  const undo = page.getByRole("button", {
    name: "Letzten Statuswechsel rückgängig machen",
  });
  await activate(page, undo);
  await expect(page.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(undo).toBeFocused();
  await page.keyboard.press("Enter");
  await activate(
    page,
    page.getByRole("button", { name: "Ja, rückgängig machen" }),
  );
  await expect(status(page)).toContainText("Statuswechsel rückgängig gemacht.");
  await expect(
    page.getByRole("heading", { level: 2, name: "Verlauf", exact: true }),
  ).toBeFocused();
  await expectNoSeriousViolations(page, "Verlauf after keyboard use");

  // "Zurück in den Review": cancel returns to the opener.
  await page.goto(leadUrl.replace(/\/[a-z]+$/, "/freigabe"));
  const back = page.getByRole("button", { name: "Zurück in den Review …" });
  await back.click();
  await expect(page.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(back).toBeFocused();
  // Confirming swaps the view; focus goes to its heading, also after a new
  // release.
  await back.click();
  await page.getByRole("button", { name: "Ja, zurück in den Review" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await releaseLead(page, await pdfFile("Anschreiben.pdf", 1));
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  // Package: removing an item and a whole package.
  await page.goto(leadUrl.replace(/\/[a-z]+$/, "/paket"));
  await page
    .getByRole("button", { name: "Lebenslauf-PDF aus dem Paket entfernen" })
    .click();
  await expect(page.getByLabel("PDF auswählen")).toBeFocused();
  await page.getByRole("button", { name: "Paket-PDF hinzufügen" }).click();
  await page.getByRole("button", { name: "Paket-PDF 2 entfernen" }).click();
  await expect(
    page.getByRole("heading", { name: "Weiteres Paket-PDF" }),
  ).toBeFocused();

  // Links: removing a link.
  await page.goto(leadUrl.replace(/\/leads\/.*$/, "/links"));
  await page
    .getByLabel("Link zur Stellenanzeige")
    .fill("https://example.org/stellen/zweite");
  await page.getByRole("button", { name: "Link hinzufügen" }).click();
  await page
    .getByRole("button", {
      name: "Link entfernen: https://example.org/stellen/zweite",
    })
    .click();
  await expect(status(page)).toContainText("Link entfernt.");
  await expect(page.getByLabel("Link zur Stellenanzeige")).toBeFocused();

  // Evidence upload form: removing a chosen tag.
  await page.goto("/#/einrichtung/nachweise");
  const tagInput = page.getByRole("textbox", {
    name: "Tag hinzufügen",
    exact: true,
  });
  await tagInput.fill("zeugnis");
  await tagInput.press("Enter");
  await page.getByRole("button", { name: "Tag entfernen: zeugnis" }).click();
  await expect(tagInput).toBeFocused();

  // Data page: reset and backup import confirmations.
  await page.goto("/#/daten");
  const reset = page.getByRole("button", {
    name: "Kandidu-Daten zurücksetzen …",
  });
  await reset.click();
  await expect(page.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(reset).toBeFocused();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Sicherung herunterladen" }).click(),
  ]);
  const picker = page.getByLabel("Sicherungs-ZIP auswählen");
  await picker.setInputFiles({
    name: "sicherung.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(await downloadBytes(download)),
  });
  await expect(
    page.getByRole("button", { name: "Ja, aktuellen Stand ersetzen" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(picker).toBeFocused();
  await expectFocusKept(page, "backup cancel");
});
