import { describe, expect, it } from "vitest";
import type { Lead, StatusEntry } from "./lead";
import { nextDate, queryLeads, statusCounts } from "./overview";
import { sampleLead } from "./testing";

const NOW = "2026-10-20T12:00";

function lead(
  id: string,
  status: Lead["status"],
  updatedAt: string,
  interviews: string[] = [],
): Lead {
  const history: StatusEntry[] = [
    { id: `${id}-h0`, status: "review", at: "2026-10-01T00:00:00.000Z" },
    ...interviews.map((dateTime, i) => ({
      id: `${id}-i${i}`,
      status: "interview" as const,
      at: "2026-10-02T00:00:00.000Z",
      interview: { dateTime, mode: "online" as const },
    })),
  ];
  return sampleLead({ id, status, updatedAt, history });
}

const leads = [
  lead("a", "review", "2026-10-18T10:00:00.000Z"),
  lead("b", "interview", "2026-10-15T10:00:00.000Z", ["2026-11-05T09:00"]),
  lead("c", "interview", "2026-10-19T10:00:00.000Z", [
    "2026-10-10T09:00",
    "2026-10-28T14:00",
  ]),
  lead("d", "sent", "2026-10-17T10:00:00.000Z"),
  lead("e", "review", "2026-10-16T10:00:00.000Z"),
];

describe("overview (FR-036)", () => {
  it("counts leads per status in lifecycle order", () => {
    expect(statusCounts(leads)).toEqual([
      { status: "review", count: 2 },
      { status: "sent", count: 1 },
      { status: "interview", count: 2 },
    ]);
    expect(statusCounts([])).toEqual([]);
  });

  it("finds the next upcoming interview over all leads", () => {
    expect(nextDate(leads, NOW)).toBe("2026-10-28T14:00");
    expect(nextDate(leads, "2026-11-06T00:00")).toBeUndefined();
  });

  it("sorts by last activity, newest first", () => {
    expect(
      queryLeads(leads, { sort: "activity" }, NOW).map((l) => l.id),
    ).toEqual(["c", "a", "d", "e", "b"]);
  });

  it("sorts by next interview, leads without one last", () => {
    expect(queryLeads(leads, { sort: "next" }, NOW).map((l) => l.id)).toEqual([
      "c",
      "b",
      "a",
      "d",
      "e",
    ]);
  });

  it("filters by status and keeps the input unchanged", () => {
    const copy = [...leads];
    expect(
      queryLeads(leads, { status: "review", sort: "activity" }, NOW).map(
        (l) => l.id,
      ),
    ).toEqual(["a", "e"]);
    expect(
      queryLeads(leads, { status: "accepted", sort: "next" }, NOW),
    ).toEqual([]);
    expect(leads).toEqual(copy);
  });
});
