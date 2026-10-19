import type { Page } from "@playwright/test";
import {
  captureDownload,
  expect,
  pdfPageCount,
  readFixture,
  test,
  zipEntries,
} from "./fixtures";
import {
  addProjectLink,
  copyPrompt,
  createProject,
  gotoLeadStep,
  gotoProjectStep,
  setupReleasedLead,
} from "./flows";

// C2 multi-link projects and multi-package leads (User Story 3).

const LINK_1 = "https://example.org/stellen/1";
const LINK_2 = "https://example.org/stellen/2";
const LINK_3 = "https://example.org/stellen/3";
const LINK_2_NEW = "https://example.org/jobs/zwei-neu";

/** A project with one link, its prompt copied, on the answer step. */
async function projectOnAnswerStep(page: Page): Promise<void> {
  await createProject(page, "Ausbildung zum Industriekaufmann");
  await addProjectLink(page, LINK_1);
  await page.getByRole("link", { name: "Weiter zum Prompt" }).click();
  await copyPrompt(page);
  await page.getByRole("link", { name: "Weiter zur Antwort" }).click();
}

const urlsInPrompt = async (page: Page): Promise<string[]> => {
  const text = await page.getByLabel("Vollständiger Prompt").inputValue();
  return [...text.matchAll(/^\d+\. (\S+)$/gm)].map((match) => match[1] ?? "");
};

test("C2 multi: three links, edit, remove and re-add, context, prompt warning", async ({
  page,
}) => {
  await createProject(page, "Ausbildung zum Industriekaufmann");
  for (const url of [LINK_1, LINK_2, LINK_3]) await addProjectLink(page, url);

  // An invalid edit shows the error and keeps the input.
  const editButton = page.getByRole("button", {
    name: `Link bearbeiten: ${LINK_2}`,
  });
  await editButton.click();
  const field = page.getByLabel("Link 2 bearbeiten");
  await expect(field).toBeFocused();
  await field.fill("ftp://example.org/kaputt");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    page.getByText("Bitte gib einen vollständigen Link ein"),
  ).toBeVisible();
  await expect(field).toHaveValue("ftp://example.org/kaputt");

  // Escape cancels and focus returns to the edit button.
  await field.press("Escape");
  await expect(field).toHaveCount(0);
  await expect(editButton).toBeFocused();
  await expect(page.getByText(LINK_2, { exact: true })).toBeVisible();

  // A valid edit replaces the link.
  await editButton.click();
  await page.getByLabel("Link 2 bearbeiten").fill(LINK_2_NEW);
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Link geändert.");
  await expect(page.getByText(LINK_2_NEW, { exact: true })).toBeVisible();

  // Remove the third link and add it again.
  await page.getByRole("button", { name: `Link entfernen: ${LINK_3}` }).click();
  await expect(page.getByRole("status")).toContainText("Link entfernt.");
  await expect(page.getByText(LINK_3, { exact: true })).toHaveCount(0);
  await addProjectLink(page, LINK_3);

  // The prompt lists exactly the current links.
  await page
    .getByLabel("Kontext für den Prompt")
    .fill("Ich interessiere mich besonders für Einkauf.");
  await page.getByRole("button", { name: "Kontext speichern" }).click();
  await expect(page.getByRole("status")).toContainText("Gespeichert.");
  await page.getByRole("link", { name: "Weiter zum Prompt" }).click();
  await expect(page.getByLabel("Vollständiger Prompt")).toBeVisible();
  expect(await urlsInPrompt(page)).toEqual([LINK_1, LINK_2_NEW, LINK_3]);
  await expect(page.getByLabel("Vollständiger Prompt")).not.toHaveValue(
    new RegExp(`${LINK_2}(?!\\d)`),
  );

  // The context is part of the prompt and the user is told where it goes.
  await expect(page.getByLabel("Vollständiger Prompt")).toHaveValue(
    /Ich interessiere mich besonders für Einkauf\./,
  );
  await expect(
    page.getByText("Der Prompt enthält deinen zusätzlichen Kontext."),
  ).toBeVisible();
  await expect(
    page.getByText("an das externe Sprachmodell übermittelt"),
  ).toBeVisible();

  // After copying, a changed link marks the prompt as outdated.
  await copyPrompt(page);
  await expect(page.getByText("Prompt geändert:")).toHaveCount(0);
  await gotoProjectStep(page, "Links");
  await page
    .getByRole("button", { name: `Link bearbeiten: ${LINK_3}` })
    .click();
  await page
    .getByLabel("Link 3 bearbeiten")
    .fill("https://example.org/stellen/33");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Link geändert.");
  await gotoProjectStep(page, "Prompt");
  await expect(page.getByText("Prompt geändert:")).toBeVisible();
});

test("C2 multi: three leads from one response", async ({ page }) => {
  await projectOnAnswerStep(page);
  await page
    .getByLabel("Antwort des Sprachmodells")
    .fill(await readFixture("valid-three-leads"));
  await page.getByRole("button", { name: "Antwort einlesen" }).click();
  await expect(page.getByRole("status")).toContainText("3 Leads angelegt.");
  await page.getByRole("link", { name: "Zu den Leads" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  for (const company of ["Beispiel GmbH", "Muster AG", "Probe KG"]) {
    await expect(page.getByRole("link", { name: company })).toHaveCount(1);
  }
});

test("C2 multi: partial import takes over only the valid entries", async ({
  page,
}) => {
  await projectOnAnswerStep(page);
  const response = JSON.parse(await readFixture("valid-three-leads")) as {
    leads: { company: { name?: string } }[];
  };
  delete response.leads[1]?.company.name;
  const text = JSON.stringify(response, null, 2);

  const answer = page.getByLabel("Antwort des Sprachmodells");
  await answer.fill(text);
  await page.getByRole("button", { name: "Antwort einlesen" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Eintrag 2: Firmenname fehlt.",
  );
  await expect(answer).toHaveValue(text);
  await page
    .getByRole("button", {
      name: "Nur gültige Einträge übernehmen (2 von 3)",
    })
    .click();
  await expect(page.getByRole("status")).toContainText("2 Leads angelegt.");
  await page.getByRole("link", { name: "Zu den Leads" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Muster AG" })).toHaveCount(0);

  // The same text again asks before importing twice.
  await gotoProjectStep(page, "Antwort");
  await answer.fill(text);
  await page.getByRole("button", { name: "Antwort einlesen" }).click();
  await expect(page.getByRole("alert")).toContainText("schon eingelesen");
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await gotoProjectStep(page, "Leads");
  await expect(page.locator("tbody tr")).toHaveCount(2);
});

test("C2 multi: two package PDFs with chosen names in one ZIP, restored after reload", async ({
  page,
}) => {
  await setupReleasedLead(page, { cvPages: 2, coverPages: 1 });
  await gotoLeadStep(page, "Paket");

  const first = page.getByRole("region", { name: "Paket-PDF 1" });
  await first.getByLabel("Dateiname des PDFs").fill("Bewerbung_komplett.pdf");

  await page
    .getByLabel("Vorlage für das neue Paket-PDF")
    .selectOption({ label: "Anschreiben und Lebenslauf" });
  await page.getByRole("button", { name: "Paket-PDF hinzufügen" }).click();
  const second = page.getByRole("region", { name: "Paket-PDF 2" });
  await second.getByLabel("Dateiname des PDFs").fill("Nur_Lebenslauf.pdf");
  // The second PDF carries the CV only.
  await second
    .getByRole("button", { name: "Anschreiben-PDF aus dem Paket entfernen" })
    .click();
  await expect(second.locator(".package-items li")).toHaveText([
    /Lebenslauf-PDF/,
  ]);

  const zip = await captureDownload(page, () =>
    page.getByRole("button", { name: "ZIP herunterladen" }).click(),
  );
  const entries = zipEntries(zip.bytes);
  expect([...entries.keys()].sort()).toEqual([
    "Bewerbung_komplett.pdf",
    "Nur_Lebenslauf.pdf",
  ]);
  expect(
    await pdfPageCount(
      entries.get("Bewerbung_komplett.pdf") ?? new Uint8Array(),
    ),
  ).toBe(3);
  expect(
    await pdfPageCount(entries.get("Nur_Lebenslauf.pdf") ?? new Uint8Array()),
  ).toBe(2);

  // Both definitions come back after a reload.
  await page.reload();
  const firstAgain = page.getByRole("region", { name: "Paket-PDF 1" });
  const secondAgain = page.getByRole("region", { name: "Paket-PDF 2" });
  await expect(firstAgain.getByLabel("Dateiname des PDFs")).toHaveValue(
    "Bewerbung_komplett.pdf",
  );
  await expect(firstAgain.locator(".package-items li")).toHaveText([
    /Anschreiben-PDF/,
    /Lebenslauf-PDF/,
  ]);
  await expect(secondAgain.getByLabel("Dateiname des PDFs")).toHaveValue(
    "Nur_Lebenslauf.pdf",
  );
  await expect(secondAgain.locator(".package-items li")).toHaveText([
    /Lebenslauf-PDF/,
  ]);
});
