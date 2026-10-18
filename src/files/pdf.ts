import { EncryptedPDFError, PDFDocument } from "@cantoo/pdf-lib";
import { assertSize, FileError, MAX_PDF_BYTES } from "./errors";

// PDF validation and merging in the browser (research R3, ADR 009).

export interface PdfInfo {
  readonly pageCount: number;
}

const LOAD = { updateMetadata: false } as const;

async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  if (!startsWithPdfHeader(bytes)) throw new FileError("pdf-invalid");
  try {
    return usable(await PDFDocument.load(bytes, LOAD));
  } catch (cause) {
    if (!(cause instanceof EncryptedPDFError)) {
      if (cause instanceof FileError) throw cause;
      throw new FileError("pdf-invalid");
    }
  }
  // Many certificates only restrict permissions and open with an empty user
  // password; those can be read. Files that need a password to open cannot.
  try {
    return usable(await PDFDocument.load(bytes, { ...LOAD, password: "" }));
  } catch {
    throw new FileError("pdf-encrypted");
  }
}

/** The lenient parser accepts truncated files; a page tree proves usability. */
function usable(doc: PDFDocument): PDFDocument {
  if (doc.getPageCount() < 1) throw new FileError("pdf-invalid");
  return doc;
}

function startsWithPdfHeader(bytes: Uint8Array): boolean {
  // "%PDF-" may follow a few junk bytes; readers accept it within 1 KB.
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

/** Validates a PDF upload and counts its pages. */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfInfo> {
  assertSize(bytes, MAX_PDF_BYTES);
  const doc = await loadPdf(bytes);
  return { pageCount: doc.getPageCount() };
}

/** Merges PDFs in the given order into one document. */
export async function mergePdfs(
  parts: readonly Uint8Array[],
): Promise<Uint8Array> {
  if (parts.length === 0) throw new FileError("pdf-invalid");
  const target = await PDFDocument.create();
  for (const part of parts) {
    const source = await loadPdf(part);
    const pages = await target.copyPages(source, source.getPageIndices());
    for (const page of pages) target.addPage(page);
  }
  return target.save({ useObjectStreams: true });
}
