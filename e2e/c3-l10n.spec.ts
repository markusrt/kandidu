import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { setupReleasedLead } from "./flows";

// C3 localization proof (FR-048): translated text is often longer than German.
// Widening letters and words by roughly 40 % at 360 px must not make any view
// scroll horizontally.

test.use({ viewport: { width: 360, height: 740 } });

async function expectNoHorizontalScroll(page: Page, view: string) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Native file pickers render their own text; widen them as c2-mobile does
  // so the check does not depend on the platform's fonts.
  await page.addStyleTag({
    content: [
      'input[type="file"] { letter-spacing: 2px; }',
      "* { letter-spacing: 0.12em !important; word-spacing: 0.3em !important; }",
    ].join("\n"),
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

test("C3 l10n: views tolerate 40 % longer text at 360 px", async ({ page }) => {
  await setupReleasedLead(page, { cvPages: 1, coverPages: 1 });
  const match = /#\/projekte\/([^/]+)\/leads\/([^/]+)\//.exec(page.url());
  const project = `/#/projekte/${match?.[1] ?? ""}`;
  const lead = `${project}/leads/${match?.[2] ?? ""}`;

  for (const route of [
    "/#/",
    "/#/einrichtung/profil",
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
    `${lead}/verlauf`,
  ]) {
    await page.goto(route);
    await expectNoHorizontalScroll(page, route);
  }
});
