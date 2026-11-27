// Screenshots for the visual-design gate pages (specs/002-visual-design,
// FR-014). Seeds synthetic data through the UI of a running preview.
//
//   node scripts/capture-design.mjs <origin> <out-dir> <prefix>
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [origin, outDir, prefix] = process.argv.slice(2);
if (!origin || !outDir || !prefix) {
  console.error(
    "usage: node scripts/capture-design.mjs <origin> <out-dir> <prefix>",
  );
  process.exit(2);
}
const answer = await readFile(
  new URL("../src/llm/fixtures/valid-plain.txt", import.meta.url),
  "utf8",
);
const sizes = [
  { tag: "desktop", width: 1280, height: 800, scale: 1 },
  { tag: "360", width: 360, height: 780, scale: 2 },
];
const TITLE = "Ausbildung zum Industriekaufmann";

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
for (const size of sizes) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.scale,
    locale: "de-DE",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const shot = async (name) => {
    // No hover state left from the last click in the picture.
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.fonts.ready);
    const file = join(outDir, `${prefix}-${name}-${size.tag}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  };
  await page.goto(`${origin}/#/`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await shot("home-empty");

  await page.getByLabel("Titel des Projekts").fill(TITLE);
  await page.getByRole("button", { name: "Projekt anlegen" }).click();
  await page
    .getByLabel("Link zur Stellenanzeige")
    .fill("https://example.org/stellen/123");
  await page.getByRole("button", { name: "Link hinzufügen" }).click();
  await page.getByRole("link", { name: "Weiter zum Prompt" }).click();
  await page.getByRole("button", { name: "Prompt kopieren" }).click();
  const manual = page.getByRole("button", {
    name: "Ich habe den Prompt kopiert",
  });
  const next = page.getByRole("link", { name: "Weiter zur Antwort" });
  await manual.or(next).first().waitFor();
  if (await manual.isVisible()) await manual.click();
  await next.click();
  await page.getByLabel("Antwort des Sprachmodells").fill(answer);
  await page.getByRole("button", { name: "Antwort einlesen" }).click();
  await page.getByRole("link", { name: "Zu den Leads" }).click();
  await page.getByRole("link", { name: "Beispiel GmbH" }).click();
  await page
    .getByRole("heading", { name: "Lead prüfen und bearbeiten" })
    .waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot("lead-review");

  await page.goto(`${origin}/#/`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await shot("home");
  await context.close();
}
await browser.close();
