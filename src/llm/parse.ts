import type { z } from "zod";
import {
  type Address,
  type ApplicationChannel,
  LEAD_LIMITS,
  type LeadDraft,
  type LeadSource,
} from "../domain/lead";
import { exceedsMotivationLimit } from "../domain/motivation";
import { isHttpUrl } from "../domain/profile";
import {
  type EntryIssue,
  type ParseIssueKind,
  type ParseResult,
  type ParseWarning,
  RESPONSE_MAX,
} from "../domain/project";
import { jsonCandidates, looksLikeJson, repairVariants } from "./extract";
import { type LeadEntry, leadEntrySchema } from "./schema";

// Tolerant parsing of pasted LLM answers (FR-018, FR-019, research R5).

type Json = unknown;

/** null/"" → absent, strings trimmed, numbers → text (all leaves are text). */
function normalize(value: Json): Json {
  if (value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const out: Record<string, Json> = {};
    for (const [key, item] of Object.entries(value as Record<string, Json>)) {
      const normalized = normalize(item);
      if (normalized !== undefined) out[key] = normalized;
    }
    return out;
  }
  return value;
}

const CHANNEL_SYNONYMS: Readonly<Record<string, ApplicationChannel>> = {
  portal: "portal",
  online: "portal",
  website: "portal",
  webseite: "portal",
  onlineportal: "portal",
  bewerbungsportal: "portal",
  email: "email",
  "e-mail": "email",
  mail: "email",
  post: "post",
  postal: "post",
  brief: "post",
  postweg: "post",
  other: "other",
  sonstiges: "other",
};

function isRecord(value: Json): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Research sources are never a reason to reject an entry: unusable items are
 * dropped with a warning, duplicates kept once, long titles shortened, and
 * more than the limit cut off (contracts/llm-response.md, FR-051).
 */
function prepareSources(
  value: Json,
  entry: number,
  warnings: ParseWarning[],
): LeadSource[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    warnings.push({ entry, kind: "sources-invalid", path: ["sources"] });
    return undefined;
  }
  const seen = new Set<string>();
  const sources: LeadSource[] = [];
  value.forEach((item, index) => {
    const url =
      typeof item === "string"
        ? item
        : isRecord(item) && typeof item.url === "string"
          ? item.url
          : undefined;
    if (!url || url.length > LEAD_LIMITS.url || !isHttpUrl(url)) {
      warnings.push({
        entry,
        kind: "url-dropped",
        path: ["sources", String(index)],
      });
      return;
    }
    if (seen.has(url)) return;
    seen.add(url);
    const title =
      isRecord(item) && typeof item.title === "string"
        ? item.title.slice(0, LEAD_LIMITS.sourceTitle).trim()
        : "";
    sources.push(title ? { title, url } : { url });
  });
  if (sources.length > LEAD_LIMITS.sources) {
    warnings.push({ entry, kind: "sources-truncated", path: ["sources"] });
    return sources.slice(0, LEAD_LIMITS.sources);
  }
  return sources.length > 0 ? sources : undefined;
}

/** Field-specific tolerance before validation; records warnings. */
function prepareEntry(
  raw: Json,
  entry: number,
  warnings: ParseWarning[],
): Json {
  if (!isRecord(raw)) return raw;
  const lead: Record<string, Json> = { ...raw };
  const application = lead.application;
  if (isRecord(application) && typeof application.channel === "string") {
    const key = application.channel.toLowerCase().replace(/\s+/g, "");
    const channel = CHANNEL_SYNONYMS[key];
    if (channel) {
      lead.application = { ...application, channel };
    } else {
      warnings.push({
        entry,
        kind: "channel-unknown",
        path: ["application", "channel"],
      });
      const notes = [application.notes, application.channel]
        .filter((part) => typeof part === "string")
        .join(" – ");
      lead.application = { ...application, channel: "other", notes };
    }
  }
  if ("sources" in lead) {
    const sources = prepareSources(lead.sources, entry, warnings);
    if (sources) lead.sources = sources;
    else delete lead.sources;
  }
  const contact = lead.contact;
  if (isRecord(contact) && contact.salutation !== undefined) {
    const value = String(contact.salutation).toLowerCase();
    const salutation = value.startsWith("frau")
      ? "Frau"
      : value.startsWith("herr")
        ? "Herr"
        : undefined;
    const { salutation: _dropped, ...rest } = contact;
    lead.contact = salutation ? { ...rest, salutation } : rest;
  }
  return lead;
}

function valueAt(root: Json, path: readonly PropertyKey[]): Json {
  let current = root;
  for (const key of path) {
    if (!isRecord(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<PropertyKey, Json>)[key];
  }
  return current;
}

function issueKind(root: Json, issue: z.core.$ZodIssue): ParseIssueKind {
  if (issue.code === "invalid_type") {
    return valueAt(root, issue.path) === undefined ? "missing" : "wrong-type";
  }
  return "invalid";
}

function cleanUrl(
  url: string | undefined,
  entry: number,
  path: string[],
  warnings: ParseWarning[],
): string | undefined {
  if (url === undefined) return undefined;
  if (isHttpUrl(url)) return url;
  warnings.push({ entry, kind: "url-dropped", path });
  return undefined;
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as T;
}

function cleanAddress(
  address: LeadEntry["company"]["address"],
): Address | undefined {
  if (!address) return undefined;
  const result = compact(address) as Address;
  return Object.keys(result).length > 0 ? result : undefined;
}

function toDraft(
  lead: LeadEntry,
  entry: number,
  warnings: ParseWarning[],
): LeadDraft {
  const sourceUrl = cleanUrl(lead.sourceUrl, entry, ["sourceUrl"], warnings);
  const originalPostingUrl = cleanUrl(
    lead.originalPostingUrl,
    entry,
    ["originalPostingUrl"],
    warnings,
  );
  const website = cleanUrl(
    lead.company.website,
    entry,
    ["company", "website"],
    warnings,
  );
  const portalUrl = cleanUrl(
    lead.application.portalUrl,
    entry,
    ["application", "portalUrl"],
    warnings,
  );
  if (exceedsMotivationLimit(lead.motivation)) {
    warnings.push({ entry, kind: "motivation-too-long", path: ["motivation"] });
  }
  const contact = lead.contact ? compact(lead.contact) : undefined;
  const companyAddress = cleanAddress(lead.company.address);
  const postalAddress = cleanAddress(lead.application.postalAddress);
  return compact({
    sourceUrl,
    originalPostingUrl,
    // Already cleaned by prepareSources.
    sources: lead.sources?.map((source) => compact(source)),
    position: compact(lead.position),
    company: compact({
      name: lead.company.name,
      website,
      address: companyAddress,
    }),
    contact: contact && Object.keys(contact).length > 0 ? contact : undefined,
    application: compact({
      ...lead.application,
      portalUrl,
      postalAddress,
    }),
    process: lead.process ?? "",
    research: lead.research,
    motivation: lead.motivation,
  }) as LeadDraft;
}

/** Interprets a parsed JSON root as a list of entries, if it has a known shape. */
function entriesOf(root: Json): Json[] | undefined {
  if (Array.isArray(root)) return root;
  if (isRecord(root)) {
    if ("leads" in root)
      return Array.isArray(root.leads) ? root.leads : undefined;
    if ("company" in root || "position" in root) return [root];
  }
  return undefined;
}

function positionOf(error: unknown): number | undefined {
  const match = /position (\d+)/.exec(String(error));
  return match ? Number(match[1]) : undefined;
}

export function parseResponse(text: string): ParseResult {
  if (text.length > RESPONSE_MAX)
    return { ok: false, error: "response-too-large" };
  if (!looksLikeJson(text)) return { ok: false, error: "no-json-found" };

  let firstParsed: Json | undefined;
  let entries: Json[] | undefined;
  let firstError: unknown;
  search: for (const candidate of jsonCandidates(text)) {
    for (const variant of repairVariants(candidate)) {
      let value: Json;
      try {
        value = JSON.parse(variant);
      } catch (error) {
        firstError ??= error;
        continue;
      }
      if (typeof value !== "object" || value === null) continue;
      firstParsed ??= value;
      const found = entriesOf(value);
      if (found) {
        entries = found;
        break search;
      }
    }
  }

  if (entries === undefined) {
    if (firstParsed === undefined) {
      const position = positionOf(firstError);
      return {
        ok: false,
        error: "json-invalid",
        ...(position !== undefined ? { detail: { position } } : {}),
      };
    }
    const kind: ParseIssueKind =
      isRecord(firstParsed) && "leads" in firstParsed
        ? "wrong-type"
        : "missing";
    return {
      ok: false,
      error: "schema-invalid",
      issues: [{ entry: 0, path: ["leads"], kind }],
      validLeads: [],
      warnings: [],
    };
  }

  if (entries.length === 0) {
    return {
      ok: false,
      error: "schema-invalid",
      issues: [{ entry: 0, path: ["leads"], kind: "missing" }],
      validLeads: [],
      warnings: [],
    };
  }

  const warnings: ParseWarning[] = [];
  const issues: EntryIssue[] = [];
  const leads: LeadDraft[] = [];
  entries.forEach((raw, index) => {
    const entry = index + 1;
    const entryWarnings: ParseWarning[] = [];
    const prepared = prepareEntry(normalize(raw), entry, entryWarnings);
    const parsed = leadEntrySchema.safeParse(prepared);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          entry,
          path: issue.path.map(String),
          kind: issueKind(prepared, issue),
        });
      }
      return;
    }
    leads.push(toDraft(parsed.data, entry, entryWarnings));
    warnings.push(...entryWarnings);
  });

  if (issues.length > 0) {
    return {
      ok: false,
      error: "schema-invalid",
      issues,
      validLeads: leads,
      warnings,
    };
  }
  return { ok: true, leads, warnings };
}
