import type { Page } from "@playwright/test";
import { splitRuns } from "../src/files/testing/docxFixture";
import { docxFile, expect, PROFILE, pdfFile, test } from "./fixtures";
import {
  createProjectWithLeads,
  fillProfile,
  gotoLeadStep,
  gotoProjectStep,
  openHome,
  openLead,
  releaseLead,
  uploadCvPdf,
} from "./flows";

// C3 manage journey (User Story 7, FR-036, FR-037, SC-011): overview, filter
// and sort, deleting leads and projects, focus handling, 360 px layout.

interface StoredLead {
  id: string;
  projectId: string;
  company: { name: string };
  coverLetterPdf?: { fileId: string };
}

interface StoredDocument {
  id: string;
  role: string;
  fileId: string;
}

interface Dump {
  leads: StoredLead[];
  projects: { id: string; title: string }[];
  documents: StoredDocument[];
  profileKeys: string[];
  fileKeys: string[];
}

/** Reads the whole IndexedDB database as the app left it. */
async function dumpDatabase(page: Page): Promise<Dump> {
  return page.evaluate(
    () =>
      new Promise<Dump>((resolve, reject) => {
        const open = indexedDB.open("kandidu:data");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(
            ["leads", "projects", "documents", "profile", "files"],
            "readonly",
          );
          const result: Partial<Dump> = {};
          const all = <T>(store: string, key: keyof Dump, keysOnly = false) => {
            const request = keysOnly
              ? tx.objectStore(store).getAllKeys()
              : tx.objectStore(store).getAll();
            request.onsuccess = () => {
              (result as Record<string, unknown>)[key] = keysOnly
                ? (request.result as IDBValidKey[]).map(String)
                : (request.result as T[]);
            };
          };
          all("leads", "leads");
          all("projects", "projects");
          all("documents", "documents");
          all("profile", "profileKeys", true);
          all("files", "fileKeys", true);
          tx.onerror = () => reject(tx.error);
          tx.oncomplete = () => {
            db.close();
            resolve(result as Dump);
          };
        };
      }),
  );
}

function leadByCompany(dump: Dump, company: string, projectId?: string) {
  const lead = dump.leads.find(
    (l) =>
      l.company.name === company && (!projectId || l.projectId === projectId),
  );
  expect(lead, `stored lead ${company}`).toBeTruthy();
  return lead as StoredLead;
}

function projectByTitle(dump: Dump, title: string) {
  const project = dump.projects.find((p) => p.title === title);
  expect(project, `stored project ${title}`).toBeTruthy();
  return project as { id: string; title: string };
}

async function activeElementIsBody(page: Page): Promise<boolean> {
  return page.evaluate(() => document.activeElement === document.body);
}

async function backToLeads(page: Page, project: string): Promise<void> {
  await page
    .getByRole("link", { name: `Zurück zu den Leads von „${project}“` })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Leads");
}

async function openProjectLeads(page: Page, title: string): Promise<void> {
  await openHome(page);
  await page.getByRole("link", { name: title, exact: true }).click();
  await gotoProjectStep(page, "Leads");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Leads");
}

async function changeStatus(
  page: Page,
  label: string,
  date: string,
): Promise<void> {
  await page.getByLabel("Datum des Statuswechsels").fill(date);
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.getByText(`Status: ${label}`)).toBeVisible();
}

async function addOnsiteInterview(
  page: Page,
  dateTime: string,
  place: string,
): Promise<void> {
  await page.getByLabel("Datum und Uhrzeit").fill(dateTime);
  await page.getByRole("radio", { name: "Vor Ort" }).check();
  await page.getByLabel("Ort", { exact: true }).fill(place);
  await page.getByRole("button", { name: "Einladung eintragen" }).click();
  await expect(page.getByText("Status: Einladung zum Gespräch")).toBeVisible();
}

/** Releases the lead, marks it sent and records an interview invitation. */
async function releaseSendAndInvite(
  page: Page,
  company: string,
  project: string,
  interview: string,
): Promise<void> {
  await openLead(page, company);
  await releaseLead(page, await pdfFile("Anschreiben.pdf", 1, { width: 500 }));
  await gotoLeadStep(page, "Verlauf");
  await changeStatus(page, "Versendet", "2027-03-01");
  await addOnsiteInterview(page, interview, "Hauptstraße 5");
  await backToLeads(page, project);
}

const companies = (page: Page) =>
  page.locator("tbody tr:not(.confirm-row) td:first-child");

async function setupProfileAndCv(page: Page): Promise<void> {
  await fillProfile(page, PROFILE);
  await uploadCvPdf(page, await pdfFile("Lebenslauf.pdf", 1, { width: 600 }));
}

test("C3 manage: overview counts, filter and both sort orders (FR-036)", async ({
  page,
}) => {
  await setupProfileAndCv(page);
  await createProjectWithLeads(page, "valid-three-leads", "Projekt A");
  await createProjectWithLeads(page, "valid-plain", "Projekt B");

  await openProjectLeads(page, "Projekt A");
  // Activity order: Probe KG first changed, Beispiel GmbH last.
  await openLead(page, "Probe KG");
  await gotoLeadStep(page, "Verlauf");
  await changeStatus(page, "Zurückgezogen", "2027-03-05");
  await backToLeads(page, "Projekt A");
  await releaseSendAndInvite(
    page,
    "Muster AG",
    "Projekt A",
    "2099-03-15T10:00",
  );
  await releaseSendAndInvite(
    page,
    "Beispiel GmbH",
    "Projekt A",
    "2099-06-10T10:00",
  );

  // Home: per-status counts and the earliest upcoming interview.
  await openHome(page);
  const counts = page.getByRole("list", {
    name: "Leads nach Status: Projekt A",
  });
  await expect(counts.getByRole("listitem")).toHaveText([
    "Einladung zum Gespräch: 2",
    "Zurückgezogen: 1",
  ]);
  const countsB = page.getByRole("list", {
    name: "Leads nach Status: Projekt B",
  });
  await expect(countsB.getByRole("listitem")).toHaveText([
    "Review (Entwurf): 1",
  ]);
  const next = page.getByText(/Nächster Gesprächstermin/);
  await expect(next).toHaveCount(1);
  await expect(next).toContainText("15. März 2099");

  // Lead list: default order is the latest activity first.
  await page.getByRole("link", { name: "Projekt A", exact: true }).click();
  await gotoProjectStep(page, "Leads");
  await expect(page.getByText("3 Leads", { exact: true })).toBeVisible();
  await expect(companies(page)).toHaveText([
    "Beispiel GmbH",
    "Muster AG",
    "Probe KG",
  ]);

  // The earliest interview first, leads without an interview last.
  await page
    .getByLabel("Sortieren nach")
    .selectOption({ label: "Nächstem Termin (früheste zuerst)" });
  await expect(companies(page)).toHaveText([
    "Muster AG",
    "Beispiel GmbH",
    "Probe KG",
  ]);
  await page
    .getByLabel("Sortieren nach")
    .selectOption({ label: "Letzter Aktivität (neueste zuerst)" });
  await expect(companies(page)).toHaveText([
    "Beispiel GmbH",
    "Muster AG",
    "Probe KG",
  ]);

  // Filter by status.
  const filter = page.getByLabel("Status anzeigen");
  await filter.selectOption({ label: "Einladung zum Gespräch" });
  await expect(page.getByText("2 von 3 Leads")).toBeVisible();
  await expect(companies(page)).toHaveText(["Beispiel GmbH", "Muster AG"]);
  await filter.selectOption({ label: "Zurückgezogen" });
  await expect(page.getByText("1 von 3 Leads")).toBeVisible();
  await expect(companies(page)).toHaveText(["Probe KG"]);
  await filter.selectOption({ label: "Versendet" });
  await expect(page.getByText("0 von 3 Leads")).toBeVisible();
  await expect(page.getByText("Keine Leads mit diesem Status.")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await filter.selectOption({ label: "Alle" });
  await expect(companies(page)).toHaveCount(3);
});

test("C3 manage: deleting a lead removes it and its cover letter file (FR-037, SC-011)", async ({
  page,
}) => {
  await setupProfileAndCv(page);
  await createProjectWithLeads(page, "valid-three-leads", "Projekt A");
  for (const company of ["Beispiel GmbH", "Muster AG"]) {
    await openLead(page, company);
    await releaseLead(
      page,
      await pdfFile("Anschreiben.pdf", 1, { width: 500 }),
    );
    await backToLeads(page, "Projekt A");
  }

  const before = await dumpDatabase(page);
  const doomed = leadByCompany(before, "Beispiel GmbH");
  const kept = leadByCompany(before, "Muster AG");
  const doomedFile = doomed.coverLetterPdf?.fileId ?? "";
  const keptFile = kept.coverLetterPdf?.fileId ?? "";
  expect(doomedFile).toBeTruthy();
  expect(before.fileKeys).toContain(doomedFile);
  expect(before.fileKeys).toContain(keptFile);

  const deleteButton = page.getByRole("button", {
    name: "Löschen: Lead Beispiel GmbH",
  });

  // Cancel keeps the lead and returns focus to the row's button.
  await deleteButton.click();
  await expect(page.getByRole("alert")).toContainText("Beispiel GmbH");
  await expect(page.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(deleteButton).toBeFocused();
  await expect(companies(page)).toHaveCount(3);
  expect(leadByCompany(await dumpDatabase(page), "Beispiel GmbH").id).toBe(
    doomed.id,
  );

  // Confirm removes the row, announces it and moves focus to the heading.
  await deleteButton.click();
  await page.getByRole("button", { name: "Ja, Lead löschen" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Lead „Beispiel GmbH“ gelöscht.",
  );
  await expect(companies(page)).toHaveText(["Muster AG", "Probe KG"]);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  const after = await dumpDatabase(page);
  expect(after.leads.map((l) => l.id)).not.toContain(doomed.id);
  expect(after.fileKeys).not.toContain(doomedFile);
  expect(after.leads.map((l) => l.id)).toContain(kept.id);
  expect(after.fileKeys).toContain(keptFile);
  expect(after.leads).toHaveLength(before.leads.length - 1);
  expect(after.projects).toHaveLength(1);

  await page.reload();
  await expect(companies(page)).toHaveCount(2);
});

test("C3 manage: deleting a project removes its leads and files, keeps the rest (FR-037, SC-011)", async ({
  page,
}) => {
  await setupProfileAndCv(page);
  await createProjectWithLeads(page, "valid-plain", "Projekt A");
  await openLead(page, "Beispiel GmbH");
  await releaseLead(page, await pdfFile("Anschreiben.pdf", 1, { width: 500 }));
  await createProjectWithLeads(page, "valid-three-leads", "Projekt B");
  await openLead(page, "Muster AG");
  await releaseLead(page, await pdfFile("Anschreiben.pdf", 1, { width: 500 }));

  const before = await dumpDatabase(page);
  const projectA = projectByTitle(before, "Projekt A");
  const projectB = projectByTitle(before, "Projekt B");
  const leadA = leadByCompany(before, "Beispiel GmbH", projectA.id);
  const leadB = leadByCompany(before, "Muster AG", projectB.id);
  const fileA = leadA.coverLetterPdf?.fileId ?? "";
  const fileB = leadB.coverLetterPdf?.fileId ?? "";
  const cv = before.documents.find((d) => d.role === "cv");
  expect(fileA).toBeTruthy();
  expect(cv).toBeTruthy();
  expect(before.profileKeys.length).toBeGreaterThan(0);

  await openHome(page);
  const deleteButton = page.getByRole("button", {
    name: "Löschen: Projekt Projekt A",
  });
  await deleteButton.click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("1 Lead");
  await expect(alert).toContainText("1 gespeicherte Antwort");
  await expect(page.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(deleteButton).toBeFocused();
  await expect(
    page.getByRole("link", { name: "Projekt A", exact: true }),
  ).toBeVisible();
  expect(projectByTitle(await dumpDatabase(page), "Projekt A").id).toBe(
    projectA.id,
  );

  await deleteButton.click();
  await page.getByRole("button", { name: "Ja, Projekt löschen" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Projekt „Projekt A“ gelöscht.",
  );
  await expect(
    page.getByRole("link", { name: "Projekt A", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Projekte" }),
  ).toBeFocused();

  const after = await dumpDatabase(page);
  expect(after.projects.map((p) => p.id)).toEqual([projectB.id]);
  expect(after.leads.some((l) => l.projectId === projectA.id)).toBe(false);
  expect(after.fileKeys).not.toContain(fileA);
  expect(after.leads.filter((l) => l.projectId === projectB.id)).toHaveLength(
    3,
  );
  expect(after.fileKeys).toContain(fileB);
  expect(after.profileKeys).toEqual(before.profileKeys);
  const cvAfter = after.documents.find((d) => d.role === "cv");
  expect(cvAfter?.id).toBe(cv?.id);
  expect(after.fileKeys).toContain(cv?.fileId);
});

test("C3 manage: the lead page links back to the project's lead list", async ({
  page,
}) => {
  await createProjectWithLeads(page, "valid-three-leads", "Projekt A");
  await openLead(page, "Muster AG");
  await expect(
    page.getByRole("heading", { name: "Lead prüfen und bearbeiten" }),
  ).toBeVisible();
  await backToLeads(page, "Projekt A");
  await expect(companies(page)).toHaveCount(3);
  await expect(page).toHaveURL(/#\/projekte\/[^/]+\/leads$/);
});

test("C3 manage: focus after deleting evidence or removing a template (FR-037)", async ({
  page,
}) => {
  // Evidence PDF.
  await page.goto("/#/einrichtung/nachweise");
  await page
    .getByLabel("PDF-Datei")
    .setInputFiles(await pdfFile("Zeugnis.pdf", 1, { width: 500 }));
  await page.getByRole("button", { name: "Hochladen" }).click();
  await expect(page.getByRole("status")).toContainText("Nachweis gespeichert.");

  const deleteEvidence = page.getByRole("button", { name: "Löschen …" });
  await deleteEvidence.click();
  await expect(page.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(deleteEvidence).toBeFocused();

  await deleteEvidence.click();
  await page.getByRole("button", { name: "Ja, löschen" }).click();
  await expect(page.getByRole("status")).toContainText("Nachweis gelöscht.");
  await expect(
    page.getByRole("heading", { level: 2, name: "Gespeicherte Nachweise" }),
  ).toBeFocused();
  expect(await activeElementIsBody(page)).toBe(false);

  // Own cover letter template.
  await page.goto("/#/einrichtung/vorlagen");
  const cover = page.getByRole("region", { name: "Anschreiben", exact: true });
  await cover
    .getByLabel("Eigene Vorlage für Anschreiben hochladen (.docx)")
    .setInputFiles(
      docxFile("Mein_Anschreiben.docx", [
        splitRuns("{Briefanrede}", 4, 5),
        ["{#Motivation}"],
        ["{Absatz}"],
        ["{/Motivation}"],
        splitRuns("{Firma}", 3, 3),
        splitRuns("{Vorname}", 4, 4),
      ]),
    );
  await expect(page.getByRole("status")).toContainText(
    "Vorlage geprüft und gespeichert.",
  );

  const removeTemplate = cover.getByRole("button", {
    name: "Eigene Vorlage entfernen",
  });
  await removeTemplate.click();
  await expect(cover.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await cover.getByRole("button", { name: "Abbrechen" }).click();
  await expect(removeTemplate).toBeFocused();

  await removeTemplate.click();
  await cover.getByRole("button", { name: "Bestätigen" }).click();
  await expect(cover).toContainText("Aktiv: Demo-Vorlage");
  await expect(
    cover.getByRole("heading", { level: 2, name: "Anschreiben" }),
  ).toBeFocused();
  expect(await activeElementIsBody(page)).toBe(false);
});

test.describe("C3 manage: mobile", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  async function expectNoHorizontalScroll(page: Page, view: string) {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The file picker's text width depends on the platform's fonts; widen it
    // so the check does not depend on the machine (see c2-mobile.spec.ts).
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

  test("C3 manage: home with status counts and the lead list fit 360 px", async ({
    page,
  }) => {
    await createProjectWithLeads(
      page,
      "valid-three-leads",
      "Ausbildung zum Industriekaufmann bei einem sehr großen Unternehmen",
    );
    await expect(companies(page)).toHaveCount(3);
    await expectNoHorizontalScroll(page, "lead list");

    await openHome(page);
    await expect(
      page.getByRole("list", { name: /^Leads nach Status: / }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page, "home");
  });
});
