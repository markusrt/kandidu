import { expect, test } from "@playwright/test";

const key = "mvp-starter:demo:v1";

test("demo: create, check, reload, delete; keyboard and responsive layout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("loaded");
  const title = page.getByLabel("New demo item");
  await title.fill("Review sample");
  await title.press("Enter");
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.getByRole("checkbox", { name: "Review sample" }).check();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Review sample" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Delete Review sample" }).click();
  await expect(page.getByText("No demo items yet.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("No demo items yet.")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("demo: corrupt data blocks writes until deliberate own-key reset", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key }) => {
      if (localStorage.getItem("initialized") === null) {
        localStorage.setItem(key, "{broken");
        localStorage.setItem("unrelated", "keep");
        localStorage.setItem("initialized", "yes");
      }
    },
    { key },
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("preserved");
  await expect(page.getByLabel("New demo item")).toBeDisabled();
  await page.getByRole("button", { name: "Retry loading" }).click();
  await expect(page.getByRole("alert")).toContainText("preserved");
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    "{broken",
  );
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByRole("button", { name: "Confirm reset demo" }).click();
  await expect(page.getByRole("status")).toContainText("reset");
  expect(await page.evaluate(() => localStorage.getItem("unrelated"))).toBe(
    "keep",
  );
  await expect(page.getByLabel("New demo item")).toBeEnabled();
});

test("demo: failed save does not claim success or lose the input; retry works", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === "mvp-starter:demo:v1" &&
        !sessionStorage.getItem("allow-save")
      ) {
        throw new DOMException("Full", "QuotaExceededError");
      }
      original.call(this, key, value);
    };
  });
  await page.goto("/");
  await page.getByLabel("New demo item").fill("Keep my input");
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByRole("alert")).toContainText("Not saved");
  await expect(page.getByLabel("New demo item")).toHaveValue("Keep my input");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByRole("status")).not.toContainText("Saved");
  await page.evaluate(() => sessionStorage.setItem("allow-save", "yes"));
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Keep my input" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Saved");
});

test("demo: denied reads and failed reset remain blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Denied");
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Cannot read");
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByRole("button", { name: "Confirm reset demo" }).click();
  await expect(page.getByRole("alert")).toContainText("Reset failed");
  await expect(page.getByLabel("New demo item")).toBeDisabled();
});
