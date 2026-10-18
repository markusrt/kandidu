import { describe, expect, it } from "vitest";
import {
  datedName,
  safeFileNamePart,
  uniqueFileNames,
  withExtension,
} from "./fileNames";

describe("safeFileNamePart", () => {
  it("removes forbidden characters and collapses whitespace", () => {
    expect(safeFileNamePart('Müller & Söhne / GmbH: "Nord"')).toBe(
      "Müller_&_Söhne_GmbH_Nord",
    );
    expect(safeFileNamePart("a\u0000b\tc")).toBe("a_b_c");
  });

  it("normalizes to NFC", () => {
    expect(safeFileNamePart("Müller")).toBe("Müller");
  });

  it("limits length and falls back when empty", () => {
    expect(safeFileNamePart("x".repeat(100))).toHaveLength(60);
    expect(safeFileNamePart(" /// ")).toBe("_");
    expect(safeFileNamePart("...", "Firma")).toBe("Firma");
  });
});

describe("datedName", () => {
  it("joins date and safe parts", () => {
    expect(
      datedName("2026-10-18", ["Beispiel GmbH", "Anschreiben"], "docx"),
    ).toBe("2026-10-18_Beispiel_GmbH_Anschreiben.docx");
    expect(datedName("2026-10-18", ["", "Bewerbung"], "zip")).toBe(
      "2026-10-18_Bewerbung.zip",
    );
  });
});

describe("withExtension", () => {
  it("adds or keeps the extension", () => {
    expect(withExtension("Bewerbung", "pdf")).toBe("Bewerbung.pdf");
    expect(withExtension("Bewerbung.PDF", "pdf")).toBe("Bewerbung.pdf");
    expect(withExtension("a/b", "pdf")).toBe("a_b.pdf");
  });
});

describe("uniqueFileNames", () => {
  it("numbers case-insensitive duplicates", () => {
    expect(uniqueFileNames(["a.pdf", "A.pdf", "b.pdf", "a.pdf"])).toEqual([
      "a.pdf",
      "A (2).pdf",
      "b.pdf",
      "a (3).pdf",
    ]);
  });
});
