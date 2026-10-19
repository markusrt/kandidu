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
import { profileLabel, setupReleasedLead } from "./flows";

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
