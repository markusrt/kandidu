import { describe, expect, it } from "vitest";
import { LeadError, type PackageDef } from "./lead";
import {
  documentUsage,
  presetPackage,
  setPackages,
  withoutDocument,
} from "./packages";
import { sampleLead } from "./testing";

const NOW = "2026-10-19T10:00:00.000Z";

const withDoc: PackageDef = {
  id: "pk1",
  fileName: "Bewerbung.pdf",
  items: [{ kind: "coverLetter" }, { kind: "document", documentId: "d1" }],
};
const onlyDoc: PackageDef = {
  id: "pk2",
  fileName: "Zeugnisse.pdf",
  items: [{ kind: "document", documentId: "d1" }],
};
const other: PackageDef = {
  id: "pk3",
  fileName: "Andere.pdf",
  items: [{ kind: "document", documentId: "d2" }],
};

const WORDS = {
  application: "Bewerbung",
  coverLetterAndCv: "Anschreiben_Lebenslauf",
  certificates: "Zeugnisse",
};

describe("package presets (FR-031)", () => {
  it("suggests names and items per preset", () => {
    const all = presetPackage(
      "all",
      "a",
      "2026-10-19",
      "Beispiel GmbH",
      WORDS,
      ["d1"],
    );
    expect(all).toEqual({
      id: "a",
      fileName: "2026-10-19_Beispiel_GmbH_Bewerbung.pdf",
      items: [
        { kind: "coverLetter" },
        { kind: "cv" },
        { kind: "document", documentId: "d1" },
      ],
    });
    expect(
      presetPackage("coverLetterAndCv", "b", "2026-10-19", "Firma", WORDS, [
        "d1",
      ])?.fileName,
    ).toBe("2026-10-19_Firma_Anschreiben_Lebenslauf.pdf");
    expect(
      presetPackage("evidence", "c", "2026-10-19", "Firma", WORDS, [
        "d1",
        "d2",
      ]),
    ).toMatchObject({
      fileName: "2026-10-19_Firma_Zeugnisse.pdf",
      items: [
        { kind: "document", documentId: "d1" },
        { kind: "document", documentId: "d2" },
      ],
    });
  });

  it("returns nothing for an evidence package without evidence", () => {
    expect(
      presetPackage("evidence", "c", "2026-10-19", "Firma", WORDS, []),
    ).toBeUndefined();
  });
});

describe("setPackages (FR-033)", () => {
  it("stores several packages with unique names on a released lead", () => {
    const lead = sampleLead({ status: "ready" });
    const next = setPackages(
      lead,
      [
        { ...withDoc, fileName: "Bewerbung.pdf" },
        { ...other, fileName: "bewerbung.pdf" },
      ],
      NOW,
    );
    expect(next.packages.map((p) => p.fileName)).toEqual([
      "Bewerbung.pdf",
      "bewerbung (2).pdf",
    ]);
  });

  it("refuses review leads and empty packages", () => {
    expect(() => setPackages(sampleLead(), [withDoc], NOW)).toThrow(LeadError);
    const ready = sampleLead({ status: "ready" });
    expect(() => setPackages(ready, [], NOW)).toThrow(LeadError);
    expect(() => setPackages(ready, [{ ...withDoc, items: [] }], NOW)).toThrow(
      LeadError,
    );
  });
});

describe("document usage", () => {
  it("lists only leads and packages that contain the document", () => {
    const a = sampleLead({ id: "a", packages: [withDoc, other] });
    const b = sampleLead({ id: "b", packages: [other] });
    const usage = documentUsage([a, b], "d1");
    expect(usage.map((u) => u.lead.id)).toEqual(["a"]);
    expect(usage[0]?.packages.map((p) => p.id)).toEqual(["pk1"]);
    expect(documentUsage([a, b], "unknown")).toEqual([]);
  });

  it("removes the document and drops packages left empty", () => {
    const lead = sampleLead({ packages: [withDoc, onlyDoc, other] });
    const next = withoutDocument(lead, "d1", NOW);
    expect(next.packages.map((p) => p.id)).toEqual(["pk1", "pk3"]);
    expect(next.packages[0]?.items).toEqual([{ kind: "coverLetter" }]);
    expect(next.updatedAt).toBe(NOW);
    expect(lead.packages).toHaveLength(3);
  });
});
