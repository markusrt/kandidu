import { describe, expect, it } from "vitest";
import { sampleLead } from "../../domain/testing";
import { draftFromForm, formFromLead } from "./leadForm";

describe("draftFromForm", () => {
  const base = formFromLead(sampleLead());
  // All optional fields blank; required ones keep valid values.
  const blank: typeof base = {
    ...base,
    sourceUrl: "",
    referenceNumber: "",
    location: "",
    startDate: "",
    employmentType: "",
    companyWebsite: "",
    companyStreet: "",
    companyPostalCode: "",
    companyCity: "",
    companyCountry: "",
    contactSalutation: "",
    contactTitle: "",
    contactFirstName: "",
    contactLastName: "",
    contactRole: "",
    contactEmail: "",
    contactPhone: "",
    portalUrl: "",
    applicationEmail: "",
    postalStreet: "",
    postalPostalCode: "",
    postalCity: "",
    postalCountry: "",
    deadline: "",
    notes: "",
    salutationOverride: "",
  };

  it("keeps required fields and trims strings", () => {
    const draft = draftFromForm({
      ...blank,
      positionTitle: "  Kaufmann  ",
      companyName: " Muster GmbH ",
      motivation: "  Text  ",
    });
    expect(draft.position.title).toBe("Kaufmann");
    expect(draft.company.name).toBe("Muster GmbH");
    expect(draft.motivation).toBe("Text");
  });

  it("omits empty optional fields and empty nested objects", () => {
    const draft = draftFromForm({
      ...blank,
      sourceUrl: "  ",
      referenceNumber: "",
      companyWebsite: " ",
      companyStreet: "",
      companyPostalCode: "",
      companyCity: "",
      companyCountry: "",
      contactSalutation: "",
      contactFirstName: "  ",
      contactLastName: "",
      postalStreet: "",
      postalPostalCode: "",
      postalCity: "",
      postalCountry: "",
      deadline: "",
      notes: "",
    });
    expect("sourceUrl" in draft).toBe(false);
    expect("contact" in draft).toBe(false);
    expect("referenceNumber" in draft.position).toBe(false);
    expect("website" in draft.company).toBe(false);
    expect("address" in draft.company).toBe(false);
    expect("postalAddress" in draft.application).toBe(false);
    expect("deadline" in draft.application).toBe(false);
  });

  it("keeps filled optional parts only", () => {
    const draft = draftFromForm({
      ...blank,
      contactSalutation: "Frau",
      contactLastName: " Muster ",
      companyCity: "Berlin",
    });
    expect(draft.contact).toEqual({ salutation: "Frau", lastName: "Muster" });
    expect(draft.company.address).toEqual({ city: "Berlin" });
  });

  it("round-trips a lead through the form", () => {
    const lead = sampleLead();
    const draft = draftFromForm(formFromLead(lead));
    expect(draft.position).toEqual(lead.position);
    expect(draft.company).toEqual(lead.company);
    expect(draft.application).toEqual(lead.application);
  });
});
