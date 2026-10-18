import { z } from "zod";
import { DOCUMENT_NAME_MAX } from "../domain/documents";
import { LEAD_LIMITS, LEAD_STATUSES } from "../domain/lead";
import {
  LINK_MAX,
  LINKS_MAX,
  PROJECT_TITLE_MAX,
  PROMPT_CONTEXT_MAX,
  RESPONSE_MAX,
} from "../domain/project";

// Persisted records are untrusted on load (constitution IV). Schemas mirror
// specs/001-bewerbungs-mvp/data-model.md; parsed values are cast to domain
// types only after validation succeeded.

export const SCHEMA_VERSION = 1;

const id = z.string().min(1).max(100);
const timestamp = z.string().min(1).max(40);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const shortText = z.string().max(LEAD_LIMITS.shortText);
const optionalShort = shortText.optional();
const url = z.string().max(LINK_MAX);

export const metaSchema = z.strictObject({
  schemaVersion: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
});

export const profileSchema = z.strictObject({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  street: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(10),
  city: z.string().min(1).max(80),
  phone: z.string().min(1).max(40),
  email: z.string().min(1).max(254),
  birthDate: isoDate.optional(),
  birthPlace: z.string().max(80).optional(),
  nationality: z.string().max(80).optional(),
  website: url.optional(),
  updatedAt: timestamp,
});

const templateKind = z.enum(["cv", "coverLetter"]);

export const templateSchema = z.strictObject({
  kind: templateKind,
  fileName: z.string().min(1).max(200),
  fileId: id,
  size: z.number().int().nonnegative(),
  uploadedAt: timestamp,
  tags: z.array(z.string().max(100)).max(200),
});

export const documentSchema = z.strictObject({
  id,
  role: z.enum(["evidence", "cv"]),
  name: z.string().min(1).max(DOCUMENT_NAME_MAX),
  fileName: z.string().min(1).max(200),
  tags: z.array(z.string().min(1).max(40)).max(50),
  fileId: id,
  size: z.number().int().nonnegative(),
  pageCount: z.number().int().positive(),
  uploadedAt: timestamp,
});

const fileRef = z.strictObject({
  fileId: id,
  fileName: z.string().min(1).max(200),
  size: z.number().int().nonnegative(),
  pageCount: z.number().int().positive(),
  uploadedAt: timestamp,
});

const address = z.strictObject({
  street: optionalShort,
  postalCode: optionalShort,
  city: optionalShort,
  country: optionalShort,
});

const leadDraftShape = {
  sourceUrl: url.optional(),
  position: z.strictObject({
    title: z.string().min(1).max(LEAD_LIMITS.positionTitle),
    referenceNumber: optionalShort,
    location: optionalShort,
    startDate: optionalShort,
    employmentType: optionalShort,
  }),
  company: z.strictObject({
    name: z.string().min(1).max(LEAD_LIMITS.companyName),
    website: url.optional(),
    address: address.optional(),
  }),
  contact: z
    .strictObject({
      salutation: z.enum(["Frau", "Herr"]).optional(),
      title: optionalShort,
      firstName: optionalShort,
      lastName: optionalShort,
      role: optionalShort,
      email: optionalShort,
      phone: optionalShort,
    })
    .optional(),
  application: z.strictObject({
    channel: z.enum(["portal", "email", "post", "other"]),
    portalUrl: url.optional(),
    email: optionalShort,
    postalAddress: address.optional(),
    deadline: optionalShort,
    notes: z.string().max(LEAD_LIMITS.notes).optional(),
  }),
  process: z.string().max(LEAD_LIMITS.process),
  research: z.string().max(LEAD_LIMITS.research),
  motivation: z.string().max(LEAD_LIMITS.motivation),
};

export const leadDraftSchema = z.strictObject(leadDraftShape);

const status = z.enum(LEAD_STATUSES as [string, ...string[]]);

const statusEntry = z.strictObject({
  id,
  status,
  at: timestamp,
  date: isoDate.optional(),
  interview: z
    .strictObject({
      dateTime: z.string().min(1).max(40),
      mode: z.enum(["onsite", "online"]),
      location: optionalShort,
      link: url.optional(),
    })
    .optional(),
  undoneAt: timestamp.optional(),
});

const comment = z.strictObject({
  id,
  date: isoDate,
  text: z.string().min(1).max(2000),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const packageItem = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("coverLetter") }),
  z.strictObject({ kind: z.literal("cv") }),
  z.strictObject({ kind: z.literal("document"), documentId: id }),
]);

const packageDef = z.strictObject({
  id,
  fileName: z.string().min(5).max(200),
  items: z.array(packageItem).min(1).max(100),
});

const uniqueIds = <T extends { id: string }>(items: readonly T[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

export const leadSchema = z.strictObject({
  ...leadDraftShape,
  id,
  projectId: id,
  responseId: id,
  responseIndex: z.number().int().nonnegative(),
  salutationOverride: z.string().max(LEAD_LIMITS.salutation).optional(),
  coverLetterPdf: fileRef.optional(),
  status,
  history: z.array(statusEntry).min(1).refine(uniqueIds),
  comments: z.array(comment).refine(uniqueIds),
  packages: z.array(packageDef).refine(uniqueIds),
  createdAt: timestamp,
  updatedAt: timestamp,
});

// Parse results are stored as produced by src/llm; only their outer shape is
// checked here because they are informational once leads exist.
const parseResult = z
  .object({ ok: z.boolean() })
  .passthrough()
  .refine((value) => typeof value === "object");

const storedResponse = z.strictObject({
  id,
  text: z.string().max(RESPONSE_MAX),
  receivedAt: timestamp,
  result: parseResult,
  importedLeadIds: z.array(id),
});

export const projectSchema = z.strictObject({
  id,
  title: z.string().min(1).max(PROJECT_TITLE_MAX),
  links: z.array(z.strictObject({ id, url })).max(LINKS_MAX).refine(uniqueIds),
  promptContext: z.string().max(PROMPT_CONTEXT_MAX),
  promptState: z.enum(["draft", "copied", "answered"]),
  promptCopiedAt: timestamp.optional(),
  promptCopiedFingerprint: z.string().max(200).optional(),
  responses: z.array(storedResponse).refine(uniqueIds),
  responseDraft: z.string().max(RESPONSE_MAX),
  createdAt: timestamp,
  updatedAt: timestamp,
});
