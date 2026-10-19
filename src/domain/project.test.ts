import { describe, expect, it } from "vitest";
import type { LeadDraft } from "./lead";
import {
  addLink,
  addResponse,
  createProject,
  findImportedResponse,
  isPromptChangedSinceCopy,
  LINK_MAX,
  LINKS_MAX,
  markPromptCopied,
  markResponseImported,
  type ParseResult,
  PROJECT_TITLE_MAX,
  PROMPT_CONTEXT_MAX,
  type Project,
  ProjectError,
  type ProjectErrorCode,
  partialImport,
  promptFingerprint,
  RESPONSE_MAX,
  removeLink,
  renameProject,
  type StoredResponse,
  setPromptContext,
  setResponseDraft,
  updateLink,
} from "./project";

const T0 = "2026-01-01T00:00:00.000Z";
const T1 = "2026-01-02T00:00:00.000Z";

function expectCode(fn: () => unknown, code: ProjectErrorCode): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ProjectError);
    expect((e as ProjectError).code).toBe(code);
    return;
  }
  throw new Error(`expected ProjectError ${code}`);
}

const base = (): Project => createProject("Search", "p1", T0);
const withLink = (): Project =>
  addLink(base(), "https://a.example/x", "l1", T0);

function response(importedLeadIds: string[] = []): StoredResponse {
  return {
    id: "r1",
    text: "[]",
    receivedAt: T0,
    result: { ok: true, leads: [], warnings: [] },
    importedLeadIds,
  };
}

describe("createProject / renameProject", () => {
  it("creates a draft project with trimmed title", () => {
    expect(createProject("  Search  ", "p1", T0)).toEqual({
      id: "p1",
      title: "Search",
      links: [],
      promptContext: "",
      promptState: "draft",
      responses: [],
      responseDraft: "",
      createdAt: T0,
      updatedAt: T0,
    });
  });

  it("rejects empty, blank and too long titles", () => {
    expectCode(() => createProject("", "p", T0), "title-invalid");
    expectCode(() => createProject("   ", "p", T0), "title-invalid");
    expectCode(
      () => createProject("x".repeat(PROJECT_TITLE_MAX + 1), "p", T0),
      "title-invalid",
    );
    expect(
      createProject("x".repeat(PROJECT_TITLE_MAX), "p", T0).title,
    ).toHaveLength(PROJECT_TITLE_MAX);
  });

  it("renames with the same rule and updates updatedAt", () => {
    const p = base();
    const r = renameProject(p, " New ", T1);
    expect(r.title).toBe("New");
    expect(r.updatedAt).toBe(T1);
    expect(p.title).toBe("Search");
    expectCode(() => renameProject(p, " ", T1), "title-invalid");
  });
});

describe("links", () => {
  it("adds a trimmed link without mutating the input", () => {
    const p = base();
    const r = addLink(p, "  https://a.example/x ", "l1", T1);
    expect(r.links).toEqual([{ id: "l1", url: "https://a.example/x" }]);
    expect(r.updatedAt).toBe(T1);
    expect(p.links).toEqual([]);
  });

  it("rejects invalid urls", () => {
    expectCode(() => addLink(base(), "nope", "l", T1), "link-invalid");
    expectCode(
      () => addLink(base(), "ftp://a.example", "l", T1),
      "link-invalid",
    );
    expectCode(
      () =>
        addLink(base(), `https://a.example/${"x".repeat(LINK_MAX)}`, "l", T1),
      "link-invalid",
    );
  });

  it("rejects duplicates after trimming", () => {
    expectCode(
      () => addLink(withLink(), " https://a.example/x ", "l2", T1),
      "link-duplicate",
    );
  });

  it("rejects more than LINKS_MAX links", () => {
    let p = base();
    for (let i = 0; i < LINKS_MAX; i++) {
      p = addLink(p, `https://a.example/${i}`, `l${i}`, T0);
    }
    expectCode(
      () => addLink(p, "https://a.example/new", "n", T1),
      "too-many-links",
    );
  });

  it("updates a link and allows keeping its own url", () => {
    const r = updateLink(withLink(), "l1", "https://b.example", T1);
    expect(r.links).toEqual([{ id: "l1", url: "https://b.example" }]);
    expect(
      updateLink(withLink(), "l1", "https://a.example/x", T1).links,
    ).toHaveLength(1);
  });

  it("update validates url, duplicates and id", () => {
    const p = addLink(withLink(), "https://b.example", "l2", T0);
    expectCode(() => updateLink(p, "l1", "bad", T1), "link-invalid");
    expectCode(
      () => updateLink(p, "l1", "https://b.example", T1),
      "link-duplicate",
    );
    expectCode(
      () => updateLink(p, "zz", "https://c.example", T1),
      "link-not-found",
    );
  });

  it("removes a link or reports unknown id", () => {
    const r = removeLink(withLink(), "l1", T1);
    expect(r.links).toEqual([]);
    expect(r.updatedAt).toBe(T1);
    expectCode(() => removeLink(withLink(), "zz", T1), "link-not-found");
  });
});

describe("prompt context and fingerprint", () => {
  it("stores context untrimmed and enforces the maximum", () => {
    expect(setPromptContext(base(), "  hi  ", T1).promptContext).toBe("  hi  ");
    expect(
      setPromptContext(base(), "x".repeat(PROMPT_CONTEXT_MAX), T1)
        .promptContext,
    ).toHaveLength(PROMPT_CONTEXT_MAX);
    expectCode(
      () => setPromptContext(base(), "x".repeat(PROMPT_CONTEXT_MAX + 1), T1),
      "context-too-long",
    );
  });

  it("fingerprint is deterministic and input-sensitive", () => {
    const p = withLink();
    expect(promptFingerprint(p)).toMatch(/^[0-9a-f]{8}$/);
    expect(promptFingerprint(p)).toBe(
      promptFingerprint({ ...p, updatedAt: T1 }),
    );
    expect(promptFingerprint(p)).not.toBe(
      promptFingerprint(renameProject(p, "Other", T1)),
    );
    expect(promptFingerprint(p)).not.toBe(
      promptFingerprint(setPromptContext(p, "c", T1)),
    );
    expect(promptFingerprint(p)).not.toBe(
      promptFingerprint(addLink(p, "https://b.example", "l2", T1)),
    );
  });
});

describe("promptState transitions", () => {
  it("requires a link to mark copied", () => {
    expectCode(() => markPromptCopied(base(), T1), "no-links");
  });

  it("draft -> copied records time and fingerprint", () => {
    const p = withLink();
    const r = markPromptCopied(p, T1);
    expect(r.promptState).toBe("copied");
    expect(r.promptCopiedAt).toBe(T1);
    expect(r.promptCopiedFingerprint).toBe(promptFingerprint(p));
    expect(r.updatedAt).toBe(T1);
    expect(p.promptState).toBe("draft");
  });

  it("copied stays copied on re-copy", () => {
    const r = markPromptCopied(markPromptCopied(withLink(), T0), T1);
    expect(r.promptState).toBe("copied");
    expect(r.promptCopiedAt).toBe(T1);
  });

  it("answered -> copied on copy", () => {
    const answered = markResponseImported(
      addResponse(withLink(), response(), T0),
      "r1",
      ["x"],
      T0,
    );
    expect(answered.promptState).toBe("answered");
    expect(markPromptCopied(answered, T1).promptState).toBe("copied");
  });

  it("detects changes since copy", () => {
    const p = withLink();
    expect(isPromptChangedSinceCopy(p)).toBe(false);
    const copied = markPromptCopied(p, T0);
    expect(isPromptChangedSinceCopy(copied)).toBe(false);
    expect(isPromptChangedSinceCopy(setPromptContext(copied, "more", T1))).toBe(
      true,
    );
  });
});

describe("responses", () => {
  it("limits the draft size", () => {
    expect(setResponseDraft(base(), "abc", T1).responseDraft).toBe("abc");
    expectCode(
      () => setResponseDraft(base(), "x".repeat(RESPONSE_MAX + 1), T1),
      "draft-too-large",
    );
  });

  it("addResponse without imported leads keeps state and the draft", () => {
    const p = markPromptCopied(setResponseDraft(withLink(), "draft", T0), T0);
    const r = addResponse(p, response(), T1);
    expect(r.responses).toHaveLength(1);
    expect(r.responseDraft).toBe("draft");
    expect(r.promptState).toBe("copied");
    expect(r.updatedAt).toBe(T1);
  });

  it("addResponse with imported leads sets answered", () => {
    const p = setResponseDraft(withLink(), "draft", T0);
    const r = addResponse(p, response(["a"]), T1);
    expect(r.promptState).toBe("answered");
    expect(r.responseDraft).toBe("");
  });

  it("markResponseImported sets lead ids and answered", () => {
    const p = addResponse(
      setResponseDraft(withLink(), "draft", T0),
      response(),
      T0,
    );
    const r = markResponseImported(p, "r1", ["a", "b"], T1);
    expect(r.responseDraft).toBe("");
    expect(r.responses[0]?.importedLeadIds).toEqual(["a", "b"]);
    expect(r.promptState).toBe("answered");
    expect(p.responses[0]?.importedLeadIds).toEqual([]);
  });
});

describe("findImportedResponse (FR-021)", () => {
  it("finds an earlier imported response with the same text", () => {
    const imported = { ...response(["a"]), text: '  {"leads": []}  ' };
    const p = addResponse(withLink(), imported, T1);
    expect(findImportedResponse(p, '{"leads": []}')?.id).toBe(imported.id);
    expect(findImportedResponse(p, "anders")).toBeUndefined();
    expect(findImportedResponse(p, "  ")).toBeUndefined();
  });

  it("ignores responses that created no leads", () => {
    const failed = { ...response(), text: "x" };
    expect(
      findImportedResponse(addResponse(withLink(), failed, T1), "x"),
    ).toBeUndefined();
  });
});

describe("partialImport (FR-021)", () => {
  // Only the count of drafts matters here.
  const draft = {} as unknown as LeadDraft;
  const invalid = (
    entries: number[],
    validLeads: LeadDraft[],
  ): ParseResult => ({
    ok: false,
    error: "schema-invalid",
    issues: entries.map((entry) => ({
      entry,
      path: ["company", "name"],
      kind: "missing",
    })),
    validLeads,
    warnings: [],
  });

  it("counts valid entries against all entries", () => {
    // Entry 2 has two issues but counts once.
    expect(partialImport(invalid([2, 2], [draft, draft]))).toEqual({
      valid: 2,
      total: 3,
    });
  });

  it("offers nothing without valid entries, for global issues or other errors", () => {
    expect(partialImport(invalid([1], []))).toBeUndefined();
    expect(partialImport(invalid([0], [draft]))).toBeUndefined();
    expect(partialImport({ ok: false, error: "json-invalid" })).toBeUndefined();
    expect(
      partialImport({ ok: true, leads: [draft], warnings: [] }),
    ).toBeUndefined();
  });
});
