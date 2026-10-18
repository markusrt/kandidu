import type { Page } from "@playwright/test";
import { expect, readFixture, type UploadFile } from "./fixtures";

// UI flows shared by journeys. Selectors use visible German labels and roles,
// the way a person (or a screen reader) finds them.

export async function openHome(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Deine Bewerbungen",
  );
}

export async function uploadCvPdf(page: Page, file: UploadFile): Promise<void> {
  await page.goto("/#/einrichtung/lebenslauf");
  await page.getByLabel("Lebenslauf-PDF hochladen").setInputFiles(file);
  await expect(page.getByRole("status")).toContainText(
    "Lebenslauf-PDF gespeichert.",
  );
}

/** Creates a project with one link, copies the prompt, pastes a fixture answer. */
export async function createProjectWithLeads(
  page: Page,
  fixture: string,
  title = "Ausbildung zum Industriekaufmann",
): Promise<void> {
  await openHome(page);
  await page.getByLabel("Titel des Projekts").fill(title);
  await page.getByRole("button", { name: "Projekt anlegen" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Links zu Stellenausschreibungen",
  );
  await page
    .getByLabel("Link zur Stellenanzeige")
    .fill("https://example.org/stellen/123");
  await page.getByRole("button", { name: "Link hinzufügen" }).click();
  await page.getByRole("link", { name: "Weiter zum Prompt" }).click();
  await copyPrompt(page);
  await page.getByRole("link", { name: "Weiter zur Antwort" }).click();
  await page
    .getByLabel("Antwort des Sprachmodells")
    .fill(await readFixture(fixture));
  await page.getByRole("button", { name: "Antwort einlesen" }).click();
  await expect(page.getByRole("status")).toContainText("angelegt.");
  await page.getByRole("link", { name: "Zu den Leads" }).click();
}

export async function copyPrompt(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Prompt kopieren" }).click();
  const manual = page.getByRole("button", {
    name: "Ich habe den Prompt kopiert",
  });
  const next = page.getByRole("link", { name: "Weiter zur Antwort" });
  await expect(manual.or(next)).toBeVisible();
  if (await manual.isVisible()) await manual.click();
  await expect(next).toBeVisible();
}

export async function openLead(page: Page, company: string): Promise<void> {
  await page.getByRole("link", { name: company }).click();
  await expect(page.getByText(company).first()).toBeVisible();
}

export async function gotoLeadStep(page: Page, step: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Schritte des Leads" })
    .getByRole("link", { name: step })
    .click();
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches a profile field label such as "Ort (Pflichtfeld)" but not "Geburtsort". */
export function profileLabel(label: string): RegExp {
  return new RegExp(`^${escapeRegExp(label)}( \\(|$)`);
}

/** Fills the profile form and saves it. */
export async function fillProfile(
  page: Page,
  values: Readonly<Record<string, string>>,
): Promise<void> {
  await page.goto("/#/einrichtung/profil");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Persönliche Daten",
  );
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(profileLabel(label)).fill(value);
  }
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toContainText("Gespeichert.");
}

export async function releaseLead(
  page: Page,
  coverLetter: UploadFile,
): Promise<void> {
  await gotoLeadStep(page, "Freigabe");
  await page.getByLabel("Anschreiben-PDF hochladen").setInputFiles(coverLetter);
  await expect(page.getByRole("status")).toContainText(
    "Anschreiben-PDF gespeichert.",
  );
  await page
    .getByLabel(
      "Ich habe Anschreiben und Lebenslauf geprüft und gebe diesen Lead frei.",
    )
    .check();
  await page.getByRole("button", { name: "Lead freigeben" }).click();
  await expect(page.getByText("Status: Bereit zum Versenden")).toBeVisible();
}
