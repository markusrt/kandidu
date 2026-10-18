import { describe, expect, it } from "vitest";
import {
  buildCoverLetterData,
  buildCvData,
  type LetterFormatter,
  letterAddress,
  missingValues,
  salutationKind,
} from "./letterData";
import { sampleLead, sampleProfile } from "./testing";

const fmt: LetterFormatter = {
  longDate: (d) => `long(${d})`,
  shortDate: (d) => `short(${d})`,
  salutation: (kind, contact) => `${kind}:${contact?.lastName ?? ""}`,
  contactName: (contact) =>
    [contact?.salutation, contact?.title, contact?.firstName, contact?.lastName]
      .filter(Boolean)
      .join(" "),
};

describe("salutationKind", () => {
  it("needs a salutation and a last name", () => {
    expect(salutationKind({ salutation: "Frau", lastName: "Muster" })).toBe(
      "female",
    );
    expect(salutationKind({ salutation: "Herr", lastName: "Muster" })).toBe(
      "male",
    );
    expect(salutationKind({ salutation: "Frau" })).toBe("neutral");
    expect(salutationKind({ lastName: "Muster" })).toBe("neutral");
    expect(salutationKind(undefined)).toBe("neutral");
  });
});

describe("buildCvData", () => {
  it("fills personal data and formats the birth date", () => {
    const data = buildCvData(
      { ...sampleProfile(), birthDate: "2001-04-30" },
      fmt,
    );
    expect(data.Vorname).toBe("Erika");
    expect(data.Name).toBe("Erika Musterfrau");
    expect(data.Geburtsdatum).toBe("short(2001-04-30)");
    expect(data.Website).toBe("");
  });

  it("works without a profile", () => {
    expect(buildCvData(undefined, fmt).Name).toBe("");
  });
});

describe("buildCoverLetterData", () => {
  it("combines profile and lead data with motivation paragraphs", () => {
    const data = buildCoverLetterData(
      sampleProfile(),
      sampleLead(),
      "2026-10-18",
      fmt,
    );
    expect(data.Firma).toBe("Beispiel GmbH");
    expect(data.FirmaOrt).toBe("Beispielstadt");
    expect(data.Datum).toBe("long(2026-10-18)");
    expect(data.Briefanrede).toBe("female:Muster");
    expect(data.Ansprechpartner).toBe("Frau Dr. Eva Muster");
    expect(data.Motivation).toEqual([
      { Absatz: "Absatz eins." },
      { Absatz: "Absatz zwei." },
    ]);
  });

  it("uses the salutation override and the application postal address", () => {
    const lead = sampleLead({
      salutationOverride: "Liebes Team,",
      application: {
        channel: "post",
        postalAddress: {
          street: "Postfach 1",
          postalCode: "11111",
          city: "Post",
        },
      },
    });
    const data = buildCoverLetterData(sampleProfile(), lead, "2026-10-18", fmt);
    expect(data.Briefanrede).toBe("Liebes Team,");
    expect(data.FirmaStrasse).toBe("Postfach 1");
    expect(letterAddress(sampleLead()).city).toBe("Beispielstadt");
  });
});

describe("missingValues", () => {
  it("lists used placeholders that would stay empty", () => {
    const { contact: _dropped, ...rest } = sampleLead();
    const lead = { ...rest, motivation: " " };
    const data = buildCoverLetterData(sampleProfile(), lead, "2026-10-18", fmt);
    expect(
      missingValues(
        ["Vorname", "AnsprechpartnerNachname", "Motivation", "Absatz", "Foo"],
        data,
      ),
    ).toEqual(["AnsprechpartnerNachname", "Motivation"]);
  });
});
