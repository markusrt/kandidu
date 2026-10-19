import type { Page } from "@playwright/test";
import { zipFiles } from "../src/files/zip";
import {
  captureDownload,
  expect,
  PROFILE,
  pdfPageCount,
  test,
  type UploadFile,
  watchRequests,
  zipEntries,
} from "./fixtures";
import {
  createProject,
  gotoLeadStep,
  gotoProjectStep,
  openHome,
  openLead,
  profileLabel,
  setupReleasedLead,
} from "./flows";

// C2 backup export and import (User Story 5): file name, personal-data
// notice, confirmation, invalid and newer backups, import from recovery.

const BACKUP_NAME = /^\d{4}-\d{2}-\d{2}_Kandidu_Sicherung\.zip$/;

async function exportBackup(
  page: Page,
): Promise<{ name: string; bytes: Uint8Array }> {
  await page.goto("/#/daten");
  return captureDownload(page, () =>
    page.getByRole("button", { name: "Sicherung herunterladen" }).click(),
  );
}

const zipUpload = (name: string, bytes: Uint8Array): UploadFile => ({
  name,
  mimeType: "application/zip",
  buffer: Buffer.from(bytes),
});

async function importBackup(page: Page, file: UploadFile): Promise<void> {
  await page.getByLabel("Sicherungs-ZIP auswählen").setInputFiles(file);
}

/** The backup with its manifest changed by `edit`. */
function withManifest(
  bytes: Uint8Array,
  edit: (manifest: Record<string, unknown>) => void,
): Uint8Array {
  const entries = zipEntries(bytes);
  const manifest = JSON.parse(
    new TextDecoder().decode(entries.get("kandidu-backup.json")),
  ) as Record<string, unknown>;
  edit(manifest);
  entries.set(
    "kandidu-backup.json",
    new TextEncoder().encode(JSON.stringify(manifest)),
  );
  return zipFiles(
    [...entries].map(([name, content]) => ({
      name,
      bytes: content,
      compress: false,
    })),
  );
}

async function projectTitles(page: Page): Promise<string[]> {
  await openHome(page);
  return page
    .getByRole("region", { name: "Projekte" })
    .getByRole("listitem")
    .getByRole("link")
    .allTextContents();
}

interface LeadSnapshot {
  readonly profile: Record<string, string>;
  readonly positionTitle: string;
  readonly entries: string[];
  readonly pdfPages: Record<string, number>;
}

/** Reads the profile and the released lead through the UI, then its package. */
async function snapshotReleasedLead(page: Page): Promise<LeadSnapshot> {
  await page.goto("/#/einrichtung/profil");
  const profile: Record<string, string> = {};
  for (const label of Object.keys(PROFILE)) {
    const field = page.getByLabel(profileLabel(label));
    await expect(field).not.toHaveValue("");
    profile[label] = await field.inputValue();
  }

  await openHome(page);
  await page
    .getByRole("region", { name: "Projekte" })
    .getByRole("link", { name: "Ausbildung zum Industriekaufmann" })
    .click();
  await gotoProjectStep(page, "Leads");
  await openLead(page, "Beispiel GmbH");
  const title = page.getByLabel(/^Stellenbezeichnung/);
  await expect(title).not.toHaveValue("");
  const positionTitle = await title.inputValue();

  await gotoLeadStep(page, "Freigabe");
  await expect(page.getByText("Status: Bereit zum Versenden")).toBeVisible();

  await gotoLeadStep(page, "Paket");
  const zip = await captureDownload(page, () =>
    page.getByRole("button", { name: "ZIP herunterladen" }).click(),
  );
  const files = zipEntries(zip.bytes);
  const pdfPages: Record<string, number> = {};
  for (const [name, bytes] of files) {
    if (name.toLowerCase().endsWith(".pdf")) {
      pdfPages[name] = await pdfPageCount(bytes);
    }
  }
  return {
    profile,
    positionTitle,
    entries: [...files.keys()].sort(),
    pdfPages,
  };
}

test("C2 backup: a full C1 state survives export and import into a fresh browser", async ({
  page,
  browser,
  networkGuard,
}, testInfo) => {
  await setupReleasedLead(page, { cvPages: 2, coverPages: 1 });
  const before = await snapshotReleasedLead(page);
  expect(before.positionTitle).toBe("Ausbildung zum Industriekaufmann (m/w/d)");
  // One package PDF: cover letter (1 page) + CV (2 pages).
  expect(Object.values(before.pdfPages)).toEqual([3]);
  const backup = await exportBackup(page);

  const fresh = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    locale: "de-DE",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  try {
    const other = await fresh.newPage();
    watchRequests(other, networkGuard);
    await openHome(other);
    await expect(other.getByText("Noch keine Projekte.")).toBeVisible();

    await other.goto("/#/daten");
    await importBackup(other, zipUpload(backup.name, backup.bytes));
    await expect(other.getByRole("status")).toContainText(
      "Sicherung importiert.",
    );
    // An empty Kandidu has nothing to replace, so nothing is asked.
    await expect(
      other.getByRole("button", { name: "Ja, aktuellen Stand ersetzen" }),
    ).toHaveCount(0);

    expect(await snapshotReleasedLead(other)).toEqual(before);
  } finally {
    await fresh.close();
  }
});

test("C2 backup: export is named by date, marked as personal and explains itself", async ({
  page,
}) => {
  await createProject(page, "Gesichertes Projekt");
  await page.goto("/#/daten");
  await expect(
    page.getByText(/Die Sicherung enthält persönliche Daten/),
  ).toBeVisible();
  const backup = await exportBackup(page);
  expect(backup.name).toMatch(BACKUP_NAME);
  await expect(page.getByRole("status")).toContainText(
    `${backup.name} heruntergeladen.`,
  );
  const entries = zipEntries(backup.bytes);
  expect(entries.has("kandidu-backup.json")).toBe(true);
  const readme = new TextDecoder().decode(entries.get("LIESMICH.txt"));
  expect(readme).toContain("persönliche Daten");
  expect(readme).toContain("Sicherung importieren");
});

test("C2 backup: import asks before replacing, and invalid or newer backups change nothing", async ({
  page,
}) => {
  await createProject(page, "Stand A");
  const backup = await exportBackup(page);
  await createProject(page, "Stand B");
  await page.goto("/#/daten");

  // Cancel keeps the current data.
  await importBackup(page, zipUpload(backup.name, backup.bytes));
  await expect(
    page.getByText(/Sollen sie vollständig durch die Sicherung/),
  ).toContainText(backup.name);
  await page.getByRole("button", { name: "Abbrechen" }).click();
  expect(await projectTitles(page)).toEqual(["Stand B", "Stand A"]);

  // Not a backup at all.
  await page.goto("/#/daten");
  await importBackup(
    page,
    zipUpload("keine-sicherung.zip", new TextEncoder().encode("kein zip")),
  );
  await page
    .getByRole("button", { name: "Ja, aktuellen Stand ersetzen" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "keine Kandidu-Sicherung. Es wurde nichts geändert.",
  );

  // A backup from a newer version gets its own explanation.
  const newer = withManifest(backup.bytes, (manifest) => {
    manifest.formatVersion = 99;
  });
  await importBackup(page, zipUpload("neuer.zip", newer));
  await page
    .getByRole("button", { name: "Ja, aktuellen Stand ersetzen" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "neueren Kandidu-Version",
  );
  expect(await projectTitles(page)).toEqual(["Stand B", "Stand A"]);

  // Confirmed: the backup replaces everything.
  await page.goto("/#/daten");
  await importBackup(page, zipUpload(backup.name, backup.bytes));
  await page
    .getByRole("button", { name: "Ja, aktuellen Stand ersetzen" })
    .click();
  await expect(page.getByRole("status")).toContainText("Sicherung importiert.");
  expect(await projectTitles(page)).toEqual(["Stand A"]);
});

test("C2 backup: the recovery view imports a backup over damaged data", async ({
  page,
}) => {
  await createProject(page, "Vor dem Schaden");
  const backup = await exportBackup(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("kandidu:data");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("projects", "readwrite");
          tx.objectStore("projects").put({ id: "kaputt", title: 42 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Gespeicherte Daten konnten nicht gelesen werden",
  );
  await importBackup(page, zipUpload(backup.name, backup.bytes));
  await page
    .getByRole("button", { name: "Ja, aktuellen Stand ersetzen" })
    .click();
  await expect(page.getByRole("status")).toContainText("Sicherung importiert.");
  expect(await projectTitles(page)).toEqual(["Vor dem Schaden"]);
});
