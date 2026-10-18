export type FileErrorCode =
  | "file-too-large"
  | "docx-invalid"
  | "pdf-invalid"
  | "pdf-encrypted"
  | "render-failed"
  | "zip-failed";

// Codes, not user-facing text; the UI localizes them.
export class FileError extends Error {
  readonly code: FileErrorCode;

  constructor(code: FileErrorCode) {
    super(code);
    this.name = "FileError";
    this.code = code;
  }
}

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_DOCX_BYTES = 10 * 1024 * 1024;

export function assertSize(bytes: { byteLength: number }, max: number): void {
  if (bytes.byteLength > max) {
    throw new FileError("file-too-large");
  }
}
