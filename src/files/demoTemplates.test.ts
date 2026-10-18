import { describe, expect, it } from "vitest";
import { buildDemoTemplate } from "./demoTemplates";
import { inspectTemplate, renderTemplate } from "./docx";
import { docxParagraphTexts } from "./ooxml";

describe("buildDemoTemplate", () => {
  it("builds a valid template with bold segments and styles", () => {
    const bytes = buildDemoTemplate([
      { text: "Lebenslauf", style: "Title" },
      { text: "**Name:** {Vorname} {Nachname}" },
      { text: "" },
    ]);
    expect(inspectTemplate(bytes, "cv")).toEqual({
      ok: true,
      tags: ["Vorname", "Nachname"],
    });
    const out = renderTemplate(bytes, { Vorname: "Erika", Nachname: "M" });
    expect(docxParagraphTexts(out)).toEqual([
      "Lebenslauf",
      "Name: Erika M",
      "",
    ]);
  });
});
