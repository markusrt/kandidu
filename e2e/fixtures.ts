import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import {
  test as base,
  type Download,
  expect,
  type Page,
} from "@playwright/test";
import { docxParagraphTexts } from "../src/files/ooxml";
import {
  buildFixtureDocx,
  type FixtureOptions,
  type FixtureParagraph,
} from "../src/files/testing/docxFixture";
import {
  buildFixturePdf,
  type PdfFixtureOptions,
} from "../src/files/testing/pdfFixture";
import { unzipFiles } from "../src/files/zip";

// Shared e2e fixtures. Every test runs in a fresh browser context (empty
// IndexedDB) with synthetic data only.

const APP_ORIGIN = `http://127.0.0.1:${process.env.KANDIDU_E2E_PORT ?? 4173}`;

/** Records every request of `page` outside the app origin into `foreign`. */
export function watchRequests(page: Page, foreign: string[]): void {
  page.on("request", (request) => {
    const url = request.url();
    if (
      !url.startsWith(APP_ORIGIN) &&
      !url.startsWith("data:") &&
      !url.startsWith("blob:")
    ) {
      foreign.push(url);
    }
  });
}

/**
 * Fails the test if the app requests anything but its own origin (SC-008).
 * Extra pages and contexts register with `watchRequests(page, networkGuard)`.
 */
export const test = base.extend<{ networkGuard: string[] }>({
  networkGuard: [
    async ({ page }, use) => {
      const foreign: string[] = [];
      watchRequests(page, foreign);
      await use(foreign);
      expect(foreign, "requests to foreign origins").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export interface UploadFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export async function pdfFile(
  name: string,
  pages: number,
  options: PdfFixtureOptions = {},
): Promise<UploadFile> {
  const bytes = await buildFixturePdf(pages, options);
  return { name, mimeType: "application/pdf", buffer: Buffer.from(bytes) };
}

export function docxFile(
  name: string,
  paragraphs: readonly FixtureParagraph[],
  options: FixtureOptions = {},
): UploadFile {
  return {
    name,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from(buildFixtureDocx(paragraphs, options)),
  };
}

export function textFile(name: string, text: string): UploadFile {
  return { name, mimeType: "application/pdf", buffer: Buffer.from(text) };
}

export async function downloadBytes(download: Download): Promise<Uint8Array> {
  const path = await download.path();
  return new Uint8Array(await readFile(path));
}

/** Clicks `trigger` and returns the downloaded file's name and bytes. */
export async function captureDownload(
  page: Page,
  trigger: () => Promise<void>,
): Promise<{ name: string; bytes: Uint8Array }> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    trigger(),
  ]);
  return {
    name: download.suggestedFilename(),
    bytes: await downloadBytes(download),
  };
}

export function docxText(bytes: Uint8Array): string[] {
  return docxParagraphTexts(bytes);
}

export function zipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  return unzipFiles(bytes);
}

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

/** Page widths in points; fixtures use a distinct width per source. */
export async function pdfPageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => Math.round(page.getWidth()));
}

export async function readFixture(name: string): Promise<string> {
  return readFile(
    new URL(`../src/llm/fixtures/${name}.txt`, import.meta.url),
    "utf8",
  );
}

/** Synthetic profile used across journeys. */
export const PROFILE = {
  Vorname: "Erika",
  Nachname: "Musterfrau",
  "Straße und Hausnummer": "Musterweg 1",
  PLZ: "12345",
  Ort: "Musterstadt",
  Telefon: "+49 30 1234567",
  "E-Mail": "erika@example.org",
} as const;
