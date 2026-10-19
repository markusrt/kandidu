import { describe, expect, it } from "vitest";
import {
  addComment,
  assertNotImported,
  createLeadsFromDrafts,
  currentStatus,
  deleteComment,
  editComment,
  type LeadDraft,
  LeadError,
  leadLinkIssues,
  reviseLead,
  setCoverLetterPdf,
  validateLeadDraft,
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
      [],
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
      code(() => createLeadsFromDrafts([bad], "p", [], "r", () => "x", NOW)),
    ).toBe("lead-invalid");
  });

  it("uses the only project link as the entered link (FR-051)", () => {
    const lead = (links: string[], extra: Partial<LeadDraft> = {}) =>
      createLeadsFromDrafts(
        [{ ...draft(), ...extra }],
        "p",
        links,
        "r",
        () => "x",
        NOW,
      )[0];
    const only = "https://example.org/stellen/1";
    const other = "https://example.org/anders";
    expect(lead([only])?.sourceUrl).toBe(only);
    expect(lead([only])?.sources).toBeUndefined();
    expect(lead([only], { sourceUrl: only })?.sources).toBeUndefined();
    // Several links: Kandidu cannot tell, so the LLM's value stays.
    expect(
      lead([only, "https://example.org/stellen/2"])?.sourceUrl,
    ).toBeUndefined();
    expect(
      lead([only, "https://example.org/stellen/2"], { sourceUrl: other })
        ?.sourceUrl,
    ).toBe(other);
    expect(lead([])?.sourceUrl).toBeUndefined();
    // One link and a different LLM value: the entered link wins, the other
    // link is kept as a source (every link is stored, R2).
    const replaced = lead([only], {
      sourceUrl: other,
      sources: [{ title: "Impressum", url: "https://example.org/i" }],
    });
    expect(replaced?.sourceUrl).toBe(only);
    expect(replaced?.sources).toEqual([
      { title: "Impressum", url: "https://example.org/i" },
      { url: other },
    ]);
    expect(
      lead([only], { sourceUrl: other, sources: [{ url: other }] })?.sources,
    ).toEqual([{ url: other }]);
    const full = Array.from({ length: 20 }, (_, i) => ({
      url: `https://example.org/q/${i}`,
    }));
    expect(lead([only], { sourceUrl: other, sources: full })?.sources).toEqual(
      full,
    );
  });

  it("keeps the original posting and the sources", () => {
    const [lead] = createLeadsFromDrafts(
      [
        {
          ...draft(),
          originalPostingUrl: "https://karriere.example.org/1",
          sources: [{ title: "Impressum", url: "https://example.org/i" }],
        },
      ],
      "p",
      [],
      "r",
      () => "x",
      NOW,
    );
    expect(lead?.originalPostingUrl).toBe("https://karriere.example.org/1");
    expect(lead?.sources).toEqual([
      { title: "Impressum", url: "https://example.org/i" },
    ]);
  });
});

describe("leadLinkIssues (FR-050)", () => {
  it("names each bad field and source position", () => {
    expect(leadLinkIssues(draft())).toEqual([]);
    expect(
      leadLinkIssues({
        ...draft(),
        sourceUrl: "example.org",
        company: {
          name: "Firma",
          website: `https://e.org/${"x".repeat(2000)}`,
        },
        sources: [
          { url: "https://example.org/a" },
          { url: "https://example.org/a" },
          { title: "Ohne Link", url: "" },
          { title: "x".repeat(201), url: "https://example.org/b" },
          { url: "ftp://example.org" },
        ],
      }),
    ).toEqual([
      { field: "sourceUrl", code: "link-invalid" },
      { field: "companyWebsite", code: "too-long" },
      { field: { source: 1 }, code: "link-duplicate" },
      { field: { source: 2 }, code: "link-invalid" },
      { field: { source: 3 }, code: "too-long" },
      { field: { source: 4 }, code: "link-invalid" },
    ]);
  });
});

describe("validateLeadDraft links (FR-050)", () => {
  const source = (n: number) => ({ url: `https://example.org/q/${n}` });
  const check = (extra: Partial<LeadDraft>) =>
    code(() => validateLeadDraft({ ...draft(), ...extra }));

  it("accepts http(s) links and up to 20 unique sources", () => {
    expect(check({ sourceUrl: "http://example.org/a" })).toBeUndefined();
    expect(
      check({ sources: Array.from({ length: 20 }, (_, i) => source(i)) }),
    ).toBeUndefined();
  });

  it("rejects other links, long titles, duplicates and too many sources", () => {
    expect(check({ sourceUrl: "example.org/a" })).toBe("lead-invalid");
    expect(check({ originalPostingUrl: "javascript:alert(1)" })).toBe(
      "lead-invalid",
    );
    expect(
      check({
        company: {
          name: "Firma",
          website: `https://e.org/${"x".repeat(2000)}`,
        },
      }),
    ).toBe("lead-invalid");
    expect(
      check({ application: { channel: "portal", portalUrl: "ftp://e.org" } }),
    ).toBe("lead-invalid");
    expect(check({ sources: [{ url: "mailto:a@example.org" }] })).toBe(
      "lead-invalid",
    );
    expect(check({ sources: [{ url: "" }] })).toBe("lead-invalid");
    expect(check({ sources: [source(1), source(1)] })).toBe("lead-invalid");
    expect(check({ sources: [{ ...source(1), title: "x".repeat(201) }] })).toBe(
      "lead-invalid",
    );
    expect(
      check({ sources: Array.from({ length: 21 }, (_, i) => source(i)) }),
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
      { salutationOverride: "  Liebes Team,  " },
      NOW,
    );
    expect(next.motivation).toBe("Neu.");
    expect(next.salutationOverride).toBe("Liebes Team,");
    expect(next.updatedAt).toBe(NOW);
    const cleared = reviseLead(next, draft(), { salutationOverride: " " }, NOW);
    expect("salutationOverride" in cleared).toBe(false);
  });

  it("replaces the original posting and the sources (FR-050)", () => {
    const withLinks = sampleLead({
      originalPostingUrl: "https://karriere.example.org/1",
      sources: [{ url: "https://example.org/a" }],
    });
    const edited = reviseLead(
      withLinks,
      {
        ...draft(),
        originalPostingUrl: "https://karriere.example.org/2",
        sources: [{ title: "Neu", url: "https://example.org/b" }],
      },
      {},
      NOW,
    );
    expect(edited.originalPostingUrl).toBe("https://karriere.example.org/2");
    expect(edited.sources).toEqual([
      { title: "Neu", url: "https://example.org/b" },
    ]);
    const cleared = reviseLead(edited, draft(), {}, NOW);
    expect(cleared.originalPostingUrl).toBeUndefined();
    expect(cleared.sources).toBeUndefined();
    expect(() =>
      reviseLead(withLinks, { ...draft(), sourceUrl: "kein-link" }, {}, NOW),
    ).toThrow(LeadError);
  });

  it("sets, trims and clears the lead's own Stelle (FR-049)", () => {
    const next = reviseLead(
      sampleLead(),
      draft(),
      { letterPosition: "  Kaufmann für Büromanagement " },
      NOW,
    );
    expect(next.letterPosition).toBe("Kaufmann für Büromanagement");
    expect("letterPosition" in reviseLead(next, draft(), {}, NOW)).toBe(false);
    expect(
      "letterPosition" in
        reviseLead(next, draft(), { letterPosition: "   " }, NOW),
    ).toBe(false);
    expect(
      code(() =>
        reviseLead(
          sampleLead(),
          draft(),
          { letterPosition: "x".repeat(201) },
          NOW,
        ),
      ),
    ).toBe("lead-invalid");
    expect(
      reviseLead(
        sampleLead(),
        draft(),
        { letterPosition: "x".repeat(200) },
        NOW,
      ).letterPosition,
    ).toHaveLength(200);
  });

  it("is locked outside review", () => {
    const ready = sampleLead({ status: "ready" });
    expect(code(() => reviseLead(ready, draft(), {}, NOW))).toBe(
      "not-in-review",
    );
    expect(
      code(() =>
        reviseLead(
          sampleLead({ status: "ready", letterPosition: "Alt" }),
          draft(),
          { letterPosition: "Neu" },
          NOW,
        ),
      ),
    ).toBe("not-in-review");
    expect(code(() => setCoverLetterPdf(ready, pdf, NOW))).toBe(
      "not-in-review",
    );
  });

  it("rejects too long fields", () => {
    const long = { ...draft(), research: "x".repeat(50_001) };
    expect(code(() => reviseLead(sampleLead(), long, {}, NOW))).toBe(
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

describe("comments (FR-035)", () => {
  const LATER = "2026-10-19T09:00:00.000Z";

  it("adds, edits and deletes dated comments in any status", () => {
    const sent = sampleLead({ status: "sent" });
    const one = addComment(
      sent,
      { date: "2026-10-18", text: "  Bestätigungs-E-Mail erhalten  " },
      "c1",
      NOW,
    );
    expect(one.comments).toEqual([
      {
        id: "c1",
        date: "2026-10-18",
        text: "Bestätigungs-E-Mail erhalten",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
    const two = addComment(
      one,
      { date: "2026-10-19", text: "Anruf" },
      "c2",
      NOW,
    );
    const edited = editComment(
      two,
      "c1",
      { date: "2026-10-17", text: "Eingangsbestätigung" },
      LATER,
    );
    expect(edited.comments[0]).toMatchObject({
      id: "c1",
      date: "2026-10-17",
      text: "Eingangsbestätigung",
      createdAt: NOW,
      updatedAt: LATER,
    });
    expect(edited.updatedAt).toBe(LATER);
    const deleted = deleteComment(edited, "c1", LATER);
    expect(deleted.comments.map((c) => c.id)).toEqual(["c2"]);
  });

  it("refuses empty or too long text, bad dates and unknown ids", () => {
    const lead = sampleLead();
    const add = (input: { date: string; text: string }) =>
      code(() => addComment(lead, input, "c", NOW));
    expect(add({ date: "2026-10-18", text: "   " })).toBe("comment-invalid");
    expect(add({ date: "2026-10-18", text: "x".repeat(2001) })).toBe(
      "comment-invalid",
    );
    expect(add({ date: "18.10.2026", text: "x" })).toBe("comment-invalid");
    expect(add({ date: "2026-10-18", text: "x".repeat(2000) })).toBeUndefined();
    expect(
      code(() =>
        editComment(lead, "nope", { date: "2026-10-18", text: "x" }, NOW),
      ),
    ).toBe("comment-not-found");
    expect(code(() => deleteComment(lead, "nope", NOW))).toBe(
      "comment-not-found",
    );
  });
});
