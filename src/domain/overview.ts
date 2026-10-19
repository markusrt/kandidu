import { LEAD_STATUSES, type Lead, type LeadStatus } from "./lead";
import { nextInterview } from "./lifecycle";

// Overview of projects and leads (FR-036): counts, filter and sort.

/** Number of leads per status, in lifecycle order, statuses with 0 left out. */
export function statusCounts(
  leads: readonly Lead[],
): readonly { status: LeadStatus; count: number }[] {
  return LEAD_STATUSES.map((status) => ({
    status,
    count: leads.filter((lead) => lead.status === status).length,
  })).filter((entry) => entry.count > 0);
}

/** Next interview date-time (`YYYY-MM-DDTHH:mm`) of any of the leads. */
export function nextDate(
  leads: readonly Lead[],
  nowLocal: string,
): string | undefined {
  return leads
    .map((lead) => nextInterview(lead, nowLocal)?.dateTime)
    .filter((value): value is string => value !== undefined)
    .sort()[0];
}

export type LeadSort = "activity" | "next";

export interface LeadQuery {
  /** `undefined` shows every status. */
  readonly status?: LeadStatus;
  readonly sort: LeadSort;
}

/**
 * Filters by status and sorts by last activity (newest first) or by the next
 * interview (soonest first, leads without one at the end, then by activity).
 */
export function queryLeads(
  leads: readonly Lead[],
  query: LeadQuery,
  nowLocal: string,
): Lead[] {
  const byActivity = (a: Lead, b: Lead) =>
    b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
  const filtered = leads.filter(
    (lead) => query.status === undefined || lead.status === query.status,
  );
  if (query.sort === "activity") return filtered.sort(byActivity);
  const next = new Map(
    filtered.map((lead) => [lead.id, nextInterview(lead, nowLocal)?.dateTime]),
  );
  return filtered.sort((a, b) => {
    const left = next.get(a.id);
    const right = next.get(b.id);
    if (left && right && left !== right) return left.localeCompare(right);
    if (left && !right) return -1;
    if (!left && right) return 1;
    return byActivity(a, b);
  });
}
