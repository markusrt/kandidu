import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { inspectTemplate, renderTemplate } from "./docx";
import { FileError, MAX_DOCX_BYTES } from "./errors";
import { docxParagraphTexts } from "./ooxml";
import { buildFixtureDocx, splitRuns } from "./testing/docxFixture";

function issues(paragraphs: string[], kind: "cv" | "coverLetter" = "cv") {
  const result = inspectTemplate(
    buildFixtureDocx(paragraphs.map((p) => [p])),
    kind,
  );
  if (result.ok) throw new Error("expected issues");
  return result.issues;
}

function fileErrorCode(run: () => unknown): string | undefined {
  try {
    run();
  } catch (cause) {
    return cause instanceof FileError ? cause.code : "other";
  }
  return undefined;
}

describe("inspectTemplate", () => {
  it("finds tags split across formatted runs with proofing marks", () => {
    const bytes = buildFixtureDocx(
      [
        [
          "Hallo ",
          ...splitRuns("{Vorname}", 3, 2, 4),
          " ",
          ...splitRuns("{Nachname}", 1, 5),
        ],
        splitRuns("{EMail}", 2, 1, 1, 3),
      ],
      { proofErr: true, bookmarks: true },
    );
    expect(inspectTemplate(bytes, "cv")).toEqual({
      ok: true,
      tags: ["Vorname", "Nachname", "EMail"],
    });
  });

  it("tolerates spaces inside braces", () => {
    const result = inspectTemplate(buildFixtureDocx([["{ Vorname }"]]), "cv");
    expect(result).toEqual({ ok: true, tags: ["Vorname"] });
  });

  it("checks headers too", () => {
    const bytes = buildFixtureDocx([["Text"]], { header: [["{Firma}"]] });
    const result = inspectTemplate(bytes, "cv");
    expect(result.ok).toBe(false);
  });

  it("explains unknown placeholders with a suggestion", () => {
    expect(issues(["Hallo {Vornahme}"])).toEqual([
      { code: "unknown-placeholder", tag: "Vornahme", suggestion: "Vorname" },
    ]);
  });

  it.each([
    ["Hallo Vorname} !", "unopened-tag"],
    ["Hallo {Vorname !", "unclosed-tag"],
    ["Hallo {{Vorname}", "duplicate-open"],
    ["Hallo {Vorname}}", "duplicate-close"],
  ])("maps %s to %s", (text, code) => {
    const found = issues([text]);
    expect(found.map((issue) => issue.code)).toContain(code);
    expect(found[0]?.tag ?? found[0]?.context).toBeTruthy();
  });

  it("maps block structure errors", () => {
    expect(
      issues(["{#Motivation}", "{Absatz}", "{/Andere}"], "coverLetter").map(
        (i) => i.code,
      ),
    ).toContain("loop-mismatch");
    expect(
      issues(["{#Motivation}", "{Absatz}"], "coverLetter").map((i) => i.code),
    ).toContain("unclosed-block");
    expect(
      issues(["{Absatz}", "{/Motivation}"], "coverLetter").map((i) => i.code),
    ).toContain("unopened-block");
  });

  it("reports several syntax errors at once", () => {
    expect(issues(["Hallo Vorname}", "Wohnort Ort}"])).toEqual([
      { code: "unopened-tag", tag: "Vorname", context: "Hallo Vorname" },
      { code: "unopened-tag", tag: "Ort", context: "}Wohnort Ort" },
    ]);
  });

  it("reads a brace pair spanning paragraphs as one unknown tag", () => {
    expect(issues(["{Vorname", "Nachname}"])).toEqual([
      { code: "unknown-placeholder", tag: "VornameNachname" },
    ]);
  });

  it("rejects files that are not DOCX", () => {
    expect(
      fileErrorCode(() => inspectTemplate(new Uint8Array([1, 2, 3]), "cv")),
    ).toBe("docx-invalid");
    const zip = new PizZip();
    zip.file("hello.txt", "no word document");
    const notWord = zip.generate({ type: "uint8array" });
    expect(fileErrorCode(() => inspectTemplate(notWord, "cv"))).toBe(
      "docx-invalid",
    );
    const pdfLike = new TextEncoder().encode("%PDF-1.7\n%%EOF");
    expect(fileErrorCode(() => inspectTemplate(pdfLike, "cv"))).toBe(
      "docx-invalid",
    );
  });

  it("rejects templates over the size limit", () => {
    const big = { byteLength: MAX_DOCX_BYTES + 1 } as Uint8Array;
    expect(fileErrorCode(() => inspectTemplate(big, "cv"))).toBe(
      "file-too-large",
    );
  });
});

describe("renderTemplate", () => {
  it("fills split tags and keeps run formatting", () => {
    const bytes = buildFixtureDocx(
      [["Hallo ", ...splitRuns("{Vorname}", 3, 2, 4), "!"]],
      { proofErr: true },
    );
    const out = renderTemplate(bytes, { Vorname: "Erika" });
    expect(docxParagraphTexts(out)).toEqual(["Hallo Erika!"]);
    const xml = new PizZip(out).file("word/document.xml")?.asText() ?? "";
    expect(xml).not.toContain("{");
  });

  it("renders the motivation block as separate paragraphs", () => {
    const bytes = buildFixtureDocx([
      ["{Briefanrede}"],
      ["{#Motivation}"],
      ["{Absatz}"],
      ["{/Motivation}"],
      ["Mit freundlichen Grüßen"],
    ]);
    const out = renderTemplate(bytes, {
      Briefanrede: "Sehr geehrte Damen und Herren,",
      Motivation: [{ Absatz: "Erster Absatz." }, { Absatz: "Zweiter Absatz." }],
    });
    expect(docxParagraphTexts(out)).toEqual([
      "Sehr geehrte Damen und Herren,",
      "Erster Absatz.",
      "Zweiter Absatz.",
      "Mit freundlichen Grüßen",
    ]);
  });

  it("fills headers, escapes XML and leaves missing values empty", () => {
    const bytes = buildFixtureDocx([["{Firma}|{Stelle}|"]], {
      header: [["{Name}"]],
    });
    const out = renderTemplate(bytes, { Firma: "A & B <GmbH>", Name: "Erika" });
    expect(docxParagraphTexts(out)).toEqual(["A & B <GmbH>||"]);
    expect(docxParagraphTexts(out, "word/header1.xml")).toEqual(["Erika"]);
    expect(() => new PizZip(out)).not.toThrow();
  });

  it("fails with render-failed on a broken template", () => {
    const bytes = buildFixtureDocx([["{Vorname"]]);
    expect(fileErrorCode(() => renderTemplate(bytes, {}))).toBe(
      "render-failed",
    );
  });
});
