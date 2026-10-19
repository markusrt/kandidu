import type { Page } from "@playwright/test";
import { expect, PROFILE, test, watchRequests } from "./fixtures";
import {
  addProjectLink,
  copyPrompt,
  createProject,
  openHome,
  profileLabel,
} from "./flows";

// C2 pause/resume and failure handling (User Story 4): browser restart,
// failed writes, damaged data, storage quota, persistence and two tabs.

const DRAFT = '```json\n{\n  "leads": [\n    { "company": { "name": "Halb';

/**
 * Makes `IDBObjectStore.prototype.put` throw while `window.__kandiduFail` is
 * set: "quota" → QuotaExceededError, "error" → UnknownError.
 */
async function injectWriteFailures(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as { __kandiduFail?: string };
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      const mode = target.__kandiduFail;
      if (mode) {
        throw new DOMException(
          "injected failure",
          mode === "quota" ? "QuotaExceededError" : "UnknownError",
        );
      }
      return put.apply(this, args);
    };
  });
}

const setFailure = (page: Page, mode: "quota" | "error" | undefined) =>
  page.evaluate((value) => {
    (window as unknown as { __kandiduFail?: string }).__kandiduFail = value;
  }, mode);

test("C2 resume: a copied prompt and the pasted draft survive a browser restart", async ({
  page,
  browser,
  networkGuard,
}, testInfo) => {
  await createProject(page, "Pausiertes Projekt");
  await addProjectLink(page, "https://example.org/stellen/pause");
  await page.getByRole("link", { name: "Weiter zum Prompt" }).click();
  await copyPrompt(page);
  await page.getByRole("link", { name: "Weiter zur Antwort" }).click();
  await page.getByLabel("Antwort des Sprachmodells").fill(DRAFT);
  await expect(page.getByText("Entwurf gespeichert.")).toBeVisible();

  // A new browser context with the stored state stands in for a restart.
  const storageState = await page.context().storageState({ indexedDB: true });
  await page.context().close();
  const restarted = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    locale: "de-DE",
    storageState,
  });
  try {
    const again = await restarted.newPage();
    watchRequests(again, networkGuard);
    await openHome(again);
    const row = again
      .getByRole("listitem")
      .filter({ has: again.getByRole("link", { name: "Pausiertes Projekt" }) });
    await expect(row.getByText("Antwort ausstehend")).toBeVisible();
    await row.getByRole("link", { name: "Pausiertes Projekt" }).click();
    await expect(again.getByRole("heading", { level: 1 })).toHaveText(
      "Antwort einfügen",
    );
    await expect(again.getByLabel("Antwort des Sprachmodells")).toHaveValue(
      DRAFT,
    );
  } finally {
    await restarted.close();
  }
});

test("C2 recovery: a failed save keeps the input, says nothing was saved and can be retried", async ({
  page,
}) => {
  await injectWriteFailures(page);
  await page.goto("/#/einrichtung/profil");
  for (const [label, value] of Object.entries(PROFILE)) {
    await page.getByLabel(profileLabel(label)).fill(value);
  }
  await setFailure(page, "error");
  await page.getByRole("button", { name: "Speichern" }).click();
  const failure = page
    .getByRole("alert")
    .filter({ hasText: "Nicht gespeichert" });
  await expect(failure).toContainText("Speichern ist fehlgeschlagen");
  await expect(page.getByText("Gespeichert.", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel(profileLabel("Vorname"))).toHaveValue(
    PROFILE.Vorname,
  );

  // Retrying while the store still fails reports the failure again.
  await failure.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(failure).toBeVisible();

  await setFailure(page, undefined);
  await failure.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(failure).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Gespeichert.");
  await page.reload();
  await expect(page.getByLabel(profileLabel("Ort"))).toHaveValue(PROFILE.Ort);
});

test("C2 recovery: a full storage keeps the new project title until it is saved", async ({
  page,
}) => {
  await injectWriteFailures(page);
  await openHome(page);
  const title = page.getByLabel("Titel des Projekts");
  await title.fill("Projekt bei vollem Speicher");
  await setFailure(page, "quota");
  await page.getByRole("button", { name: "Projekt anlegen" }).click();
  const failure = page
    .getByRole("alert")
    .filter({ hasText: "Nicht gespeichert" });
  await expect(failure).toContainText("Speicher dieses Browsers ist voll");

  // Cancel: nothing was created, the title is still there.
  await failure.getByRole("button", { name: "Abbrechen" }).click();
  await expect(failure).toHaveCount(0);
  await expect(page.getByText("Noch keine Projekte.")).toBeVisible();
  await expect(title).toHaveValue("Projekt bei vollem Speicher");

  // Retry after space was freed: the project opens as after a normal save.
  await page.getByRole("button", { name: "Projekt anlegen" }).click();
  await expect(failure).toBeVisible();
  await setFailure(page, undefined);
  await failure.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Links zu Stellenausschreibungen",
  );
  await expect(page.getByLabel("Titel des Projekts")).toHaveValue(
    "Projekt bei vollem Speicher",
  );
});

/** Puts a project record that fails validation straight into IndexedDB. */
async function damageStoredData(page: Page): Promise<void> {
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
}

const damagedRecordExists = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<boolean>((resolve, reject) => {
        const request = indexedDB.open("kandidu:data");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const get = db
            .transaction("projects")
            .objectStore("projects")
            .get("kaputt");
          get.onsuccess = () => {
            db.close();
            resolve(get.result !== undefined);
          };
          get.onerror = () => reject(get.error);
        };
      }),
  );

test("C2 recovery: damaged stored data opens the recovery view and is never overwritten", async ({
  page,
}) => {
  await createProject(page, "Vor dem Schaden");
  await damageStoredData(page);
  await page.reload();

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(
    "Gespeicherte Daten konnten nicht gelesen werden",
  );
  await expect(page.getByText("beschädigt oder unvollständig")).toBeVisible();
  await page.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(heading).toHaveText(
    "Gespeicherte Daten konnten nicht gelesen werden",
  );
  expect(await damagedRecordExists(page)).toBe(true);

  // Reset needs an explicit confirmation; cancelling keeps everything.
  await page
    .getByRole("button", { name: "Kandidu-Daten zurücksetzen …" })
    .click();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  expect(await damagedRecordExists(page)).toBe(true);

  await page
    .getByRole("button", { name: "Kandidu-Daten zurücksetzen …" })
    .click();
  await page
    .getByRole("button", { name: "Ja, alle Kandidu-Daten löschen" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Kandidu wurde zurückgesetzt.",
  );
  await expect(heading).toHaveText("Deine Bewerbungen");
  await expect(page.getByText("Noch keine Projekte.")).toBeVisible();
});

/** Reports `usage` of 1 GB and the given persistence answers. */
async function fakeStorage(
  page: Page,
  usage: number,
  answers: { persisted: boolean; persist: boolean },
): Promise<void> {
  await page.addInitScript(
    ({ usage, answers }) => {
      const quota = 1_000_000_000;
      StorageManager.prototype.estimate = async () => ({ usage, quota });
      StorageManager.prototype.persisted = async () => answers.persisted;
      StorageManager.prototype.persist = async () => answers.persist;
    },
    { usage, answers },
  );
}

test("C2 storage: almost full storage warns before uploads; a denied persistence request is explained", async ({
  page,
}) => {
  await fakeStorage(page, 850_000_000, { persisted: false, persist: false });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link", { name: "Daten" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Daten und Speicher",
  );
  await expect(
    page.getByText(/^Kandidu speichert alles nur in diesem Browser.*Sicherung/),
  ).toBeVisible();
  await expect(page.getByText(/^Belegt: .+ \(85\s%\)\.$/)).toBeVisible();
  await expect(page.getByText("Der Speicher ist fast voll.")).toBeVisible();
  await expect(
    page.getByText("bei Speichermangel von sich aus löschen"),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Speicher dauerhaft anfordern" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "dauerhaften Speicher abgelehnt",
  );

  // Every upload field warns before a file is chosen.
  for (const route of [
    "/#/einrichtung/lebenslauf",
    "/#/einrichtung/vorlagen",
    "/#/einrichtung/nachweise",
  ]) {
    await page.goto(route);
    await expect(
      page.getByText(/Speicher dieses Browsers ist zu 85\s% belegt/).first(),
    ).toBeVisible();
  }
});

test("C2 storage: below 80 % there is no upload warning; granted persistence is shown", async ({
  page,
}) => {
  await fakeStorage(page, 100_000_000, { persisted: false, persist: true });
  await page.goto("/#/daten");
  await expect(page.getByText(/\(10\s%\)/)).toBeVisible();
  await expect(page.getByText("Der Speicher ist fast voll.")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Speicher dauerhaft anfordern" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "dauerhaften Speicher gewährt",
  );
  await expect(page.getByText("Dauerhafter Speicher ist aktiv")).toBeVisible();
  await page.goto("/#/einrichtung/lebenslauf");
  await expect(page.getByLabel("Lebenslauf-PDF hochladen")).toBeVisible();
  await expect(page.getByText(/Speicher dieses Browsers ist zu/)).toHaveCount(
    0,
  );
});

test("C2 multi-tab: a change in another tab asks for a reload and never overwrites silently", async ({
  page,
  networkGuard,
}) => {
  await createProject(page, "Aus Tab A");
  const other = await page.context().newPage();
  watchRequests(other, networkGuard);
  await openHome(other);
  await expect(other.getByRole("link", { name: "Aus Tab A" })).toBeVisible();

  await createProject(page, "Noch eins aus Tab A");
  const bannerText = "bevor du weiterarbeitest";
  const banner = other.getByText(bannerText);
  await expect(banner).toBeVisible();

  // A write from the stale tab is refused and its input stays.
  const title = other.getByLabel("Titel des Projekts");
  await title.fill("Aus Tab B");
  await other.getByRole("button", { name: "Projekt anlegen" }).click();
  await expect(
    other.getByText("Bitte lade die Seite neu und wiederhole die Änderung."),
  ).toBeVisible();
  await expect(title).toHaveValue("Aus Tab B");

  await other.getByRole("button", { name: "Neu laden" }).click();
  await expect(banner).toHaveCount(0);
  await expect(
    other.getByRole("link", { name: "Noch eins aus Tab A" }),
  ).toBeVisible();
  await expect(other.getByRole("link", { name: "Aus Tab B" })).toHaveCount(0);

  await other.getByLabel("Titel des Projekts").fill("Aus Tab B");
  await other.getByRole("button", { name: "Projekt anlegen" }).click();
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(
    "Links zu Stellenausschreibungen",
  );
  await expect(page.getByText(bannerText)).toBeVisible();
});
