import { LEAD_LIMITS, type LeadDraft } from "./lead";
import { isHttpUrl } from "./profile";

export const PROJECT_TITLE_MAX = 120;
export const LINK_MAX = 2000;
export const LINKS_MAX = 20;
export const PROMPT_CONTEXT_MAX = 2000;
export const RESPONSE_MAX = 500_000;

export type PromptState = "draft" | "copied" | "answered";

export interface ProjectLink {
  readonly id: string;
  readonly url: string;
}

export type ParseIssueKind = "missing" | "wrong-type" | "invalid";

export interface EntryIssue {
  /** 1-based entry number for display. */
  readonly entry: number;
  readonly path: readonly string[];
  readonly kind: ParseIssueKind;
}

export type ParseWarningKind =
  | "motivation-too-long"
  | "url-dropped"
  | "channel-unknown"
  | "sources-truncated"
  | "sources-invalid";

export interface ParseWarning {
  readonly entry: number;
  readonly kind: ParseWarningKind;
  readonly path?: readonly string[];
}

export type ParseFailure =
  | "no-json-found"
  | "json-invalid"
  | "response-too-large";

export type ParseResult =
  | {
      readonly ok: true;
      readonly leads: readonly LeadDraft[];
      readonly warnings: readonly ParseWarning[];
    }
  | {
      readonly ok: false;
      readonly error: ParseFailure;
      readonly detail?: { readonly position?: number };
    }
  | {
      readonly ok: false;
      readonly error: "schema-invalid";
      readonly issues: readonly EntryIssue[];
      readonly validLeads: readonly LeadDraft[];
      readonly warnings: readonly ParseWarning[];
    };

/** A pasted LLM answer, stored before parsing so it is never lost (FR-020). */
export interface StoredResponse {
  readonly id: string;
  readonly text: string;
  readonly receivedAt: string;
  readonly result: ParseResult;
  readonly importedLeadIds: readonly string[];
}

export interface Project {
  readonly id: string;
  readonly title: string;
  readonly links: readonly ProjectLink[];
  readonly promptContext: string;
  /** "Stelle (im Anschreiben)" for `{Stelle}`; leads may override it (FR-049). */
  readonly position?: string;
  readonly promptState: PromptState;
  readonly promptCopiedAt?: string;
  /** Fingerprint of title, links and context at the last copy. */
  readonly promptCopiedFingerprint?: string;
  readonly responses: readonly StoredResponse[];
  readonly responseDraft: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ProjectErrorCode =
  | "title-invalid"
  | "link-invalid"
  | "link-duplicate"
  | "too-many-links"
  | "no-links"
  | "context-too-long"
  | "draft-too-large"
  | "link-not-found"
  | "position-too-long";

export class ProjectError extends Error {
  readonly code: ProjectErrorCode;

  constructor(code: ProjectErrorCode) {
    super(code);
    this.name = "ProjectError";
    this.code = code;
  }
}

function touch(
  project: Project,
  now: string,
  patch: Partial<Project>,
): Project {
  return { ...project, ...patch, updatedAt: now };
}

function validTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length < 1 || trimmed.length > PROJECT_TITLE_MAX) {
    throw new ProjectError("title-invalid");
  }
  return trimmed;
}

function validUrl(
  project: Project,
  url: string,
  exceptLinkId?: string,
): string {
  const trimmed = url.trim();
  if (trimmed.length > LINK_MAX || !isHttpUrl(trimmed)) {
    throw new ProjectError("link-invalid");
  }
  if (project.links.some((l) => l.url === trimmed && l.id !== exceptLinkId)) {
    throw new ProjectError("link-duplicate");
  }
  return trimmed;
}

export function createProject(title: string, id: string, now: string): Project {
  return {
    id,
    title: validTitle(title),
    links: [],
    promptContext: "",
    promptState: "draft",
    responses: [],
    responseDraft: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function renameProject(
  project: Project,
  title: string,
  now: string,
): Project {
  return touch(project, now, { title: validTitle(title) });
}

export function addLink(
  project: Project,
  url: string,
  id: string,
  now: string,
): Project {
  const trimmed = validUrl(project, url);
  if (project.links.length >= LINKS_MAX) {
    throw new ProjectError("too-many-links");
  }
  return touch(project, now, {
    links: [...project.links, { id, url: trimmed }],
  });
}

export function updateLink(
  project: Project,
  linkId: string,
  url: string,
  now: string,
): Project {
  if (!project.links.some((l) => l.id === linkId)) {
    throw new ProjectError("link-not-found");
  }
  const trimmed = validUrl(project, url, linkId);
  return touch(project, now, {
    links: project.links.map((l) =>
      l.id === linkId ? { id: l.id, url: trimmed } : l,
    ),
  });
}

export function removeLink(
  project: Project,
  linkId: string,
  now: string,
): Project {
  if (!project.links.some((l) => l.id === linkId)) {
    throw new ProjectError("link-not-found");
  }
  return touch(project, now, {
    links: project.links.filter((l) => l.id !== linkId),
  });
}

/** Sets the project's "Stelle (im Anschreiben)"; blank removes it (FR-049). */
export function setProjectPosition(
  project: Project,
  value: string,
  now: string,
): Project {
  const position = value.trim();
  if (position.length > LEAD_LIMITS.letterPosition) {
    throw new ProjectError("position-too-long");
  }
  const { position: _old, ...rest } = project;
  return touch(rest, now, position ? { position } : {});
}

export function setPromptContext(
  project: Project,
  text: string,
  now: string,
): Project {
  if (text.length > PROMPT_CONTEXT_MAX) {
    throw new ProjectError("context-too-long");
  }
  return touch(project, now, { promptContext: text });
}

/** Deterministic FNV-1a 32-bit hash (hex) of the prompt inputs. */
export function promptFingerprint(project: Project): string {
  const input = JSON.stringify([
    project.title,
    project.links.map((l) => l.url),
    project.promptContext,
  ]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function markPromptCopied(project: Project, now: string): Project {
  if (project.links.length === 0) {
    throw new ProjectError("no-links");
  }
  return touch(project, now, {
    promptCopiedAt: now,
    promptCopiedFingerprint: promptFingerprint(project),
    promptState: "copied",
  });
}

export function isPromptChangedSinceCopy(project: Project): boolean {
  return (
    project.promptCopiedFingerprint !== undefined &&
    project.promptCopiedFingerprint !== promptFingerprint(project)
  );
}

export function setResponseDraft(
  project: Project,
  text: string,
  now: string,
): Project {
  if (text.length > RESPONSE_MAX) {
    throw new ProjectError("draft-too-large");
  }
  return touch(project, now, { responseDraft: text });
}

export function addResponse(
  project: Project,
  response: StoredResponse,
  now: string,
): Project {
  return touch(project, now, {
    responses: [...project.responses, response],
    // The draft stays until leads were imported, so a failed parse keeps the
    // pasted text editable (FR-020).
    responseDraft:
      response.importedLeadIds.length > 0 ? "" : project.responseDraft,
    promptState:
      response.importedLeadIds.length > 0 ? "answered" : project.promptState,
  });
}

export function markResponseImported(
  project: Project,
  responseId: string,
  leadIds: readonly string[],
  now: string,
): Project {
  return touch(project, now, {
    responses: project.responses.map((r) =>
      r.id === responseId ? { ...r, importedLeadIds: [...leadIds] } : r,
    ),
    responseDraft: "",
    promptState: "answered",
  });
}

/**
 * Whether a schema-invalid result may be imported partially (FR-021, C2):
 * some entries are valid and every issue names its entry. Returns the counts
 * for "n von m", or undefined when only a full fix helps.
 */
export function partialImport(
  result: ParseResult,
): { valid: number; total: number } | undefined {
  if (result.ok || result.error !== "schema-invalid") return undefined;
  if (result.validLeads.length === 0) return undefined;
  if (result.issues.some((issue) => issue.entry < 1)) return undefined;
  const invalid = new Set(result.issues.map((issue) => issue.entry)).size;
  return {
    valid: result.validLeads.length,
    total: result.validLeads.length + invalid,
  };
}

/**
 * An earlier response with the same text that already created leads, so the
 * UI can ask before importing it again (FR-021).
 */
export function findImportedResponse(
  project: Project,
  text: string,
): StoredResponse | undefined {
  const needle = text.trim();
  if (!needle) return undefined;
  return project.responses.find(
    (response) =>
      response.importedLeadIds.length > 0 && response.text.trim() === needle,
  );
}
