import { currentStatus, type Lead, LeadError, type StatusEntry } from "./lead";

// Lead lifecycle (FR-029, FR-034). C1 covers the review gate; the remaining
// transitions follow with US6.

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
