import { z } from "zod";
import { LEAD_LIMITS } from "../domain/lead";

// Response contract v1 (contracts/llm-response.md). This schema is the single
// source of truth for the JSON Schema embedded in the prompt and for
// validation; tolerant normalization happens before it (see parse.ts).

const text = (max: number = LEAD_LIMITS.shortText) => z.string().max(max);
const optional = (max?: number) => text(max).optional();

const address = z.object({
  street: optional(),
  postalCode: optional(),
  city: optional(),
  country: optional(),
});

export const CHANNELS = ["portal", "email", "post", "other"] as const;

export const leadEntrySchema = z.object({
  sourceUrl: optional(LEAD_LIMITS.url),
  position: z.object({
    title: text(LEAD_LIMITS.positionTitle),
    referenceNumber: optional(),
    location: optional(),
    startDate: optional(),
    employmentType: optional(),
  }),
  company: z.object({
    name: text(LEAD_LIMITS.companyName),
    website: optional(LEAD_LIMITS.url),
    address: address.optional(),
  }),
  contact: z
    .object({
      salutation: z.enum(["Frau", "Herr"]).optional(),
      title: optional(),
      firstName: optional(),
      lastName: optional(),
      role: optional(),
      email: optional(),
      phone: optional(),
    })
    .optional(),
  application: z.object({
    channel: z.enum(CHANNELS),
    portalUrl: optional(LEAD_LIMITS.url),
    email: optional(),
    postalAddress: address.optional(),
    deadline: optional(),
    notes: optional(LEAD_LIMITS.notes),
  }),
  process: optional(LEAD_LIMITS.process),
  research: text(LEAD_LIMITS.research),
  motivation: text(LEAD_LIMITS.motivation),
});

export const responseSchema = z.object({
  leads: z.array(leadEntrySchema).min(1),
});

export type LeadEntry = z.infer<typeof leadEntrySchema>;

/** JSON Schema text for the prompt (FR-013). */
export function responseJsonSchema(): string {
  const schema = z.toJSONSchema(responseSchema, { target: "draft-2020-12" });
  return JSON.stringify(schema, null, 2);
}
