import type { TemplateKind } from "./documents";

// Placeholder catalog and template checks (contracts/placeholders.md).
// Names are stable identifiers; descriptions live in the UI catalog.

export type PlaceholderKind = "text" | "block" | "blockItem";
export type PlaceholderSource = "profile" | "lead" | "system";

export interface Placeholder {
  readonly name: string;
  readonly kind: PlaceholderKind;
  readonly templates: readonly TemplateKind[];
  readonly source: PlaceholderSource;
  /** Filled from an optional profile field (FR-001); empty is fine (FR-025). */
  readonly optional?: true;
}

const BOTH: readonly TemplateKind[] = ["cv", "coverLetter"];

const OPTIONAL_PROFILE = new Set([
  "Geburtsdatum",
  "Geburtsort",
  "Staatsangehoerigkeit",
  "Website",
]);
const COVER: readonly TemplateKind[] = ["coverLetter"];

export const MOTIVATION_BLOCK = "Motivation";
export const MOTIVATION_ITEM = "Absatz";

export const PLACEHOLDERS: readonly Placeholder[] = [
  ...[
    "Vorname",
    "Nachname",
    "Name",
    "Strasse",
    "PLZ",
    "Ort",
    "Telefon",
    "EMail",
    "Geburtsdatum",
    "Geburtsort",
    "Staatsangehoerigkeit",
    "Website",
  ].map(
    (name): Placeholder => ({
      name,
      kind: "text",
      templates: BOTH,
      source: "profile",
      ...(OPTIONAL_PROFILE.has(name) ? { optional: true as const } : {}),
    }),
  ),
  { name: "Datum", kind: "text", templates: COVER, source: "system" },
  ...[
    "Stelle",
    "Referenznummer",
    "Firma",
    "FirmaStrasse",
    "FirmaPLZ",
    "FirmaOrt",
    "Ansprechpartner",
    "AnsprechpartnerAnrede",
    "AnsprechpartnerTitel",
    "AnsprechpartnerVorname",
    "AnsprechpartnerNachname",
    "AnsprechpartnerFunktion",
    "Briefanrede",
  ].map(
    (name): Placeholder => ({
      name,
      kind: "text",
      templates: COVER,
      source: "lead",
    }),
  ),
  { name: MOTIVATION_BLOCK, kind: "block", templates: COVER, source: "lead" },
  {
    name: MOTIVATION_ITEM,
    kind: "blockItem",
    templates: COVER,
    source: "lead",
  },
];

const BY_NAME = new Map(PLACEHOLDERS.map((p) => [p.name, p]));

export function placeholdersFor(kind: TemplateKind): Placeholder[] {
  return PLACEHOLDERS.filter((p) => p.templates.includes(kind));
}

/**
 * Splits empty placeholders into those of required data (download needs an
 * explicit "anyway") and optional ones (notice only); unknown names count as
 * required (FR-025, clarification 2026-10-19).
 */
export function splitMissing(names: readonly string[]): {
  required: string[];
  optional: string[];
} {
  const required: string[] = [];
  const optional: string[] = [];
  for (const name of names) {
    (BY_NAME.get(name)?.optional ? optional : required).push(name);
  }
  return { required, optional };
}

/** Tag structure as found in a template, independent of the engine. */
export interface TemplateTag {
  readonly name: string;
  /** "other" covers engine features we do not support (raw XML, inverted). */
  readonly kind: "text" | "block" | "other";
  readonly raw: string;
  readonly children: readonly TemplateTag[];
}

export type TemplateIssueCode =
  | "unknown-placeholder"
  | "wrong-template"
  | "block-misused"
  | "block-item-outside"
  | "unopened-tag"
  | "unclosed-tag"
  | "duplicate-open"
  | "duplicate-close"
  | "loop-mismatch"
  | "unclosed-block"
  | "unopened-block"
  | "syntax-other";

export interface TemplateIssue {
  readonly code: TemplateIssueCode;
  readonly tag?: string;
  readonly context?: string;
  readonly suggestion?: string;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j] ?? 0;
      row[j] = Math.min(
        current + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length] ?? 0;
}

/** Nearest known placeholder for a template kind, if it is close enough. */
export function suggestPlaceholder(
  name: string,
  kind: TemplateKind,
): string | undefined {
  const candidates = placeholdersFor(kind).map((p) => p.name);
  const lower = name.toLowerCase();
  const sameCase = candidates.find((c) => c.toLowerCase() === lower);
  if (sameCase) return sameCase;
  let best: { name: string; distance: number } | undefined;
  for (const candidate of candidates) {
    const distance = editDistance(lower, candidate.toLowerCase());
    if (distance <= 2 && (!best || distance < best.distance)) {
      best = { name: candidate, distance };
    }
  }
  return best?.name;
}

function unknown(tag: TemplateTag, kind: TemplateKind): TemplateIssue {
  const suggestion = suggestPlaceholder(tag.name, kind);
  return {
    code: "unknown-placeholder",
    tag: tag.raw,
    ...(suggestion ? { suggestion } : {}),
  };
}

function checkTag(
  tag: TemplateTag,
  kind: TemplateKind,
  insideBlock: boolean,
  issues: TemplateIssue[],
): void {
  if (tag.kind === "other") {
    issues.push({ code: "block-misused", tag: tag.raw });
    return;
  }
  const entry = BY_NAME.get(tag.name);
  if (!entry) {
    issues.push(unknown(tag, kind));
    return;
  }
  if (!entry.templates.includes(kind)) {
    issues.push({ code: "wrong-template", tag: tag.raw });
    return;
  }
  if (tag.kind === "text") {
    if (entry.kind === "block") {
      issues.push({ code: "block-misused", tag: tag.raw });
    } else if (entry.kind === "blockItem" && !insideBlock) {
      issues.push({ code: "block-item-outside", tag: tag.raw });
    }
    return;
  }
  // A block tag ({#Name}…{/Name}).
  if (entry.kind !== "block" || insideBlock) {
    issues.push({ code: "block-misused", tag: tag.raw });
    return;
  }
  for (const child of tag.children) checkTag(child, kind, true, issues);
}

/** Checks the tags of a template against the catalog for its kind (FR-007). */
export function checkTemplateTags(
  tags: readonly TemplateTag[],
  kind: TemplateKind,
): TemplateIssue[] {
  const issues: TemplateIssue[] = [];
  for (const tag of tags) checkTag(tag, kind, false, issues);
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}|${issue.tag ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Unique placeholder names used in a template, in order of appearance. */
export function usedPlaceholderNames(tags: readonly TemplateTag[]): string[] {
  const names: string[] = [];
  const visit = (list: readonly TemplateTag[]) => {
    for (const tag of list) {
      if (!names.includes(tag.name)) names.push(tag.name);
      visit(tag.children);
    }
  };
  visit(tags);
  return names;
}
