import type {
  Address,
  ApplicationChannel,
  Contact,
  ContactSalutation,
  Lead,
  LeadDraft,
  LeadSource,
} from "../../domain/lead";

// Flat string form state of the review step and its conversion to a LeadDraft.

/** One editable source row; `key` only identifies the row in the UI. */
export interface SourceRow {
  readonly key: string;
  readonly title: string;
  readonly url: string;
}

export interface LeadForm {
  readonly sourceUrl: string;
  readonly originalPostingUrl: string;
  readonly sources: readonly SourceRow[];
  readonly positionTitle: string;
  readonly referenceNumber: string;
  readonly location: string;
  readonly startDate: string;
  readonly employmentType: string;
  readonly companyName: string;
  readonly companyWebsite: string;
  readonly companyStreet: string;
  readonly companyPostalCode: string;
  readonly companyCity: string;
  readonly companyCountry: string;
  readonly contactSalutation: "" | ContactSalutation;
  readonly contactTitle: string;
  readonly contactFirstName: string;
  readonly contactLastName: string;
  readonly contactRole: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly channel: ApplicationChannel;
  readonly portalUrl: string;
  readonly applicationEmail: string;
  readonly postalStreet: string;
  readonly postalPostalCode: string;
  readonly postalCity: string;
  readonly postalCountry: string;
  readonly deadline: string;
  readonly notes: string;
  readonly process: string;
  readonly research: string;
  readonly motivation: string;
  readonly salutationOverride: string;
  readonly letterPosition: string;
}

export function formFromLead(lead: Lead): LeadForm {
  const address = lead.company.address;
  const postal = lead.application.postalAddress;
  const contact = lead.contact;
  return {
    sourceUrl: lead.sourceUrl ?? "",
    originalPostingUrl: lead.originalPostingUrl ?? "",
    sources: (lead.sources ?? []).map((source, index) => ({
      key: `saved-${index}`,
      title: source.title ?? "",
      url: source.url,
    })),
    positionTitle: lead.position.title,
    referenceNumber: lead.position.referenceNumber ?? "",
    location: lead.position.location ?? "",
    startDate: lead.position.startDate ?? "",
    employmentType: lead.position.employmentType ?? "",
    companyName: lead.company.name,
    companyWebsite: lead.company.website ?? "",
    companyStreet: address?.street ?? "",
    companyPostalCode: address?.postalCode ?? "",
    companyCity: address?.city ?? "",
    companyCountry: address?.country ?? "",
    contactSalutation: contact?.salutation ?? "",
    contactTitle: contact?.title ?? "",
    contactFirstName: contact?.firstName ?? "",
    contactLastName: contact?.lastName ?? "",
    contactRole: contact?.role ?? "",
    contactEmail: contact?.email ?? "",
    contactPhone: contact?.phone ?? "",
    channel: lead.application.channel,
    portalUrl: lead.application.portalUrl ?? "",
    applicationEmail: lead.application.email ?? "",
    postalStreet: postal?.street ?? "",
    postalPostalCode: postal?.postalCode ?? "",
    postalCity: postal?.city ?? "",
    postalCountry: postal?.country ?? "",
    deadline: lead.application.deadline ?? "",
    notes: lead.application.notes ?? "",
    process: lead.process,
    research: lead.research,
    motivation: lead.motivation,
    salutationOverride: lead.salutationOverride ?? "",
    letterPosition: lead.letterPosition ?? "",
  };
}

/**
 * What would be saved: the draft plus the lead-only values, normalized.
 * Comparing this (not the raw form with its row keys and empty rows) tells
 * whether there are unsaved changes.
 */
export function formSignature(form: LeadForm): string {
  return JSON.stringify({
    draft: draftFromForm(form),
    salutationOverride: form.salutationOverride.trim(),
    letterPosition: form.letterPosition.trim(),
  });
}

/** Adds `key` only when the trimmed value is not empty (exactOptionalPropertyTypes). */
function present<K extends string>(key: K, value: string) {
  const text = value.trim();
  return text ? ({ [key]: text } as Record<K, string>) : {};
}

function address(
  street: string,
  postalCode: string,
  city: string,
  country: string,
): Address | undefined {
  const result: Address = {
    ...present("street", street),
    ...present("postalCode", postalCode),
    ...present("city", city),
    ...present("country", country),
  };
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Builds a draft: trims strings and omits empty optional fields and objects. */
export function draftFromForm(form: LeadForm): LeadDraft {
  const companyAddress = address(
    form.companyStreet,
    form.companyPostalCode,
    form.companyCity,
    form.companyCountry,
  );
  const postalAddress = address(
    form.postalStreet,
    form.postalPostalCode,
    form.postalCity,
    form.postalCountry,
  );
  const contact: Contact = {
    ...(form.contactSalutation ? { salutation: form.contactSalutation } : {}),
    ...present("title", form.contactTitle),
    ...present("firstName", form.contactFirstName),
    ...present("lastName", form.contactLastName),
    ...present("role", form.contactRole),
    ...present("email", form.contactEmail),
    ...present("phone", form.contactPhone),
  };
  // Rows left completely empty are ignored; a title without a link is kept
  // so validation can point at it.
  const sources: LeadSource[] = form.sources
    .map((row) => ({ title: row.title.trim(), url: row.url.trim() }))
    .filter((row) => row.title || row.url)
    .map((row) => (row.title ? row : { url: row.url }));
  return {
    ...present("sourceUrl", form.sourceUrl),
    ...present("originalPostingUrl", form.originalPostingUrl),
    ...(sources.length > 0 ? { sources } : {}),
    position: {
      title: form.positionTitle.trim(),
      ...present("referenceNumber", form.referenceNumber),
      ...present("location", form.location),
      ...present("startDate", form.startDate),
      ...present("employmentType", form.employmentType),
    },
    company: {
      name: form.companyName.trim(),
      ...present("website", form.companyWebsite),
      ...(companyAddress ? { address: companyAddress } : {}),
    },
    ...(Object.keys(contact).length > 0 ? { contact } : {}),
    application: {
      channel: form.channel,
      ...present("portalUrl", form.portalUrl),
      ...present("email", form.applicationEmail),
      ...(postalAddress ? { postalAddress } : {}),
      ...present("deadline", form.deadline),
      ...present("notes", form.notes),
    },
    process: form.process.trim(),
    research: form.research.trim(),
    motivation: form.motivation.trim(),
  };
}
