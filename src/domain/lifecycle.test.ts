import { describe, expect, it } from "vitest";
import { LeadError } from "./lead";
import { backToReview, confirmGate, gateMissing } from "./lifecycle";
import {
  addItem,
  defaultPackage,
  effectivePackages,
  moveItem,
  removeItem,
  renamePackage,
  setPackages,
} from "./packages";
import { sampleLead } from "./testing";

const NOW = "2026-10-18T12:00:00.000Z";
const pdf = {
  fileId: "f1",
  fileName: "a.pdf",
  size: 1,
  pageCount: 1,
  uploadedAt: NOW,
};
const withPdf = () => sampleLead({ coverLetterPdf: pdf });
const ok = { cvPresent: true, confirmed: true };

function code(run: () => unknown) {
  try {
    run();
  } catch (cause) {
    return cause instanceof LeadError ? cause.code : "other";
  }
  return undefined;
}

describe("confirmGate (FR-029)", () => {
  it("moves a complete lead to ready", () => {
    const ready = confirmGate(withPdf(), ok, "h2", NOW);
    expect(ready.status).toBe("ready");
    expect(ready.history.at(-1)).toEqual({
      id: "h2",
      status: "ready",
      at: NOW,
    });
  });

  it.each([
    ["no cover letter PDF", sampleLead(), ok],
    ["no CV PDF", withPdf(), { cvPresent: false, confirmed: true }],
    ["no confirmation", withPdf(), { cvPresent: true, confirmed: false }],
  ])("stays in review with %s", (_label, lead, input) => {
    expect(code(() => confirmGate(lead, input, "h", NOW))).toBe(
      "gate-incomplete",
    );
  });

  it("names what is missing", () => {
    expect(
      gateMissing(sampleLead(), { cvPresent: false, confirmed: true }),
    ).toEqual({ coverLetterPdf: true, cvPdf: true, confirmation: false });
  });

  it("only applies in review", () => {
    const ready = confirmGate(withPdf(), ok, "h2", NOW);
    expect(code(() => confirmGate(ready, ok, "h3", NOW))).toBe(
      "transition-not-allowed",
    );
  });
});

describe("backToReview", () => {
  it("undoes the ready entry and drops the cover letter PDF", () => {
    const ready = confirmGate(withPdf(), ok, "h2", NOW);
    const back = backToReview(ready, NOW);
    expect(back.status).toBe("review");
    expect(back.coverLetterPdf).toBeUndefined();
    expect(back.history.at(-1)?.undoneAt).toBe(NOW);
    expect(code(() => backToReview(back, NOW))).toBe("transition-not-allowed");
  });
});

describe("packages", () => {
  const def = defaultPackage("pk", "2026-10-18_Beispiel_Bewerbung");

  it("defaults to cover letter then CV", () => {
    expect(def).toEqual({
      id: "pk",
      fileName: "2026-10-18_Beispiel_Bewerbung.pdf",
      items: [{ kind: "coverLetter" }, { kind: "cv" }],
    });
    expect(effectivePackages(sampleLead(), () => def)).toEqual([def]);
  });

  it("reorders, renames, adds without duplicates and keeps one item", () => {
    expect(moveItem(def, 0, 1).items[0]).toEqual({ kind: "cv" });
    expect(moveItem(def, 0, -1)).toBe(def);
    expect(renamePackage(def, "Alles in einem").fileName).toBe(
      "Alles_in_einem.pdf",
    );
    const doc = { kind: "document", documentId: "d1" } as const;
    expect(addItem(addItem(def, doc), doc).items).toHaveLength(3);
    const single = removeItem(def, 0);
    expect(single.items).toEqual([{ kind: "cv" }]);
    expect(removeItem(single, 0)).toBe(single);
  });

  it("stores unique names on released leads only", () => {
    const ready = confirmGate(withPdf(), ok, "h2", NOW);
    const stored = setPackages(ready, [def, { ...def, id: "pk2" }], NOW);
    expect(stored.packages.map((p) => p.fileName)).toEqual([
      "2026-10-18_Beispiel_Bewerbung.pdf",
      "2026-10-18_Beispiel_Bewerbung (2).pdf",
    ]);
    expect(code(() => setPackages(sampleLead(), [def], NOW))).toBe(
      "transition-not-allowed",
    );
    expect(code(() => setPackages(ready, [], NOW))).toBe("lead-invalid");
  });
});
