import type { Page } from "@playwright/test";
import {
  captureDownload,
  docxText,
  expect,
  PROFILE,
  pdfFile,
  test,
} from "./fixtures";
import {
  addProjectLink,
  createProject,
  createProjectWithLeads,
  fillProfile,
  gotoLeadStep,
  gotoProjectStep,
  openLead,
  releaseLead,
  uploadCvPdf,
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

const LINK_FIELDS = {
  "Eingegebener Link zur Anzeige": "https://jobs.example.net/viewjob?jk=abc123",
  "Original-Ausschreibung des Unternehmens":
    "https://karriere.example.org/stellen/industriekaufmann-2027",
  Bewerbungsportal:
    "https://karriere.example.org/bewerben/industriekaufmann-2027",
  "Website des Unternehmens": "https://example.org",
} as const;

const INVALID_URL_MESSAGE =
  "Bitte gib einen vollständigen Link ein, der mit https:// oder http:// beginnt.";

async function openSourcesLead(page: Page): Promise<void> {
  await createProjectWithLeads(page, "valid-original-sources");
  await openLead(page, "Beispiel GmbH");
  await gotoLeadStep(page, "Prüfen");
}

test("C3 feedback: the prompt carries the original-posting and source rules (R2, R3)", async ({
  page,
}) => {
  await createProject(page, "Ausbildung zum Industriekaufmann");
  await addProjectLink(page, "https://example.org/stellen/123");
  await page.getByRole("link", { name: "Weiter zum Prompt" }).click();
  const prompt = page.getByLabel("Vollständiger Prompt");
  await expect(prompt).toBeVisible();
  for (const text of [
    "originalPostingUrl",
    "Karriereseite",
    "nur an, wenn du sicher bist",
    "recherchiere Anschrift und Website",
    '"sources"',
  ]) {
    await expect(prompt).toContainText(text);
  }
});

test("C3 feedback: pasted links fill the Links block with working open links (R1-R3)", async ({
  page,
}) => {
  await openSourcesLead(page);
  const links = page.getByRole("group", { name: "Links", exact: true });
  await expect(links).toBeVisible();

  // The Links block comes before all other groups of the review form.
  const groupNames = await page
    .locator("form fieldset")
    .evaluateAll((sets) =>
      sets.map((set) => set.querySelector("legend")?.textContent ?? ""),
    );
  expect(groupNames[0]).toBe("Links");
  expect(groupNames).toContain("Stelle");
  expect(groupNames.indexOf("Links")).toBeLessThan(
    groupNames.indexOf("Stelle"),
  );

  for (const [label, value] of Object.entries(LINK_FIELDS)) {
    await expect(links.getByLabel(label, { exact: true })).toHaveValue(value);
  }
  const expectedSources = [
    "https://karriere.example.org/stellen/industriekaufmann-2027",
    "https://example.org/impressum",
    "https://example.org/ueber-uns",
  ];
  for (const [index, url] of expectedSources.entries()) {
    await expect(
      links.getByLabel(`Link der Quelle ${index + 1}`, { exact: true }),
    ).toHaveValue(url);
    await expect(
      links.getByLabel(`Titel der Quelle ${index + 1} (optional)`, {
        exact: true,
      }),
    ).toBeVisible();
  }
  await expect(
    links.getByLabel("Link der Quelle 4", { exact: true }),
  ).toHaveCount(0);

  // Every "Öffnen" link opens the field's value in a new, isolated tab.
  const openLinks = links.getByRole("link", { name: /^Öffnen: / });
  await expect(openLinks).toHaveCount(
    Object.keys(LINK_FIELDS).length + expectedSources.length,
  );
  const hrefs: string[] = [];
  for (const link of await openLinks.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    hrefs.push((await link.getAttribute("href")) ?? "");
  }
  expect(hrefs).toEqual([...Object.values(LINK_FIELDS), ...expectedSources]);
});

test("C3 feedback: links can be edited, extended and removed, and survive a reload (R1)", async ({
  page,
}) => {
  await openSourcesLead(page);
  const links = page.getByRole("group", { name: "Links", exact: true });
  const portal = "https://karriere.example.org/bewerben/neu";
  await links.getByLabel("Bewerbungsportal", { exact: true }).fill(portal);

  await links.getByRole("button", { name: "Quelle hinzufügen" }).click();
  const newUrl = links.getByLabel("Link der Quelle 4", { exact: true });
  await expect(newUrl).toBeFocused();
  await newUrl.fill("https://example.org/karriere");
  await links
    .getByLabel("Titel der Quelle 4 (optional)", { exact: true })
    .fill("Karriere");

  await links.getByRole("button", { name: "Entfernen: Quelle 2" }).click();
  await expect(
    links.getByRole("button", { name: "Quelle hinzufügen" }),
  ).toBeFocused();
  await expect(
    links.getByLabel("Link der Quelle 4", { exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Lead speichern" }).click();
  await expect(page.getByRole("status")).toContainText("Gespeichert.");

  await page.reload();
  await gotoLeadStep(page, "Prüfen");
  const again = page.getByRole("group", { name: "Links", exact: true });
  await expect(
    again.getByLabel("Bewerbungsportal", { exact: true }),
  ).toHaveValue(portal);
  const order = [
    "https://karriere.example.org/stellen/industriekaufmann-2027",
    "https://example.org/ueber-uns",
    "https://example.org/karriere",
  ];
  for (const [index, url] of order.entries()) {
    await expect(
      again.getByLabel(`Link der Quelle ${index + 1}`, { exact: true }),
    ).toHaveValue(url);
  }
  await expect(
    again.getByLabel("Link der Quelle 4", { exact: true }),
  ).toHaveCount(0);
});

test("C3 feedback: an invalid link is reported and nothing is saved (FR-050)", async ({
  page,
}) => {
  await openSourcesLead(page);
  const links = page.getByRole("group", { name: "Links", exact: true });
  const field = links.getByLabel("Original-Ausschreibung des Unternehmens", {
    exact: true,
  });
  await field.fill("kaputt");
  await page.getByRole("button", { name: "Lead speichern" }).click();

  await expect(field).toHaveAttribute("aria-invalid", "true");
  const error = links.getByText(INVALID_URL_MESSAGE);
  await expect(error).toBeVisible();
  const errorId = await error.getAttribute("id");
  expect(errorId).toBeTruthy();
  await expect(field).toHaveAttribute("aria-describedby", errorId ?? "");
  await expect(page.getByRole("alert")).toBeVisible();

  await page.reload();
  await gotoLeadStep(page, "Prüfen");
  await expect(
    page
      .getByRole("group", { name: "Links", exact: true })
      .getByLabel("Original-Ausschreibung des Unternehmens", { exact: true }),
  ).toHaveValue(LINK_FIELDS["Original-Ausschreibung des Unternehmens"]);
});

test("C3 feedback: a released lead shows its links read-only (R1)", async ({
  page,
}) => {
  await fillProfile(page, PROFILE);
  await uploadCvPdf(page, await pdfFile("Lebenslauf.pdf", 1, { width: 600 }));
  await createProjectWithLeads(page, "valid-original-sources");
  await openLead(page, "Beispiel GmbH");
  await releaseLead(page, await pdfFile("Anschreiben.pdf", 1, { width: 500 }));
  await gotoLeadStep(page, "Prüfen");

  const links = page.getByRole("group", { name: "Links", exact: true });
  await expect(links).toBeVisible();
  await expect(links.getByRole("textbox")).toHaveCount(0);
  const openLinks = links.getByRole("link", { name: /^Öffnen: / });
  await expect(openLinks).toHaveCount(7);
  await expect(openLinks.first()).toHaveAttribute("target", "_blank");
});

test("C3 feedback: data from version 1 opens and is upgraded to version 2 (FR-053)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Seed the version 1 layout only once; later loads see the upgraded database.
    if (sessionStorage.getItem("kandidu-e2e-seeded")) return;
    sessionStorage.setItem("kandidu-e2e-seeded", "1");
    const request = indexedDB.open("kandidu:data", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("meta");
      db.createObjectStore("profile");
      db.createObjectStore("templates");
      db.createObjectStore("documents", { keyPath: "id" });
      db.createObjectStore("projects", { keyPath: "id" });
      const leads = db.createObjectStore("leads", { keyPath: "id" });
      leads.createIndex("projectId", "projectId");
      db.createObjectStore("files", { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(["meta", "projects", "leads"], "readwrite");
      tx.objectStore("meta").put({ schemaVersion: 1, revision: 3 }, "meta");
      tx.objectStore("projects").put({
        id: "p1",
        title: "Ausbildung zum Industriekaufmann",
        links: [{ id: "l1", url: "https://example.org/stellen/123" }],
        promptContext: "",
        promptState: "answered",
        promptCopiedAt: "2026-10-18T10:05:00.000Z",
        responses: [],
        responseDraft: "",
        createdAt: "2026-10-18T10:00:00.000Z",
        updatedAt: "2026-10-18T10:10:00.000Z",
      });
      tx.objectStore("leads").put({
        id: "lead1",
        projectId: "p1",
        responseId: "r1",
        responseIndex: 0,
        sourceUrl: "https://example.org/stellen/123",
        position: { title: "Ausbildung zum Industriekaufmann (m/w/d)" },
        company: {
          name: "Beispiel GmbH",
          website: "https://example.org",
          address: {
            street: "Hauptstraße 5",
            postalCode: "54321",
            city: "Beispielstadt",
          },
        },
        application: {
          channel: "portal",
          portalUrl: "https://jobs.example.org/bewerben/123",
        },
        process: "",
        research: "Die Beispiel GmbH stellt Beispiele her.",
        motivation: "Absatz eins.\n\nAbsatz zwei.",
        status: "review",
        history: [
          { id: "h1", status: "review", at: "2026-10-18T10:10:00.000Z" },
        ],
        comments: [],
        packages: [],
        createdAt: "2026-10-18T10:10:00.000Z",
        updatedAt: "2026-10-18T10:10:00.000Z",
      });
      tx.oncomplete = () => db.close();
    };
  });

  await page.goto("/");
  await page
    .getByRole("link", { name: /Ausbildung zum Industriekaufmann/ })
    .first()
    .click();
  await projectStep(page, "Leads");
  await openLead(page, "Beispiel GmbH");
  await gotoLeadStep(page, "Prüfen");
  await expect(
    page
      .getByRole("group", { name: "Links", exact: true })
      .getByLabel("Bewerbungsportal", { exact: true }),
  ).toHaveValue("https://jobs.example.org/bewerben/123");

  const upgraded = await page.evaluate(
    () =>
      new Promise<{ version: number; schemaVersion: number }>(
        (resolve, reject) => {
          const request = indexedDB.open("kandidu:data");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const get = db.transaction("meta").objectStore("meta").get("meta");
            get.onerror = () => reject(get.error);
            get.onsuccess = () => {
              const version = db.version;
              db.close();
              resolve({ version, schemaVersion: get.result.schemaVersion });
            };
          };
        },
      ),
  );
  expect(upgraded).toEqual({ version: 2, schemaVersion: 2 });
});
