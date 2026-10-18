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
});

function comment(id: string) {
  return { id, date: "2026-10-18", text: "x", createdAt: "t", updatedAt: "t" };
}
