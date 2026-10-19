import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { gotoLeadStep, setupReleasedLead } from "./flows";

// C3 lifecycle journey (User Story 6, FR-034, FR-035): status changes, undo,
// the history and dated comments, all in the browser with synthetic data.

async function openHistory(page: Page): Promise<void> {
  await setupReleasedLead(page, { cvPages: 1, coverPages: 1 });
  await gotoLeadStep(page, "Verlauf");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Verlauf und Kommentare",
  );
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

async function addOnlineInterview(
  page: Page,
  dateTime: string,
  link: string,
): Promise<void> {
  await page.getByLabel("Datum und Uhrzeit").fill(dateTime);
  await page.getByRole("radio", { name: "Online" }).check();
  await page.getByLabel("Link zum Online-Gespräch (optional)").fill(link);
  await page.getByRole("button", { name: "Einladung eintragen" }).click();
}

async function confirmUndo(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Letzten Statuswechsel rückgängig machen" })
    .click();
  await page.getByRole("button", { name: "Ja, rückgängig machen" }).click();
}

const historyItems = (page: Page) => page.locator(".history-list > li");

test("C3 lifecycle: sent, two interviews and acceptance fill the history", async ({
  page,
}) => {
  await openHistory(page);
  await changeStatus(page, "Versendet", "2027-03-01");
  await addOnsiteInterview(page, "2027-03-15T10:00", "Hauptstraße 5, Raum 2");
  await addOnlineInterview(
    page,
    "2027-03-22T14:30",
    "https://meet.example.org/raum-1",
  );
  await expect(page.getByRole("status")).toContainText(
    "Status geändert: Einladung zum Gespräch.",
  );
  await changeStatus(page, "Zusage", "2027-04-02");

  await expect(historyItems(page)).toHaveCount(6);
  await expect(historyItems(page).nth(0)).toContainText("Review (Entwurf)");
  await expect(historyItems(page).nth(1)).toContainText("Bereit zum Versenden");
  await expect(historyItems(page).nth(2)).toContainText("Versendet");
  await expect(historyItems(page).nth(2)).toContainText("1. März 2027");
  await expect(historyItems(page).nth(3)).toContainText("15. März 2027");
  await expect(historyItems(page).nth(3)).toContainText("10:00");
  await expect(historyItems(page).nth(3)).toContainText(
    "Vor Ort: Hauptstraße 5, Raum 2",
  );
  await expect(historyItems(page).nth(4)).toContainText("22. März 2027");
  await expect(historyItems(page).nth(4)).toContainText("Online");
  const link = historyItems(page).nth(4).getByRole("link");
  await expect(link).toHaveAttribute("href", "https://meet.example.org/raum-1");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(historyItems(page).nth(5)).toContainText("Zusage");
  await expect(historyItems(page).nth(5)).toContainText("2. April 2027");
  await expect(page.getByText("Status: Zusage")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Status: Zusage")).toBeVisible();
  await expect(historyItems(page)).toHaveCount(6);
});

test("C3 lifecycle: undo steps back, marks entries and drops the cover letter PDF", async ({
  page,
}) => {
  await openHistory(page);
  await changeStatus(page, "Versendet", "2027-03-01");
  await addOnsiteInterview(page, "2027-03-15T10:00", "Hauptstraße 5");
  await changeStatus(page, "Zusage", "2027-04-02");

  const undoButton = page.getByRole("button", {
    name: "Letzten Statuswechsel rückgängig machen",
  });
  await undoButton.click();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByText("Status: Zusage")).toBeVisible();
  await expect(page.getByText("rückgängig gemacht am")).toHaveCount(0);

  await confirmUndo(page);
  await expect(page.getByText("Status: Einladung zum Gespräch")).toBeVisible();
  await expect(page.getByText(/rückgängig gemacht am/)).toHaveCount(1);
  await expect(historyItems(page).nth(4)).toContainText("Zusage");
  await expect(historyItems(page).nth(4)).toContainText(
    "rückgängig gemacht am",
  );
  await expect(
    page.getByRole("heading", { name: "Verlauf", exact: true }),
  ).toBeFocused();

  await confirmUndo(page);
  await expect(page.getByText("Status: Versendet")).toBeVisible();
  await confirmUndo(page);
  await expect(page.getByText("Status: Bereit zum Versenden")).toBeVisible();

  await undoButton.click();
  await expect(page.getByText(/Anschreiben-PDF wird entfernt/)).toBeVisible();
  await page.getByRole("button", { name: "Ja, rückgängig machen" }).click();
  await expect(page.getByText("Status: Review (Entwurf)")).toBeVisible();
  await expect(undoButton).toHaveCount(0);

  await gotoLeadStep(page, "Freigabe");
  await expect(
    page.getByText("Noch kein Anschreiben-PDF hochgeladen."),
  ).toBeVisible();
});

test("C3 lifecycle: withdrawing ends the lead and leaves only undo", async ({
  page,
}) => {
  await openHistory(page);
  await changeStatus(page, "Zurückgezogen", "2027-03-05");

  for (const name of ["Versendet", "Zusage", "Absage", "Fehlgeschlagen"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  }
  await expect(
    page.getByRole("button", { name: "Einladung eintragen" }),
  ).toHaveCount(0);
  await expect(page.getByText(/Dieser Status ist abgeschlossen/)).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Letzten Statuswechsel rückgängig machen",
    }),
  ).toBeVisible();

  await confirmUndo(page);
  await expect(page.getByText("Status: Bereit zum Versenden")).toBeVisible();
});

test("C3 lifecycle: forbidden transitions are not offered", async ({
  page,
}) => {
  await openHistory(page);
  for (const name of ["Versendet", "Zurückgezogen", "Fehlgeschlagen"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  for (const name of ["Zusage", "Absage"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  }
  await expect(
    page.getByRole("button", { name: "Einladung eintragen" }),
  ).toHaveCount(0);
});

test("C3 lifecycle: comments can be added, edited and deleted in any status", async ({
  page,
}) => {
  await openHistory(page);
  const list = page.locator(".comment-list > li");

  // An empty comment is reported at the field and saves nothing.
  await page.getByRole("button", { name: "Kommentar hinzufügen" }).click();
  const textarea = page.getByLabel("Kommentar", { exact: true });
  await expect(textarea).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.locator("#" + (await textarea.getAttribute("id")) + "-error"),
  ).toBeVisible();
  await expect(list).toHaveCount(0);

  await page.getByLabel("Datum", { exact: true }).fill("2027-03-01");
  await textarea.fill("Erste Notiz\nzweite Zeile");
  await page.getByRole("button", { name: "Kommentar hinzufügen" }).click();
  await expect(list).toHaveCount(1);
  await page.getByLabel("Datum", { exact: true }).fill("2027-03-02");
  await textarea.fill("Zweite Notiz");
  await page.getByRole("button", { name: "Kommentar hinzufügen" }).click();
  await expect(list).toHaveCount(2);
  await expect(list.nth(0)).toContainText("1. März 2027");
  await expect(list.nth(0)).toContainText("Erste Notiz");
  await expect(list.nth(1)).toContainText("Zweite Notiz");

  // Edit: Escape cancels and returns focus, saving changes the text.
  const editFirst = page.getByRole("button", {
    name: "Kommentar 1 bearbeiten",
  });
  await editFirst.click();
  await page.getByLabel("Text von Kommentar 1").press("Escape");
  await expect(editFirst).toBeFocused();
  await expect(list.nth(0)).toContainText("Erste Notiz");
  await editFirst.click();
  await page.getByLabel("Text von Kommentar 1").fill("Geänderte Notiz");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(list.nth(0)).toContainText("Geänderte Notiz");

  // Delete: cancel first, then confirm.
  await page.getByRole("button", { name: "Kommentar 2 löschen" }).click();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(list).toHaveCount(2);
  await page.getByRole("button", { name: "Kommentar 2 löschen" }).click();
  await page.getByRole("button", { name: "Ja, löschen" }).click();
  await expect(list).toHaveCount(1);
  await expect(textarea).toBeFocused();

  await page.reload();
  await expect(list).toHaveCount(1);
  await expect(list.nth(0)).toContainText("Geänderte Notiz");
  await expect(page.getByText("Zweite Notiz")).toHaveCount(0);
});

test("C3 lifecycle: an invalid online link is reported at the field", async ({
  page,
}) => {
  await openHistory(page);
  await changeStatus(page, "Versendet", "2027-03-01");
  await addOnlineInterview(page, "2027-03-22T14:30", "meet.example");

  const field = page.getByLabel("Link zum Online-Gespräch (optional)");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveValue("meet.example");
  await expect(
    page.getByText(/Bitte gib einen vollständigen Link ein/),
  ).toBeVisible();
  await expect(page.getByText("Status: Versendet")).toBeVisible();
  await expect(historyItems(page)).toHaveCount(3);

  await page.reload();
  await expect(historyItems(page)).toHaveCount(3);
});

test.describe("C3 lifecycle: mobile", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("C3 lifecycle: history and comments fit 360 px", async ({ page }) => {
    await openHistory(page);
    await changeStatus(page, "Versendet", "2027-03-01");
    await addOnlineInterview(
      page,
      "2027-03-22T14:30",
      `https://meet.example.org/${"sehr-lange-kennung-".repeat(6)}ende`,
    );
    await expect(
      page.getByText("Status: Einladung zum Gespräch"),
    ).toBeVisible();
    await page
      .getByLabel("Kommentar", { exact: true })
      .fill(`${"Langer Kommentar ohne Ende ".repeat(10)}${"x".repeat(80)}`);
    await page.getByRole("button", { name: "Kommentar hinzufügen" }).click();
    await expect(page.locator(".comment-list > li")).toHaveCount(1);

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
      `Verlauf scrolls horizontally: ${overflow.wide.join(", ")}`,
    ).toBeLessThanOrEqual(overflow.client);
  });
});
