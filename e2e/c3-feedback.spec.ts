import type { Page } from "@playwright/test";
import { captureDownload, docxText, expect, PROFILE, test } from "./fixtures";
import {
  createProjectWithLeads,
  fillProfile,
  gotoLeadStep,
  gotoProjectStep,
  openLead,
} from "./flows";

// C3 Phase A: the owner's C2 follow-ups (feedback/C2.md R1–R4).

/** Opens a project step from anywhere inside the project, also lead pages. */
async function projectStep(page: Page, step: string): Promise<void> {
  const projectId = /#\/projekte\/([^/]+)/.exec(page.url())?.[1];
  expect(projectId).toBeTruthy();
  await page.goto(`/#/projekte/${projectId}/links`);
  if (step !== "Links") await gotoProjectStep(page, step);
}

async function coverLetterText(page: Page, company: string): Promise<string> {
  await projectStep(page, "Leads");
  await openLead(page, company);
  await gotoLeadStep(page, "Anschreiben");
  const letter = await captureDownload(page, () =>
    page
      .getByRole("button", {
        name: /Anschreiben \(DOCX\) herunterladen|Trotzdem herunterladen/,
      })
      .click(),
  );
  return docxText(letter.bytes).join("\n");
}

test("C3 feedback: Stelle from the project, overridden per lead (R4)", async ({
  page,
}) => {
  await fillProfile(page, PROFILE);
  await createProjectWithLeads(page, "valid-three-leads");

  // Without any Stelle the advertisement's title is used, as before.
  expect(await coverLetterText(page, "Beispiel GmbH")).toContain(
    "Bewerbung als Ausbildung zum Industriekaufmann (m/w/d) (Kennziffer",
  );

  await projectStep(page, "Links");
  const projectField = page.getByLabel("Stelle ({Stelle})");
  await projectField.fill("  Industriekaufmann ");
  await expect(page.getByText("Ungespeicherte Änderungen")).toBeVisible();
  await page.getByRole("button", { name: "Stelle speichern" }).click();
  await expect(page.getByRole("status")).toContainText("Gespeichert.");
  await expect(projectField).toHaveValue("Industriekaufmann");

  // One lead gets its own value; the hint names what applies otherwise.
  await projectStep(page, "Leads");
  await openLead(page, "Muster AG");
  const leadField = page.getByLabel("Stelle im Anschreiben ({Stelle})");
  await expect(leadField).toHaveValue("");
  await expect(leadField).toHaveAccessibleDescription(
    /Leer gelassen steht im Anschreiben: „Industriekaufmann“/,
  );
  await leadField.fill("Kaufmann für Büromanagement");
  await page.getByRole("button", { name: "Lead speichern" }).click();
  await expect(page.getByRole("status")).toContainText("Gespeichert.");

  const other = await coverLetterText(page, "Beispiel GmbH");
  expect(other).toContain("Bewerbung als Industriekaufmann (Kennziffer");
  const own = await coverLetterText(page, "Muster AG");
  expect(own).toContain(
    "Bewerbung als Kaufmann für Büromanagement (Kennziffer",
  );

  // Both values survive a reload.
  await page.reload();
  await gotoLeadStep(page, "Prüfen");
  await expect(page.getByLabel("Stelle im Anschreiben ({Stelle})")).toHaveValue(
    "Kaufmann für Büromanagement",
  );
  await projectStep(page, "Links");
  await expect(page.getByLabel("Stelle ({Stelle})")).toHaveValue(
    "Industriekaufmann",
  );
});
