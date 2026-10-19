import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  addProjectLink,
  createProjectWithLeads,
  openLead,
  setupReleasedLead,
} from "./flows";

// C2 mobile proof (User Story 4, SC-010): at 360 px no view scrolls
// horizontally. Lifecycle and comment views follow in C3.

test.use({ viewport: { width: 360, height: 740 } });

async function expectNoHorizontalScroll(page: Page, view: string) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The file picker's text width depends on the platform's fonts: on the
  // Linux CI runner it was 20 px wider than on Windows and overflowed. Widen
  // it here so the check does not depend on the machine it runs on.
  await page.addStyleTag({
    content: 'input[type="file"] { letter-spacing: 2px; }',
  });
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const wide = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((el) => el.getBoundingClientRect().right > root.clientWidth + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
    return { scroll: root.scrollWidth, client: root.clientWidth, wide };
  });
  expect(
    overflow.scroll,
    `${view} scrolls horizontally: ${overflow.wide.join(", ")}`,
  ).toBeLessThanOrEqual(overflow.client);
}

test("C2 mobile: home, project, lead list and lead status fit 360 px", async ({
  page,
}) => {
  await setupReleasedLead(page, { cvPages: 1, coverPages: 1 });
  const match = /#\/projekte\/([^/]+)\/leads\/([^/]+)\//.exec(page.url());
  const project = `/#/projekte/${match?.[1] ?? ""}`;
  const lead = `${project}/leads/${match?.[2] ?? ""}`;

  // A long link stresses wrapping in the link list and the prompt.
  await page.goto(`${project}/links`);
  await addProjectLink(
    page,
    `https://example.org/stellenangebote/ausbildung/${"sehr-lange-kennung-".repeat(6)}ende`,
  );

  for (const route of [
    "/#/",
    "/#/einrichtung/profil",
    "/#/einrichtung/vorlagen",
    "/#/einrichtung/lebenslauf",
    "/#/einrichtung/nachweise",
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
    await expectNoHorizontalScroll(page, route);
  }
  await page.goto(`${lead}/freigabe`);
  await expect(page.getByText("Status: Bereit zum Versenden")).toBeVisible();
});

test("C3 mobile: the links block fits 360 px with a long URL", async ({
  page,
}) => {
  await createProjectWithLeads(page, "valid-original-sources");
  await openLead(page, "Beispiel GmbH");
  await page.getByRole("button", { name: "Quelle hinzufügen" }).click();
  await page
    .getByLabel("Link der Quelle 4")
    .fill(`https://example.org/quellen/${"sehr-lange-kennung-".repeat(8)}ende`);
  await page.getByLabel("Titel der Quelle 4 (optional)").fill("Lange Quelle");
  await page.getByRole("button", { name: "Lead speichern" }).click();
  await expect(page.getByRole("status")).toContainText("Gespeichert.");
  await expectNoHorizontalScroll(page, "links block");
});
