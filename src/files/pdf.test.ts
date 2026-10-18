import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { FileError, MAX_PDF_BYTES } from "./errors";
import { inspectPdf, mergePdfs } from "./pdf";
import { buildFixturePdf } from "./testing/pdfFixture";

async function fileErrorCode(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (cause) {
    return cause instanceof FileError ? cause.code : `other:${String(cause)}`;
  }
  return undefined;
}

describe("inspectPdf", () => {
  it("counts pages of a valid PDF", async () => {
    expect(await inspectPdf(await buildFixturePdf(3))).toEqual({
      pageCount: 3,
    });
  });

  it("rejects a renamed text file and a truncated PDF", async () => {
    const text = new TextEncoder().encode("Das ist kein PDF.");
    expect(await fileErrorCode(() => inspectPdf(text))).toBe("pdf-invalid");
    const truncated = (await buildFixturePdf(2)).subarray(0, 40);
    expect(await fileErrorCode(() => inspectPdf(truncated))).toBe(
      "pdf-invalid",
    );
  });

  it("rejects a PDF that needs a password to open", async () => {
    const locked = await buildFixturePdf(1, { userPassword: "geheim" });
    expect(await fileErrorCode(() => inspectPdf(locked))).toBe("pdf-encrypted");
  });

  it("accepts a PDF that only restricts permissions", async () => {
    const restricted = await buildFixturePdf(2, { ownerPassword: "owner" });
    expect(await inspectPdf(restricted)).toEqual({ pageCount: 2 });
  });

  it("rejects files over the size limit before parsing", async () => {
    const big = { byteLength: MAX_PDF_BYTES + 1 } as Uint8Array;
    expect(await fileErrorCode(() => inspectPdf(big))).toBe("file-too-large");
  });
});

describe("mergePdfs", () => {
  async function widths(bytes: Uint8Array): Promise<number[]> {
    const doc = await PDFDocument.load(bytes);
    return doc.getPages().map((page) => Math.round(page.getWidth()));
  }

  it("keeps the given order of sources and their pages", async () => {
    const a = await buildFixturePdf(2, { label: "A", width: 500 });
    const b = await buildFixturePdf(3, { label: "B", width: 600 });
    expect(await widths(await mergePdfs([a, b]))).toEqual([
      500, 500, 600, 600, 600,
    ]);
    expect(await widths(await mergePdfs([b, a]))).toEqual([
      600, 600, 600, 500, 500,
    ]);
  });

  it("merges permission-restricted PDFs", async () => {
    const restricted = await buildFixturePdf(2, { ownerPassword: "owner" });
    const merged = await mergePdfs([restricted, await buildFixturePdf(1)]);
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(3);
  });

  it("fails on an invalid part", async () => {
    const text = new TextEncoder().encode("kein PDF");
    expect(await fileErrorCode(() => mergePdfs([text]))).toBe("pdf-invalid");
    expect(await fileErrorCode(() => mergePdfs([]))).toBe("pdf-invalid");
  });
});
