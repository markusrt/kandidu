import { describe, expect, it } from "vitest";
import {
  assertNotImported,
  createLeadsFromDrafts,
  currentStatus,
  type LeadDraft,
  LeadError,
  reviseLead,
  setCoverLetterPdf,
} from "./lead";
import { sampleLead } from "./testing";

const NOW = "2026-10-18T12:00:00.000Z";
const pdf = {
  fileId: "f1",
  fileName: "a.pdf",
  size: 1,
  pageCount: 1,
  uploadedAt: NOW,
};

function draft(): LeadDraft {
  const {
    position,
    company,
    contact,
    application,
    process,
    research,
    motivation,
  } = sampleLead();
  return {
    position,
    company,
    ...(contact ? { contact } : {}),
    application,
    process,
    research,
    motivation,
  };
}

function code(run: () => unknown) {
  try {
    run();
  } catch (cause) {
    return cause instanceof LeadError ? cause.code : "other";
  }
  return undefined;
}

describe("createLeadsFromDrafts", () => {
  it("creates leads in review with origin and an initial history entry", () => {
    let n = 0;
    const leads = createLeadsFromDrafts(
      [draft(), draft()],
      "p1",
      "r1",
      () => `id${++n}`,
      NOW,
    );
    expect(leads).toHaveLength(2);
    expect(leads[1]).toMatchObject({
      id: "id3",
      projectId: "p1",
      responseId: "r1",
      responseIndex: 1,
      status: "review",
      history: [{ id: "id4", status: "review", at: NOW }],
      packages: [],
    });
  });

  it("validates required fields", () => {
    const bad = { ...draft(), company: { name: " " } };
    expect(
      code(() => createLeadsFromDrafts([bad], "p", "r", () => "x", NOW)),
    ).toBe("lead-invalid");
  });
});

describe("assertNotImported", () => {
  it("refuses a response that already created leads", () => {
    expect(
      code(() => assertNotImported({ id: "r", importedLeadIds: ["a"] })),
    ).toBe("already-imported");
    expect(
      code(() => assertNotImported({ id: "r", importedLeadIds: [] })),
    ).toBe(undefined);
  });
});

describe("reviseLead", () => {
  it("replaces content and trims the salutation override", () => {
    const next = reviseLead(
      sampleLead(),
      { ...draft(), motivation: "Neu." },
      "  Liebes Team,  ",
      NOW,
    );
    expect(next.motivation).toBe("Neu.");
    expect(next.salutationOverride).toBe("Liebes Team,");
    expect(next.updatedAt).toBe(NOW);
    const cleared = reviseLead(next, draft(), " ", NOW);
    expect("salutationOverride" in cleared).toBe(false);
  });

  it("is locked outside review", () => {
    const ready = sampleLead({ status: "ready" });
    expect(code(() => reviseLead(ready, draft(), undefined, NOW))).toBe(
      "not-in-review",
    );
    expect(code(() => setCoverLetterPdf(ready, pdf, NOW))).toBe(
      "not-in-review",
    );
  });

  it("rejects too long fields", () => {
    const long = { ...draft(), research: "x".repeat(50_001) };
    expect(code(() => reviseLead(sampleLead(), long, undefined, NOW))).toBe(
      "lead-invalid",
    );
  });
});

describe("currentStatus", () => {
  it("skips undone entries", () => {
    expect(
      currentStatus([
        { id: "1", status: "review", at: NOW },
        { id: "2", status: "ready", at: NOW, undoneAt: NOW },
      ]),
    ).toBe("review");
  });
});
