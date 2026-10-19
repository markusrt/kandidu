import { describe, expect, it } from "vitest";
import {
  checkTemplateTags,
  PLACEHOLDERS,
  placeholdersFor,
  splitMissing,
  suggestPlaceholder,
  type TemplateTag,
  usedPlaceholderNames,
} from "./placeholders";

const text = (name: string, raw = name): TemplateTag => ({
  name,
  kind: "text",
  raw,
  children: [],
});
const block = (name: string, children: TemplateTag[]): TemplateTag => ({
  name,
  kind: "block",
  raw: `#${name}`,
  children,
});

describe("placeholder catalog", () => {
  it("has unique names and limits the CV to personal data", () => {
    const names = PLACEHOLDERS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(placeholdersFor("cv").every((p) => p.source === "profile")).toBe(
      true,
    );
    expect(placeholdersFor("coverLetter").map((p) => p.name)).toContain(
      "Motivation",
    );
  });
});

describe("checkTemplateTags", () => {
  it("accepts every known placeholder of the cover letter", () => {
    const tags = [
      ...placeholdersFor("coverLetter")
        .filter((p) => p.kind === "text")
        .map((p) => text(p.name)),
      block("Motivation", [text("Absatz")]),
    ];
    expect(checkTemplateTags(tags, "coverLetter")).toEqual([]);
  });

  it("reports unknown names with a suggestion", () => {
    expect(checkTemplateTags([text("Vornahme")], "cv")).toEqual([
      { code: "unknown-placeholder", tag: "Vornahme", suggestion: "Vorname" },
    ]);
    expect(checkTemplateTags([text("vorname")], "cv")[0]?.suggestion).toBe(
      "Vorname",
    );
    expect(checkTemplateTags([text("Lieblingsessen")], "cv")).toEqual([
      { code: "unknown-placeholder", tag: "Lieblingsessen" },
    ]);
  });

  it("reports cover letter placeholders inside the CV", () => {
    expect(checkTemplateTags([text("Firma")], "cv")).toEqual([
      { code: "wrong-template", tag: "Firma" },
    ]);
  });

  it("reports misuse of the motivation block", () => {
    expect(checkTemplateTags([text("Motivation")], "coverLetter")).toEqual([
      { code: "block-misused", tag: "Motivation" },
    ]);
    expect(checkTemplateTags([block("Vorname", [])], "coverLetter")).toEqual([
      { code: "block-misused", tag: "#Vorname" },
    ]);
    expect(
      checkTemplateTags(
        [block("Motivation", [block("Motivation", [])])],
        "coverLetter",
      ),
    ).toEqual([{ code: "block-misused", tag: "#Motivation" }]);
    expect(
      checkTemplateTags(
        [{ name: "x", kind: "other", raw: "@x", children: [] }],
        "coverLetter",
      ),
    ).toEqual([{ code: "block-misused", tag: "@x" }]);
  });

  it("reports Absatz outside the motivation block", () => {
    expect(checkTemplateTags([text("Absatz")], "coverLetter")).toEqual([
      { code: "block-item-outside", tag: "Absatz" },
    ]);
  });

  it("checks tags inside the block and deduplicates issues", () => {
    const tags = [
      block("Motivation", [text("Absatz"), text("Vorname"), text("Foo")]),
      text("Foo"),
    ];
    expect(checkTemplateTags(tags, "coverLetter")).toEqual([
      { code: "unknown-placeholder", tag: "Foo" },
    ]);
  });
});

describe("helpers", () => {
  it("suggests only names of the template kind", () => {
    expect(suggestPlaceholder("Firm", "cv")).toBeUndefined();
    expect(suggestPlaceholder("Firm", "coverLetter")).toBe("Firma");
  });

  it("lists used names once in order", () => {
    expect(
      usedPlaceholderNames([
        text("Vorname"),
        block("Motivation", [text("Absatz"), text("Vorname")]),
      ]),
    ).toEqual(["Vorname", "Motivation", "Absatz"]);
  });

  it("marks exactly the optional profile fields as optional", () => {
    expect(PLACEHOLDERS.filter((p) => p.optional).map((p) => p.name)).toEqual([
      "Geburtsdatum",
      "Geburtsort",
      "Staatsangehoerigkeit",
      "Website",
    ]);
  });

  it("splits empty placeholders into required and optional ones", () => {
    expect(splitMissing(["Geburtsort", "Telefon", "Website", "EMail"])).toEqual(
      {
        required: ["Telefon", "EMail"],
        optional: ["Geburtsort", "Website"],
      },
    );
    expect(splitMissing(["Website"])).toEqual({
      required: [],
      optional: ["Website"],
    });
    // Unknown names stay on the safe side.
    expect(splitMissing(["Unbekannt"]).required).toEqual(["Unbekannt"]);
  });
});
