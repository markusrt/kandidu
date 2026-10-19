import {
  currentStatus,
  type Interview,
  LEAD_LIMITS,
  type Lead,
  LeadError,
  type LeadStatus,
  type StatusEntry,
} from "./lead";
import { isHttpUrl, isIsoDate } from "./profile";

// Lead lifecycle (FR-029, FR-034), verbatim from data-model.md
// "StatusEntry and lifecycle". Review → ready only through the gate below.

/** States a person can choose by hand (ready only through the gate). */
export type TransitionTarget =
  | "sent"
  | "interview"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "failed";

const TRANSITIONS: Readonly<Record<LeadStatus, readonly TransitionTarget[]>> = {
  review: ["withdrawn"],
  ready: ["sent", "withdrawn", "failed"],
  sent: ["interview", "accepted", "rejected", "withdrawn", "failed"],
  interview: ["interview", "accepted", "rejected", "withdrawn"],
  accepted: [],
  rejected: [],
  withdrawn: [],
  failed: [],
};

/** Terminal states are left only by undoing (FR-034). */
export const TERMINAL_STATUSES: readonly LeadStatus[] = [
  "accepted",
  "rejected",
  "withdrawn",
  "failed",
];

export function allowedTransitions(
  status: LeadStatus,
): readonly TransitionTarget[] {
  return TRANSITIONS[status];
}

export type TransitionInput =
  | {
      readonly status: Exclude<TransitionTarget, "interview">;
      /** Calendar date of the change, `YYYY-MM-DD`. */
      readonly date: string;
    }
  | { readonly status: "interview"; readonly interview: Interview };

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function validInterview(interview: Interview): Interview {
  const [day, time] = interview.dateTime.split("T");
  const [hours, minutes] = (time ?? "").split(":").map(Number);
  if (
    !DATE_TIME.test(interview.dateTime) ||
    !isIsoDate(day ?? "") ||
    (hours ?? 99) > 23 ||
    (minutes ?? 99) > 59
  ) {
    throw new LeadError("lead-invalid");
  }
  const location = interview.location?.trim();
  const link = interview.link?.trim();
  if (location && location.length > LEAD_LIMITS.shortText) {
    throw new LeadError("lead-invalid");
  }
  if (link && (link.length > LEAD_LIMITS.url || !isHttpUrl(link))) {
    throw new LeadError("lead-invalid");
  }
  return {
    dateTime: interview.dateTime,
    mode: interview.mode,
    ...(location ? { location } : {}),
    ...(link ? { link } : {}),
  };
}

/** Records a status change the current state allows (FR-034). */
export function applyTransition(
  lead: Lead,
  input: TransitionInput,
  entryId: string,
  now: string,
): Lead {
  if (!allowedTransitions(lead.status).includes(input.status)) {
    throw new LeadError("transition-not-allowed");
  }
  let entry: StatusEntry;
  if (input.status === "interview") {
    entry = {
      id: entryId,
      status: "interview",
      at: now,
      interview: validInterview(input.interview),
    };
  } else {
    if (!isIsoDate(input.date)) throw new LeadError("lead-invalid");
    entry = { id: entryId, status: input.status, at: now, date: input.date };
  }
  const history = [...lead.history, entry];
  return { ...lead, history, status: currentStatus(history), updatedAt: now };
}

/** The entry an undo would take back, if any (the initial review never). */
export function undoableEntry(lead: Lead): StatusEntry | undefined {
  const active = lead.history.filter((entry) => !entry.undoneAt);
  return active.length > 1 ? active[active.length - 1] : undefined;
}

/**
 * Takes back the latest status change after confirmation in the UI; the
 * previous state applies again and the history keeps the undone entry. Undoing
 * "ready" is "Zurück in den Review" and drops the cover letter PDF (FR-029).
 */
export function undoLast(lead: Lead, now: string): Lead {
  const target = undoableEntry(lead);
  if (!target) throw new LeadError("nothing-to-undo");
  if (target.status === "ready") return backToReview(lead, now);
  const history = lead.history.map((entry) =>
    entry === target ? { ...entry, undoneAt: now } : entry,
  );
  return { ...lead, history, status: currentStatus(history), updatedAt: now };
}

/**
 * The earliest interview at or after `nowLocal` (`YYYY-MM-DDTHH:mm`). A lead
 * in a terminal state has no upcoming interview (US6 scenario 6).
 */
export function nextInterview(
  lead: Lead,
  nowLocal: string,
): Interview | undefined {
  if (TERMINAL_STATUSES.includes(lead.status)) return undefined;
  return lead.history
    .filter((entry) => !entry.undoneAt && entry.interview)
    .map((entry) => entry.interview as Interview)
    .filter((interview) => interview.dateTime >= nowLocal)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))[0];
}

export interface GateInput {
  /** The global CV PDF exists (FR-028). */
  readonly cvPresent: boolean;
  /** The user explicitly confirmed leaving review (FR-029). */
  readonly confirmed: boolean;
}

export function gateMissing(lead: Lead, input: GateInput) {
  return {
    coverLetterPdf: !lead.coverLetterPdf,
    cvPdf: !input.cvPresent,
    confirmation: !input.confirmed,
  };
}

/** Leaves review only with both PDFs and an explicit confirmation. */
export function confirmGate(
  lead: Lead,
  input: GateInput,
  entryId: string,
  now: string,
): Lead {
  if (lead.status !== "review") throw new LeadError("transition-not-allowed");
  const missing = gateMissing(lead, input);
  if (missing.coverLetterPdf || missing.cvPdf || missing.confirmation) {
    throw new LeadError("gate-incomplete");
  }
  const entry: StatusEntry = { id: entryId, status: "ready", at: now };
  const history = [...lead.history, entry];
  return { ...lead, history, status: currentStatus(history), updatedAt: now };
}

/**
 * "Zurück in den Review": undoes the ready entry and drops the cover letter
 * PDF so a corrected letter must be uploaded again.
 */
export function backToReview(lead: Lead, now: string): Lead {
  if (lead.status !== "ready") throw new LeadError("transition-not-allowed");
  let undone = false;
  const history = [...lead.history]
    .reverse()
    .map((entry) => {
      if (!undone && !entry.undoneAt && entry.status === "ready") {
        undone = true;
        return { ...entry, undoneAt: now };
      }
      return entry;
    })
    .reverse();
  if (!undone) throw new LeadError("nothing-to-undo");
  const { coverLetterPdf: _dropped, ...rest } = lead;
  return { ...rest, history, status: currentStatus(history), updatedAt: now };
}
