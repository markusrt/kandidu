import { describe, expect, it } from "vitest";
import { assertSize, FileError, MAX_DOCX_BYTES, MAX_PDF_BYTES } from "./errors";

describe("FileError", () => {
  it("carries the code and name", () => {
    const error = new FileError("pdf-invalid");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("pdf-invalid");
    expect(error.name).toBe("FileError");
    expect(error.message).toBe("pdf-invalid");
  });
});

describe("assertSize", () => {
  it("allows a size equal to the maximum", () => {
    expect(() =>
      assertSize({ byteLength: MAX_PDF_BYTES }, MAX_PDF_BYTES),
    ).not.toThrow();
  });

  it("throws file-too-large when over the maximum", () => {
    try {
      assertSize({ byteLength: MAX_DOCX_BYTES + 1 }, MAX_DOCX_BYTES);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(FileError);
      expect((error as FileError).code).toBe("file-too-large");
    }
  });

  it("defines the size limits", () => {
    expect(MAX_PDF_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_DOCX_BYTES).toBe(10 * 1024 * 1024);
  });
});
