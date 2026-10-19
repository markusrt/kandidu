import { describe, expect, it } from "vitest";
import { type Lead, LeadError, type LeadStatus } from "./lead";
import {
  allowedTransitions,
  applyTransition,
  backToReview,
  confirmGate,
  gateMissing,
  nextInterview,
  TERMINAL_STATUSES,
  type TransitionInput,
  type TransitionTarget,
  undoableEntry,
  undoLast,
} from "./lifecycle";
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

describe("lifecycle transitions (FR-034)", () => {
  const DAY = "2026-10-20";
  const onsite = {
    dateTime: "2026-11-03T10:30",
    mode: "onsite" as const,
    location: " Hauptstraße 5, Beispielstadt ",
  };
  const ready = () => confirmGate(withPdf(), ok, "h2", NOW);
  let n = 0;
  const go = (lead: Lead, input: TransitionInput) =>
    applyTransition(lead, input, `e${++n}`, NOW);
  const dated = (status: Exclude<TransitionTarget, "interview">) =>
    ({ status, date: DAY }) as TransitionInput;
  const interview = { status: "interview", interview: onsite } as const;

  /** A lead in `status`, reached along the main path. */
  function leadIn(status: LeadStatus): Lead {
    const r = ready();
    switch (status) {
      case "review":
        return withPdf();
      case "ready":
        return r;
      case "sent":
        return go(r, dated("sent"));
      case "interview":
        return go(go(r, dated("sent")), interview);
      case "failed":
        return go(r, dated("failed"));
      default:
        return go(go(r, dated("sent")), dated(status as "accepted"));
    }
  }

  it("lists exactly the allowed targets per state", () => {
    expect(allowedTransitions("review")).toEqual(["withdrawn"]);
    expect(allowedTransitions("ready")).toEqual([
      "sent",
      "withdrawn",
      "failed",
    ]);
    expect(allowedTransitions("sent")).toEqual([
      "interview",
      "accepted",
      "rejected",
      "withdrawn",
      "failed",
    ]);
    expect(allowedTransitions("interview")).toEqual([
      "interview",
      "accepted",
      "rejected",
      "withdrawn",
    ]);
    for (const terminal of TERMINAL_STATUSES) {
      expect(allowedTransitions(terminal)).toEqual([]);
    }
  });

  it.each<[LeadStatus, TransitionTarget]>([
    ["review", "withdrawn"],
    ["ready", "sent"],
    ["ready", "withdrawn"],
    ["ready", "failed"],
    ["sent", "interview"],
    ["sent", "accepted"],
    ["sent", "rejected"],
    ["sent", "withdrawn"],
    ["sent", "failed"],
    ["interview", "interview"],
    ["interview", "accepted"],
    ["interview", "rejected"],
    ["interview", "withdrawn"],
  ])("allows %s → %s with a dated entry", (from, to) => {
    const before = leadIn(from);
    const after = go(before, to === "interview" ? interview : dated(to));
    expect(after.status).toBe(to);
    expect(after.history).toHaveLength(before.history.length + 1);
    const entry = after.history.at(-1);
    expect(entry?.at).toBe(NOW);
    if (to === "interview") {
      expect(entry?.interview).toEqual({
        ...onsite,
        location: "Hauptstraße 5, Beispielstadt",
      });
    } else {
      expect(entry?.date).toBe(DAY);
    }
  });

  it.each<[LeadStatus, TransitionTarget]>([
    ["review", "sent"],
    ["ready", "interview"],
    ["ready", "accepted"],
    ["interview", "failed"],
    ["accepted", "rejected"],
    ["rejected", "interview"],
    ["withdrawn", "sent"],
    ["failed", "sent"],
  ])("refuses %s → %s", (from, to) => {
    const lead = leadIn(from);
    expect(
      code(() => go(lead, to === "interview" ? interview : dated(to))),
    ).toBe("transition-not-allowed");
  });

  it("validates dates, interview times, location and online link", () => {
    const r = ready();
    expect(code(() => go(r, { status: "sent", date: "2026-02-30" }))).toBe(
      "lead-invalid",
    );
    const sent = go(r, dated("sent"));
    const bad = (patch: object) =>
      code(() =>
        go(sent, { status: "interview", interview: { ...onsite, ...patch } }),
      );
    expect(bad({ dateTime: "2026-11-03" })).toBe("lead-invalid");
    expect(bad({ dateTime: "2026-11-03T24:00" })).toBe("lead-invalid");
    expect(bad({ location: "x".repeat(201) })).toBe("lead-invalid");
    expect(bad({ mode: "online", link: "meet.example.org" })).toBe(
      "lead-invalid",
    );
    const online = go(sent, {
      status: "interview",
      interview: {
        dateTime: "2026-11-04T09:00",
        mode: "online",
        link: "https://meet.example.org/abc",
        location: "  ",
      },
    });
    expect(online.history.at(-1)?.interview).toEqual({
      dateTime: "2026-11-04T09:00",
      mode: "online",
      link: "https://meet.example.org/abc",
    });
  });

  it("undoes the latest change, also from a terminal state, and records it", () => {
    const accepted = leadIn("accepted");
    expect(undoableEntry(accepted)?.status).toBe("accepted");
    const undone = undoLast(accepted, "2026-10-21T08:00:00.000Z");
    expect(undone.status).toBe("sent");
    expect(undone.history).toHaveLength(accepted.history.length);
    expect(undone.history.at(-1)?.undoneAt).toBe("2026-10-21T08:00:00.000Z");
    // A new change after an undo is appended; the undone entry stays.
    const rejected = go(undone, dated("rejected"));
    expect(
      rejected.history.map((e) => [e.status, Boolean(e.undoneAt)]),
    ).toEqual([
      ["review", false],
      ["ready", false],
      ["sent", false],
      ["accepted", true],
      ["rejected", false],
    ]);
  });

  it("undoes one interview round at a time", () => {
    const second = go(leadIn("interview"), {
      status: "interview",
      interview: { ...onsite, dateTime: "2026-11-10T14:00" },
    });
    const first = undoLast(second, NOW);
    expect(first.status).toBe("interview");
    expect(undoLast(first, NOW).status).toBe("sent");
  });

  it("undoing ready goes back to review and drops the cover letter PDF", () => {
    const back = undoLast(ready(), NOW);
    expect(back.status).toBe("review");
    expect(back.coverLetterPdf).toBeUndefined();
  });

  it("never undoes the initial review entry", () => {
    expect(undoableEntry(withPdf())).toBeUndefined();
    expect(code(() => undoLast(withPdf(), NOW))).toBe("nothing-to-undo");
    const withdrawn = go(withPdf(), dated("withdrawn"));
    const again = undoLast(withdrawn, NOW);
    expect(again.status).toBe("review");
    expect(again.coverLetterPdf).toEqual(pdf);
    expect(code(() => undoLast(again, NOW))).toBe("nothing-to-undo");
  });

  it("finds the next interview that is not undone", () => {
    const lead = go(
      go(leadIn("interview"), {
        status: "interview",
        interview: { ...onsite, dateTime: "2026-11-01T08:00" },
      }),
      {
        status: "interview",
        interview: { ...onsite, dateTime: "2026-12-01T08:00" },
      },
    );
    expect(nextInterview(lead, "2026-10-25T00:00")?.dateTime).toBe(
      "2026-11-01T08:00",
    );
    expect(nextInterview(lead, "2026-11-05T00:00")?.dateTime).toBe(
      "2026-12-01T08:00",
    );
    expect(
      nextInterview(undoLast(lead, NOW), "2026-11-05T00:00")?.dateTime,
    ).toBe(undefined);
    expect(nextInterview(lead, "2027-01-01T00:00")).toBeUndefined();
    // A finished lead has no upcoming interview, even with a future date.
    for (const status of ["accepted", "rejected", "withdrawn"] as const) {
      expect(
        nextInterview(go(lead, dated(status)), "2026-10-25T00:00"),
      ).toBeUndefined();
    }
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
