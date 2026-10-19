import { describe, expect, it } from "vitest";
import { LeadError } from "../../domain/lead";
import { buildCoverLetterData } from "../../domain/letterData";
import { PLACEHOLDERS, placeholdersFor } from "../../domain/placeholders";
import { ProjectError } from "../../domain/project";
import { TagError } from "../../domain/tags";
import { sampleLead, sampleProfile } from "../../domain/testing";
import { buildDemoTemplate } from "../../files/demoTemplates";
import { inspectTemplate } from "../../files/docx";
import { FileError } from "../../files/errors";
import { StoreError } from "../../storage/port";
import { catalogs, errorMessage, letterFormatter } from "./index";

const { de } = catalogs;

describe("message catalogs", () => {
  it("maps typed error codes from every layer to catalog text", () => {
    expect(errorMessage(new StoreError("save-failed"), de)).toBe(
      de.errors["save-failed"],
    );
    expect(errorMessage(new FileError("pdf-encrypted"), de)).toBe(
      de.errors["pdf-encrypted"],
    );
    expect(errorMessage(new ProjectError("link-invalid"), de)).toBe(
      de.errors["link-invalid"],
    );
    expect(errorMessage(new LeadError("gate-incomplete"), de)).toBe(
      de.errors["gate-incomplete"],
    );
    expect(errorMessage(new TagError("tag-invalid"), de)).toBe(
      de.errors["tag-invalid"],
    );
  });

  it("never shows raw technical messages to users", () => {
    expect(errorMessage(new Error("ZodError: internal"), de)).toBe(
      de.errors.unexpected,
    );
    expect(errorMessage("thrown string", de)).toBe(de.errors.unexpected);
  });

  it("has non-empty error texts", () => {
    for (const text of Object.values(de.errors)) {
      expect(text.trim()).not.toBe("");
    }
  });

  it("describes every placeholder", () => {
    for (const placeholder of PLACEHOLDERS) {
      expect(de.placeholderHelp.entries[placeholder.name]?.[0]).toBeTruthy();
    }
  });
});

const DEMO_CORE = {
  cv: ["Name", "Strasse", "PLZ", "Ort", "Telefon", "EMail", "Geburtsdatum"],
  coverLetter: [
    "Name",
    "Datum",
    "Stelle",
    "Referenznummer",
    "Firma",
    "FirmaStrasse",
    "FirmaPLZ",
    "FirmaOrt",
    "Ansprechpartner",
    "Briefanrede",
    "Motivation",
    "Absatz",
  ],
} as const;

describe("demo templates (FR-003)", () => {
  it.each(["cv", "coverLetter"] as const)(
    "%s demo validates and contains the core placeholders",
    (kind) => {
      const bytes = buildDemoTemplate(
        kind === "cv" ? de.demo.cv : de.demo.coverLetter,
      );
      const result = inspectTemplate(bytes, kind);
      if (!result.ok) throw new Error(JSON.stringify(result.issues));
      expect(result.tags).toEqual(expect.arrayContaining([...DEMO_CORE[kind]]));
      const allowed = placeholdersFor(kind).map((p) => p.name);
      expect(result.tags.every((tag) => allowed.includes(tag))).toBe(true);
    },
  );
});

describe("letter wording", () => {
  it("builds German salutations and dates", () => {
    const fmt = letterFormatter(de);
    const data = buildCoverLetterData(
      sampleProfile(),
      sampleLead(),
      "2026-10-18",
      fmt,
    );
    expect(data.Briefanrede).toBe("Sehr geehrte Frau Dr. Muster,");
    expect(data.Datum).toBe("18. Oktober 2026");
    expect(data.Ansprechpartner).toBe("Frau Dr. Eva Muster");
    expect(fmt.salutation("male", { lastName: "Muster" })).toBe(
      "Sehr geehrter Herr Muster,",
    );
    expect(fmt.salutation("neutral", undefined)).toBe(
      "Sehr geehrte Damen und Herren,",
    );
    expect(fmt.shortDate("2001-04-30")).toBe("30.04.2001");
  });
});
