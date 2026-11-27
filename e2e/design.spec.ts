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
    await page.evaluate(() => document.fonts.ready);
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

/** Words of `selector`'s elements that the layout splits across lines. */
async function splitWords(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((elements) => {
    const split: string[] = [];
    for (const el of elements) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent ?? "";
        for (const match of text.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          const lines = new Set(
            Array.from(range.getClientRects(), (r) => Math.round(r.top)),
          );
          if (lines.size > 1) split.push(match[0]);
        }
      }
    }
    return split;
  });
}

// Lead list (US3, T020): cards on narrow screens with the table roles kept,
// and no word broken inside on desktop (FR-011, SC-004).
for (const width of [undefined, 360]) {
  const label = width ? `${width} px` : "default width";

  test(`design: lead list keeps table roles and whole words (${label})`, async ({
    page,
  }) => {
    if (width) await page.setViewportSize({ width, height: 780 });
    await createProjectWithLeads(page, "valid-three-leads");
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader")).toHaveText([
      "Unternehmen",
      "Stelle",
      "Status",
      "Nächster Termin",
      "Letzte Aktivität",
      "Aktionen",
    ]);
    await expect(table.getByRole("row")).toHaveCount(4);
    await expect(table.getByRole("cell")).toHaveCount(18);
    await checkView(page, `lead list (${label})`);
    if (!width) {
      expect(
        await splitWords(page, ".lead-table th, .lead-table button"),
        "words broken inside a column header or button",
      ).toEqual([]);
    }
  });
}

// Edge cases (T023, FR-002, FR-010, FR-013): forced colors, reduced motion,
// zoom, WCAG 1.4.12 text spacing and a blocked webfont, on home, "Lead
// prüfen" and the lead list.
async function openHomeAndLead(page: Page): Promise<{ lead: string }> {
  await createProjectWithLeads(page, "valid-plain");
  await openLead(page, "Beispiel GmbH");
  await expect(
    page.getByRole("heading", { name: "Lead prüfen und bearbeiten" }),
  ).toBeVisible();
  return { lead: new URL(page.url()).hash };
}

async function eachView(
  page: Page,
  lead: string,
  check: (view: string) => Promise<void>,
) {
  for (const [view, hash] of [
    ["home", "#/"],
    ["lead review", lead],
    ["lead list", lead.slice(0, lead.lastIndexOf("/leads/")) + "/leads"],
  ] as const) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await check(view);
  }
}

test("design: forced colors keep focus, field borders and chips visible", async ({
  page,
}) => {
  const { lead } = await openHomeAndLead(page);
  await page.emulateMedia({ forcedColors: "active" });
  await eachView(page, lead, async (view) => {
    const fields = await page
      .locator("input:not([type=checkbox]):not([type=file]), select, textarea")
      .evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).borderTopStyle),
      );
    expect(fields.length, view).toBeGreaterThan(0);
    expect(
      fields.filter((s) => s === "none"),
      `${view}: field borders`,
    ).toEqual([]);
    const chips = await page
      .locator(".checklist strong, .badge, .status-chip")
      .evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).borderTopStyle),
      );
    expect(
      chips.filter((s) => s !== "solid"),
      `${view}: chips`,
    ).toEqual([]);
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        return {
          style: s.outlineStyle,
          width: Number.parseFloat(s.outlineWidth),
        };
      });
      if (!outline) continue;
      expect(outline.style, `${view}: focus`).not.toBe("none");
      expect(outline.width, `${view}: focus`).toBeGreaterThanOrEqual(2);
    }
  });
});

test("design: reduced motion leaves no animation or transition", async ({
  page,
}) => {
  const { lead } = await openHomeAndLead(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await eachView(page, lead, async (view) => {
    const moving = await page.evaluate(() =>
      Array.from(document.querySelectorAll("*"))
        .filter((el) => {
          const s = getComputedStyle(el);
          return (
            s.animationName !== "none" ||
            s.transitionDuration
              .split(",")
              .some((d) => Number.parseFloat(d) > 0)
          );
        })
        .map((el) => el.tagName),
    );
    expect(moving, view).toEqual([]);
  });
});

test("design: 200 % zoom and WCAG 1.4.12 text spacing do not clip content", async ({
  page,
}) => {
  const { lead } = await openHomeAndLead(page);
  // 200 % zoom of a 1280 px window reflows like a 640 px window.
  await page.setViewportSize({ width: 640, height: 800 });
  await eachView(page, lead, async (view) => {
    await page.addStyleTag({
      content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`,
    });
    await expectNoHorizontalScroll(page, `${view} (640 px, text spacing)`);
    const clipped = await page
      .locator(
        "button, .button, legend, h1, h2, .badge, .checklist strong, .status-chip",
      )
      .evaluateAll((els) =>
        els
          .filter(
            (el) =>
              el.scrollWidth > el.clientWidth + 1 ||
              el.scrollHeight > el.clientHeight + 1,
          )
          .map((el) => el.textContent?.trim().slice(0, 30)),
      );
    expect(clipped, `${view}: clipped text`).toEqual([]);
  });
});

test("design: a blocked webfont falls back to the system font", async ({
  page,
}) => {
  await page.route(/\.woff2?$/, (route) => route.abort());
  await page.goto("/#/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Deine Bewerbungen",
  );
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      document.fonts.check('16px "Atkinson Hyperlegible Next"'),
    ),
    "webfont loaded although blocked",
  ).toBe(false);
  await checkView(page, "home without webfont");
});

// C3 decision (T026, FR-010, WCAG 2.5.3): on narrow screens every step of
// the stepper shows its name, so the visible label matches the link name.
test("design: the stepper shows every step name at 360 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await createProjectWithLeads(page, "valid-plain");
  await openLead(page, "Beispiel GmbH");
  for (const nav of ["Schritte des Leads", "Schritte des Projekts"]) {
    if (nav === "Schritte des Projekts") {
      await page.goto(
        `/${new URL(page.url()).hash.replace(/\/leads\/.*$/, "/links")}`,
      );
    }
    const links = page.getByRole("navigation", { name: nav }).getByRole("link");
    // Wait for the step navigation to render before reading its links.
    await expect(links, nav).toHaveCount(nav === "Schritte des Leads" ? 5 : 4);
    for (const link of await links.all()) {
      const name = (await link.textContent())?.replace(/^\d+/, "").trim();
      expect(name, nav).toBeTruthy();
      await expect(
        link.getByText(name as string, { exact: true }),
      ).toBeVisible();
      const box = await link
        .getByText(name as string, { exact: true })
        .boundingBox();
      expect(box?.width ?? 0, `${nav}: ${name} visible width`).toBeGreaterThan(
        8,
      );
    }
    await expectNoHorizontalScroll(page, `${nav} (360 px)`);
  }
});
