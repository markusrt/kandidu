import type { FileRef } from "./documents";

export interface Address {
  readonly street?: string;
  readonly postalCode?: string;
  readonly city?: string;
  readonly country?: string;
}

export type ContactSalutation = "Frau" | "Herr";

export interface Contact {
  readonly salutation?: ContactSalutation;
  readonly title?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly role?: string;
  readonly email?: string;
  readonly phone?: string;
}

export type ApplicationChannel = "portal" | "email" | "post" | "other";

export const APPLICATION_CHANNELS: readonly ApplicationChannel[] = [
  "portal",
  "email",
  "post",
  "other",
];

export interface Application {
  readonly channel: ApplicationChannel;
  readonly portalUrl?: string;
  readonly email?: string;
  readonly postalAddress?: Address;
  readonly deadline?: string;
  readonly notes?: string;
}

export interface Position {
  readonly title: string;
  readonly referenceNumber?: string;
  readonly location?: string;
  readonly startDate?: string;
  readonly employmentType?: string;
}

export interface Company {
  readonly name: string;
  readonly website?: string;
  readonly address?: Address;
}

/** A page the research is based on (FR-050, FR-051). */
export interface LeadSource {
  readonly title?: string;
  readonly url: string;
}

/** Validated lead content as delivered by the LLM response parser. */
export interface LeadDraft {
  /** The entered project link this lead came from. */
  readonly sourceUrl?: string;
  /** The company's own advertisement, found by the LLM (FR-051). */
  readonly originalPostingUrl?: string;
  readonly sources?: readonly LeadSource[];
  readonly position: Position;
  readonly company: Company;
  readonly contact?: Contact;
  readonly application: Application;
  readonly process: string;
  readonly research: string;
  readonly motivation: string;
}

export type LeadStatus =
  | "review"
  | "ready"
  | "sent"
  | "interview"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "failed";

export const LEAD_STATUSES: readonly LeadStatus[] = [
  "review",
  "ready",
  "sent",
  "interview",
  "accepted",
  "rejected",
  "withdrawn",
  "failed",
];

export interface Interview {
  readonly dateTime: string;
  readonly mode: "onsite" | "online";
  readonly location?: string;
  readonly link?: string;
}

export interface StatusEntry {
  readonly id: string;
  readonly status: LeadStatus;
  readonly at: string;
  readonly date?: string;
  readonly interview?: Interview;
  readonly undoneAt?: string;
}

export interface Comment {
  readonly id: string;
  readonly date: string;
  readonly text: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type PackageItem =
  | { readonly kind: "coverLetter" }
  | { readonly kind: "cv" }
  | { readonly kind: "document"; readonly documentId: string };

export interface PackageDef {
  readonly id: string;
  readonly fileName: string;
  readonly items: readonly PackageItem[];
}

export interface Lead extends LeadDraft {
  readonly id: string;
  readonly projectId: string;
  readonly responseId: string;
  readonly responseIndex: number;
  readonly salutationOverride?: string;
  /** Overrides the project's "Stelle" for `{Stelle}` (FR-049). */
  readonly letterPosition?: string;
  readonly coverLetterPdf?: FileRef;
  readonly status: LeadStatus;
  readonly history: readonly StatusEntry[];
  readonly comments: readonly Comment[];
  readonly packages: readonly PackageDef[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const LEAD_LIMITS = {
  positionTitle: 200,
  companyName: 200,
  shortText: 200,
  process: 20_000,
  research: 50_000,
  motivation: 5_000,
  salutation: 200,
  notes: 2_000,
  url: 2_000,
  sources: 20,
  sourceTitle: 200,
  letterPosition: 200,
} as const;

export type LeadErrorCode =
  | "not-in-review"
  | "gate-incomplete"
  | "transition-not-allowed"
  | "nothing-to-undo"
  | "lead-invalid"
  | "already-imported";

export class LeadError extends Error {
  readonly code: LeadErrorCode;

  constructor(code: LeadErrorCode) {
    super(code);
    this.name = "LeadError";
    this.code = code;
  }
}

function invalid(): never {
  throw new LeadError("lead-invalid");
}

function checkText(value: string | undefined, max: number, required = false) {
  const text = value?.trim() ?? "";
  if (required && !text) invalid();
  if (text.length > max) invalid();
}

/** Validates editable lead content against data-model.md limits. */
export function validateLeadDraft(draft: LeadDraft): void {
  checkText(draft.position.title, LEAD_LIMITS.positionTitle, true);
  checkText(draft.company.name, LEAD_LIMITS.companyName, true);
  for (const value of [
    draft.position.referenceNumber,
    draft.position.location,
    draft.position.startDate,
    draft.position.employmentType,
    draft.contact?.title,
    draft.contact?.firstName,
    draft.contact?.lastName,
    draft.contact?.role,
    draft.contact?.email,
    draft.contact?.phone,
    draft.application.email,
    draft.application.deadline,
  ]) {
    checkText(value, LEAD_LIMITS.shortText);
  }
  for (const url of [
    draft.sourceUrl,
    draft.company.website,
    draft.application.portalUrl,
  ]) {
    checkText(url, LEAD_LIMITS.url);
  }
  checkText(draft.application.notes, LEAD_LIMITS.notes);
  checkText(draft.process, LEAD_LIMITS.process);
  checkText(draft.research, LEAD_LIMITS.research);
  checkText(draft.motivation, LEAD_LIMITS.motivation);
  if (!APPLICATION_CHANNELS.includes(draft.application.channel)) invalid();
}

/** Status that is in effect: the latest history entry not undone. */
export function currentStatus(history: readonly StatusEntry[]): LeadStatus {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry && !entry.undoneAt) return entry.status;
  }
  return "review";
}

export interface ImportedResponse {
  readonly id: string;
  readonly importedLeadIds: readonly string[];
}

/** Refuses to create leads twice from one response (FR-021). */
export function assertNotImported(response: ImportedResponse): void {
  if (response.importedLeadIds.length > 0) {
    throw new LeadError("already-imported");
  }
}

/** Creates leads in review from parsed drafts; `newId` supplies unique ids. */
export function createLeadsFromDrafts(
  drafts: readonly LeadDraft[],
  projectId: string,
  responseId: string,
  newId: () => string,
  now: string,
): Lead[] {
  return drafts.map((draft, index) => {
    validateLeadDraft(draft);
    return {
      ...draft,
      id: newId(),
      projectId,
      responseId,
      responseIndex: index,
      status: "review",
      history: [{ id: newId(), status: "review", at: now }],
      comments: [],
      packages: [],
      createdAt: now,
      updatedAt: now,
    };
  });
}

function assertReview(lead: Lead): void {
  if (lead.status !== "review") throw new LeadError("not-in-review");
}

/** Replaces the reviewable content of a lead (FR-022); only in review. */
export function reviseLead(
  lead: Lead,
  draft: LeadDraft,
  salutationOverride: string | undefined,
  now: string,
): Lead {
  assertReview(lead);
  validateLeadDraft(draft);
  const override = salutationOverride?.trim();
  if (override && override.length > LEAD_LIMITS.salutation) invalid();
  const { salutationOverride: _old, ...rest } = lead;
  return {
    ...rest,
    sourceUrl: draft.sourceUrl,
    position: draft.position,
    company: draft.company,
    contact: draft.contact,
    application: draft.application,
    process: draft.process,
    research: draft.research,
    motivation: draft.motivation,
    ...(override ? { salutationOverride: override } : {}),
    updatedAt: now,
  } as Lead;
}

/** Attaches or replaces the cover letter PDF (FR-028); only in review. */
export function setCoverLetterPdf(lead: Lead, pdf: FileRef, now: string): Lead {
  assertReview(lead);
  return { ...lead, coverLetterPdf: pdf, updatedAt: now };
}
