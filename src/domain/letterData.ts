import type { Address, Contact, Lead } from "./lead";
import { splitParagraphs } from "./motivation";
import { MOTIVATION_BLOCK, MOTIVATION_ITEM } from "./placeholders";
import type { Profile } from "./profile";

export type SalutationKind = "female" | "male" | "neutral";

/**
 * Wording and formatting for letter content, implemented by the UI catalog
 * (constitution XII): the domain picks variants, the catalog writes text.
 */
export interface LetterFormatter {
  /** e.g. "18. Oktober 2026" for `YYYY-MM-DD`. */
  longDate(isoDate: string): string;
  /** e.g. "30.04.2001" for `YYYY-MM-DD`. */
  shortDate(isoDate: string): string;
  /** Full salutation line including punctuation, e.g. "Sehr geehrte Frau Dr. Muster,". */
  salutation(kind: SalutationKind, contact: Contact | undefined): string;
  /** Display name, e.g. "Frau Dr. Eva Muster"; "" when nothing is known. */
  contactName(contact: Contact | undefined): string;
}

export type TemplateData = Record<string, string | { [key: string]: string }[]>;

export function salutationKind(contact: Contact | undefined): SalutationKind {
  if (!contact?.lastName?.trim()) return "neutral";
  if (contact.salutation === "Frau") return "female";
  if (contact.salutation === "Herr") return "male";
  return "neutral";
}

export function suggestedSalutation(
  lead: Pick<Lead, "contact">,
  fmt: LetterFormatter,
): string {
  return fmt.salutation(salutationKind(lead.contact), lead.contact);
}

function hasAddress(address: Address | undefined): address is Address {
  return Boolean(
    address &&
      (address.street?.trim() ||
        address.postalCode?.trim() ||
        address.city?.trim()),
  );
}

/** The postal address of the application channel wins over the company address. */
export function letterAddress(lead: Lead): Address {
  if (hasAddress(lead.application.postalAddress)) {
    return lead.application.postalAddress;
  }
  return lead.company.address ?? {};
}

export function buildCvData(
  profile: Profile | undefined,
  fmt: LetterFormatter,
): TemplateData {
  const value = (text: string | undefined) => text?.trim() ?? "";
  return {
    Vorname: value(profile?.firstName),
    Nachname: value(profile?.lastName),
    Name: [profile?.firstName, profile?.lastName]
      .map(value)
      .filter(Boolean)
      .join(" "),
    Strasse: value(profile?.street),
    PLZ: value(profile?.postalCode),
    Ort: value(profile?.city),
    Telefon: value(profile?.phone),
    EMail: value(profile?.email),
    Geburtsdatum: profile?.birthDate ? fmt.shortDate(profile.birthDate) : "",
    Geburtsort: value(profile?.birthPlace),
    Staatsangehoerigkeit: value(profile?.nationality),
    Website: value(profile?.website),
  };
}

export function buildCoverLetterData(
  profile: Profile | undefined,
  lead: Lead,
  today: string,
  fmt: LetterFormatter,
): TemplateData {
  const value = (text: string | undefined) => text?.trim() ?? "";
  const address = letterAddress(lead);
  const override = lead.salutationOverride?.trim();
  return {
    ...buildCvData(profile, fmt),
    Datum: fmt.longDate(today),
    Stelle: value(lead.position.title),
    Referenznummer: value(lead.position.referenceNumber),
    Firma: value(lead.company.name),
    FirmaStrasse: value(address.street),
    FirmaPLZ: value(address.postalCode),
    FirmaOrt: value(address.city),
    Ansprechpartner: fmt.contactName(lead.contact),
    AnsprechpartnerAnrede: value(lead.contact?.salutation),
    AnsprechpartnerTitel: value(lead.contact?.title),
    AnsprechpartnerVorname: value(lead.contact?.firstName),
    AnsprechpartnerNachname: value(lead.contact?.lastName),
    AnsprechpartnerFunktion: value(lead.contact?.role),
    Briefanrede: override || suggestedSalutation(lead, fmt),
    [MOTIVATION_BLOCK]: splitParagraphs(lead.motivation).map((paragraph) => ({
      [MOTIVATION_ITEM]: paragraph,
    })),
  };
}

/** Placeholders used by a template whose value would stay empty (FR-025). */
export function missingValues(
  usedNames: readonly string[],
  data: TemplateData,
): string[] {
  return usedNames.filter((name) => {
    if (name === MOTIVATION_ITEM) return false;
    const value = data[name];
    if (value === undefined) return false;
    return typeof value === "string" ? value.trim() === "" : value.length === 0;
  });
}
