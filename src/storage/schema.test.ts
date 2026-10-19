import { describe, expect, it } from "vitest";
import { sampleLead, sampleProject } from "../domain/testing";
import {
  documentSchema,
  leadSchema,
  metaSchema,
  profileSchema,
  projectSchema,
  templateSchema,
} from "./schema";

describe("persisted schemas", () => {
  it("accept valid records", () => {
    expect(
      metaSchema.safeParse({ schemaVersion: 1, revision: 0 }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        firstName: "Erika",
        lastName: "Musterfrau",
        street: "Musterweg 1",
        postalCode: "12345",
        city: "Musterstadt",
        phone: "030 1234567",
        email: "erika@example.org",
        updatedAt: "2026-10-18T10:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      templateSchema.safeParse({
        kind: "cv",
        fileName: "cv.docx",
        fileId: "f1",
        size: 10,
        uploadedAt: "t",
        tags: ["Vorname"],
      }).success,
    ).toBe(true);
    expect(leadSchema.safeParse(sampleLead()).success).toBe(true);
    expect(projectSchema.safeParse(sampleProject()).success).toBe(true);
  });

  it("reject unknown status, missing history and duplicate ids", () => {
    expect(
      leadSchema.safeParse({ ...sampleLead(), status: "lost" }).success,
    ).toBe(false);
    expect(leadSchema.safeParse({ ...sampleLead(), history: [] }).success).toBe(
      false,
    );
    const lead = sampleLead();
    const duplicated = { ...lead, comments: [comment("c"), comment("c")] };
    expect(leadSchema.safeParse(duplicated).success).toBe(false);
  });

  it("enforce limits", () => {
    expect(
      projectSchema.safeParse({ ...sampleProject(), title: "x".repeat(121) })
        .success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({
        ...sampleProject(),
        promptContext: "x".repeat(2001),
      }).success,
    ).toBe(false);
    expect(
      documentSchema.safeParse({
        id: "d",
        role: "evidence",
        name: "",
        fileName: "a.pdf",
        tags: [],
        fileId: "f",
        size: 1,
        pageCount: 1,
        uploadedAt: "t",
      }).success,
    ).toBe(false);
  });

  it("reject unexpected fields", () => {
    expect(leadSchema.safeParse({ ...sampleLead(), secret: "x" }).success).toBe(
      false,
    );
  });

  it("accept the optional v2 fields and enforce their limits", () => {
    const source = (n: number) => ({ url: `https://example.org/q/${n}` });
    const lead = (patch: object) =>
      leadSchema.safeParse({ ...sampleLead(), ...patch }).success;
    const project = (patch: object) =>
      projectSchema.safeParse({ ...sampleProject(), ...patch }).success;

    expect(
      lead({
        letterPosition: "Industriekaufmann",
        originalPostingUrl: "https://karriere.example.org/1",
        sources: [{ title: "Impressum", ...source(1) }, source(2)],
      }),
    ).toBe(true);
    expect(lead({ sources: [] })).toBe(true);
    expect(project({ position: "Industriekaufmann" })).toBe(true);

    expect(lead({ letterPosition: "" })).toBe(false);
    expect(lead({ letterPosition: "x".repeat(201) })).toBe(false);
    expect(project({ position: "" })).toBe(false);
    expect(project({ position: "x".repeat(201) })).toBe(false);
    expect(
      lead({ sources: Array.from({ length: 21 }, (_, i) => source(i)) }),
    ).toBe(false);
    expect(lead({ sources: [source(1), source(1)] })).toBe(false);
    expect(lead({ sources: [{ ...source(1), title: "x".repeat(201) }] })).toBe(
      false,
    );
    expect(lead({ sources: [{ ...source(1), extra: 1 }] })).toBe(false);
    expect(lead({ originalPostingUrl: "x".repeat(2001) })).toBe(false);
  });
});

function comment(id: string) {
  return { id, date: "2026-10-18", text: "x", createdAt: "t", updatedAt: "t" };
}
