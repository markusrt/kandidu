import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createProjectWithLeads, openLead, setupReleasedLead } from "./flows";

// Visual design checks (specs/002-visual-design): axe without any finding,
// no horizontal scrolling at 360 px, visible focus with ≥ 3:1 contrast, and
// the webfont from the app's own origin (FR-002, FR-008–FR-010, SC-003–SC-005,
// SC-007). The fixtures' network guard fails on any foreign request.

/** axe (WCAG 2.1 A/AA): no violation of any impact (SC-003). */
async function expectNoViolations(page: Page, view: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const found = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(found, `axe violations on ${view}`).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page, view: string) {
  const { scroll, inner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(scroll, `horizontal scrolling on ${view}`).toBeLessThanOrEqual(inner);
}

/**
 * Tabs through the first `count` controls; each must show an outline of at
 * least 2 px whose color has ≥ 3:1 contrast against the background behind
 * the control (SC-005).
 */
async function expectVisibleFocus(page: Page, view: string, count = 8) {
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < count; i++) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const parse = (c: string) =>
        (c.match(/[\d.]+/g) ?? []).map(Number) as number[];
      const lum = ([r = 0, g = 0, b = 0]: number[]) => {
        const f = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      let bg = "rgb(255, 255, 255)";
      for (let n = el.parentElement; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        const alpha = parse(c)[3];
        if (c !== "transparent" && alpha !== 0) {
          bg = c;
          break;
        }
      }
      const style = getComputedStyle(el);
      const [a, b] = [lum(parse(style.outlineColor)), lum(parse(bg))].sort(
        (x, y) => y - x,
      ) as [number, number];
      return {
        name: `${el.tagName} ${el.textContent?.trim().slice(0, 30)}`,
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
        ratio: (a + 0.05) / (b + 0.05),
      };
    });
    if (!focus) continue;
    expect(focus.style, `${view}: ${focus.name}`).not.toBe("none");
    expect(focus.width, `${view}: ${focus.name}`).toBeGreaterThanOrEqual(2);
    expect(focus.ratio, `${view}: ${focus.name}`).toBeGreaterThanOrEqual(3);
  }
}

async function checkView(page: Page, view: string) {
  await page.evaluate(() => document.fonts.ready);
  await expectNoViolations(page, view);
  await expectNoHorizontalScroll(page, view);
  await expectVisibleFocus(page, view);
}

for (const width of [undefined, 360]) {
  const label = width ? `${width} px` : "default width";

  test(`design: home and lead review pass axe, width and focus (${label})`, async ({
    page,
  }) => {
    if (width) await page.setViewportSize({ width, height: 780 });
    await page.goto("/#/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Deine Bewerbungen",
    );
    expect(
      await page.evaluate(() =>
        document.fonts.check('16px "Atkinson Hyperlegible Next"'),
      ),
      "webfont loaded",
    ).toBe(true);
    await checkView(page, `home empty (${label})`);

    await createProjectWithLeads(page, "valid-plain");
    await page.goto("/#/");
    await expect(
      page.getByRole("link", { name: "Ausbildung zum Industriekaufmann" }),
    ).toBeVisible();
    await checkView(page, `home (${label})`);

    await page
      .getByRole("link", { name: "Ausbildung zum Industriekaufmann" })
      .click();
    await page
      .getByRole("navigation", { name: "Schritte des Projekts" })
      .getByRole("link", { name: "Leads", exact: true })
      .click();
    await openLead(page, "Beispiel GmbH");
    await expect(
      page.getByRole("heading", { name: "Lead prüfen und bearbeiten" }),
    ).toBeVisible();
    await checkView(page, `lead review (${label})`);
  });
}

// Every other main screen (US2, T015): setup, info pages, project steps and
// lead steps of a released lead, and the not-found page.
const SCREENS = [
  "#/einrichtung/profil",
  "#/einrichtung/vorlagen",
  "#/einrichtung/lebenslauf",
  "#/einrichtung/nachweise",
  "#/platzhalter",
  "#/daten",
  "{project}/links",
  "{project}/prompt",
  "{project}/antwort",
  "{project}/leads",
  "{lead}/anschreiben",
  "{lead}/freigabe",
  "{lead}/paket",
  "{lead}/verlauf",
  "#/gibt-es-nicht",
];

for (const width of [undefined, 360]) {
  const label = width ? `${width} px` : "default width";

  test(`design: every main screen passes axe, width and focus (${label})`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    if (width) await page.setViewportSize({ width, height: 780 });
    await setupReleasedLead(page, { cvPages: 1, coverPages: 1 });
    const hash = new URL(page.url()).hash;
    const lead = hash.slice(0, hash.lastIndexOf("/"));
    const project = lead.slice(0, lead.indexOf("/leads/"));
    for (const screen of SCREENS) {
      const target = screen
        .replace("{project}", project)
        .replace("{lead}", lead);
      await page.goto(`/${target}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await checkView(page, `${screen} (${label})`);
    }
  });
}
