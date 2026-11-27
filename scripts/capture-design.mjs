// Screenshots for the visual-design gate pages (specs/002-visual-design,
// FR-014). Seeds synthetic data through the UI of a running preview and
// saves every main screen at 1280 px and 360 px (2x), full page.
//
//   node scripts/capture-design.mjs <origin> <out-dir> <prefix> [screen,…]
//
// Optional screens limit which files are written (seeding still runs).
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument } from "@cantoo/pdf-lib";
import { chromium } from "@playwright/test";

const [origin, outDir, prefix, only] = process.argv.slice(2);
if (!origin || !outDir || !prefix) {
  console.error(
    "usage: node scripts/capture-design.mjs <origin> <out-dir> <prefix> [screen,…]",
  );
  process.exit(2);
}
const wanted = only ? new Set(only.split(",")) : undefined;
const answer = await readFile(
  new URL("../src/llm/fixtures/valid-plain.txt", import.meta.url),
  "utf8",
);
const sizes = [
  { tag: "desktop", width: 1280, height: 800, scale: 1 },
  { tag: "360", width: 360, height: 780, scale: 2 },
];
const TITLE = "Ausbildung zum Industriekaufmann";
const PROFILE = {
  Vorname: "Erika",
  Nachname: "Musterfrau",
  "Straße und Hausnummer": "Musterweg 1",
  PLZ: "12345",
  Ort: "Musterstadt",
  Telefon: "+49 30 1234567",
  "E-Mail": "erika@example.org",
};

async function pdf(name) {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);
  return {
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  };
}

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
  const h1 = () => page.getByRole("heading", { level: 1 }).waitFor();
  const shot = async (name) => {
    if (wanted && !wanted.has(name)) return;
    // No hover state left from the last click in the picture.
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    const file = join(outDir, `${prefix}-${name}-${size.tag}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  };
  const go = async (hash, name) => {
    await page.goto(`${origin}/${hash}`);
    await h1();
    await shot(name);
  };
  const createProject = async (title, link) => {
    await page.goto(`${origin}/#/`);
    await page.getByLabel("Titel des Projekts").fill(title);
    await page.getByRole("button", { name: "Projekt anlegen" }).click();
    await page.getByLabel("Link zur Stellenanzeige").fill(link);
    await page.getByRole("button", { name: "Link hinzufügen" }).click();
    await page.getByRole("link", { name: "Weiter zum Prompt" }).click();
    await page.getByRole("button", { name: "Prompt kopieren" }).click();
    const manual = page.getByRole("button", {
      name: "Ich habe den Prompt kopiert",
    });
    const next = page.getByRole("link", { name: "Weiter zur Antwort" });
    await manual.or(next).first().waitFor();
    if (await manual.isVisible()) await manual.click();
    await next.waitFor();
  };

  await go("#/", "home-empty");

  // Setup: profile, templates, CV, evidence.
  await page.goto(`${origin}/#/einrichtung/profil`);
  for (const [label, value] of Object.entries(PROFILE)) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page.getByLabel(new RegExp(`^${escaped}( \\(|$)`)).fill(value);
  }
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByRole("status").getByText("Gespeichert.").waitFor();
  await shot("setup-profil");
  await go("#/einrichtung/vorlagen", "setup-vorlagen");
  await page.goto(`${origin}/#/einrichtung/lebenslauf`);
  await page
    .getByLabel("Lebenslauf-PDF hochladen")
    .setInputFiles(await pdf("Lebenslauf.pdf"));
  await page.getByText("Lebenslauf-PDF gespeichert.").waitFor();
  await shot("setup-lebenslauf");
  await go("#/einrichtung/nachweise", "setup-nachweise");
  await go("#/platzhalter", "platzhalter");
  await go("#/daten", "daten");

  // A project with one lead, through every project step.
  await createProject(TITLE, "https://example.org/stellen/123");
  const project = new URL(page.url()).hash.replace(/\/prompt$/, "");
  await shot("project-prompt");
  await page.getByRole("link", { name: "Weiter zur Antwort" }).click();
  await page.getByLabel("Antwort des Sprachmodells").fill(answer);
  await page.getByRole("button", { name: "Antwort einlesen" }).click();
  await page.getByRole("link", { name: "Zu den Leads" }).waitFor();
  await shot("project-antwort");
  await go(`${project}/links`, "project-links");
  await go(`${project}/leads`, "project-leads");
  await page.getByRole("link", { name: "Beispiel GmbH" }).click();
  await page
    .getByRole("heading", { name: "Lead prüfen und bearbeiten" })
    .waitFor();
  const lead = new URL(page.url()).hash.replace(/\/pruefen$/, "");
  await shot("lead-review");
  await go(`${lead}/anschreiben`, "lead-anschreiben");

  // Release the lead, then the package and the history.
  await page.goto(`${origin}/${lead}/freigabe`);
  await page
    .getByLabel("Anschreiben-PDF hochladen")
    .setInputFiles(await pdf("Anschreiben.pdf"));
  await page.getByText("Anschreiben-PDF gespeichert.").waitFor();
  await page
    .getByLabel(
      "Ich habe Anschreiben und Lebenslauf geprüft und gebe diesen Lead frei.",
    )
    .check();
  await page.getByRole("button", { name: "Lead freigeben" }).click();
  await page.getByText("Status: Bereit zum Versenden").waitFor();
  await shot("lead-freigabe");
  await go(`${lead}/paket`, "lead-paket");
  await go(`${lead}/verlauf`, "lead-verlauf");
  await go("#/gibt-es-nicht", "not-found");

  // A project with three leads (lead list cards), then its delete question.
  await createProject("Duales Studium", "https://example.org/jobs/3");
  await page.getByRole("link", { name: "Weiter zur Antwort" }).click();
  await page
    .getByLabel("Antwort des Sprachmodells")
    .fill(
      await readFile(
        new URL("../src/llm/fixtures/valid-three-leads.txt", import.meta.url),
        "utf8",
      ),
    );
  await page.getByRole("button", { name: "Antwort einlesen" }).click();
  await page.getByRole("link", { name: "Zu den Leads" }).click();
  await h1();
  await shot("project-leads-3");
  await page
    .getByRole("button", { name: /^Löschen: Lead / })
    .first()
    .click();
  await page.getByRole("alert").waitFor();
  await shot("project-leads-3-confirm");

  // A second project whose answer is still pending (status chip).
  await createProject("Praktikum im Marketing", "https://example.org/jobs/7");
  await go("#/", "home");
  await context.close();
}
await browser.close();
