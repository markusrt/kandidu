import {
  captureDownload,
  expect,
  pdfFile,
  pdfPageCount,
  test,
  zipEntries,
} from "./fixtures";
import {
  createProjectWithLeads,
  gotoLeadStep,
  openLead,
  releaseLead,
  uploadCvPdf,
} from "./flows";

// Riskiest assumption (3): storing and merging PDFs and building a ZIP in the
// browser at realistic sizes (SC-005).

const MB = 1024 * 1024;

test("C1 package size: 2 × 13.5 MB / 30 pages compose into one ZIP in < 30 s", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop performance proof");
  test.setTimeout(240_000);
  expect(browserName).toBe("chromium");

  const cv = await pdfFile("Lebenslauf.pdf", 30, {
    label: "CV",
    imageBytesPerPage: 0.45 * MB,
  });
  const cover = await pdfFile("Anschreiben.pdf", 30, {
    label: "Anschreiben",
    imageBytesPerPage: 0.45 * MB,
  });
  expect(cv.buffer.byteLength).toBeGreaterThan(13 * MB);
  expect(cv.buffer.byteLength).toBeLessThan(20 * MB);

  await uploadCvPdf(page, cv);
  await createProjectWithLeads(page, "valid-plain");
  await openLead(page, "Beispiel GmbH");
  await releaseLead(page, cover);
  await gotoLeadStep(page, "Paket");

  const started = Date.now();
  const zip = await captureDownload(page, () =>
    page.getByRole("button", { name: "ZIP herunterladen" }).click(),
  );
  const seconds = (Date.now() - started) / 1000;
  testInfo.annotations.push({
    type: "timing",
    description: `compose + ZIP: ${seconds.toFixed(1)} s for ${(
      (cv.buffer.byteLength + cover.buffer.byteLength) / MB
    ).toFixed(1)} MB input`,
  });
  console.log(`[SC-005] compose + ZIP took ${seconds.toFixed(1)} s`);

  expect(zip.name).toMatch(/^\d{4}-\d{2}-\d{2}_Beispiel_GmbH_Bewerbung\.zip$/);
  const entries = [...zipEntries(zip.bytes)];
  expect(entries).toHaveLength(1);
  const [name, merged] = entries[0] ?? ["", new Uint8Array()];
  expect(name).toMatch(/_Bewerbung\.pdf$/);
  expect(await pdfPageCount(merged)).toBe(60);
  expect(seconds).toBeLessThan(30);
});

test("C1 package size: a PDF over 20 MB is rejected with the limit named", async ({
  page,
}) => {
  const big = await pdfFile("Riesig.pdf", 4, { imageBytesPerPage: 5.5 * MB });
  expect(big.buffer.byteLength).toBeGreaterThan(20 * MB);
  await page.goto("/#/einrichtung/lebenslauf");
  await page.getByLabel("Lebenslauf-PDF hochladen").setInputFiles(big);
  await expect(page.getByRole("alert")).toContainText("Die Datei ist zu groß.");
  await expect(
    page.getByText("Noch kein Lebenslauf-PDF hochgeladen."),
  ).toBeVisible();
});
