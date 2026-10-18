import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { TemplateKind } from "../domain/documents";
import type { TemplateData } from "../domain/letterData";
import {
  checkTemplateTags,
  type TemplateIssue,
  type TemplateIssueCode,
  type TemplateTag,
  usedPlaceholderNames,
} from "../domain/placeholders";
import { assertSize, FileError, MAX_DOCX_BYTES } from "./errors";

// DOCX templates via the docxtemplater open-source core (ADR 009). The engine
// joins text across Word runs, so split tags like {Vor}{name} work.

export type InspectResult =
  | { readonly ok: true; readonly tags: readonly string[] }
  | { readonly ok: false; readonly issues: readonly TemplateIssue[] };

interface EngineError {
  properties?: {
    id?: string;
    xtag?: string;
    context?: string;
    errors?: EngineError[];
    openingtag?: string;
    closingtag?: string;
  };
}

interface EnginePart {
  type: string;
  value: string;
  module?: string;
  inverted?: boolean;
  subparsed?: EnginePart[];
}

const ENGINE_CODES: Readonly<Record<string, TemplateIssueCode>> = {
  unopened_tag: "unopened-tag",
  unclosed_tag: "unclosed-tag",
  duplicate_open_tag: "duplicate-open",
  duplicate_close_tag: "duplicate-close",
  closing_tag_does_not_match_opening_tag: "loop-mismatch",
  unclosed_loop: "unclosed-block",
  unopened_loop: "unopened-block",
  unbalanced_loop_tags: "loop-mismatch",
};

const CONTEXT_MAX = 60;

function shorten(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > CONTEXT_MAX
    ? `${clean.slice(0, CONTEXT_MAX - 1)}…`
    : clean;
}

// Tag names are trimmed so `{ Vorname }` behaves like `{Vorname}`.
const options = {
  paragraphLoop: true,
  linebreaks: true,
  errorLogging: false,
  parser: (tag: string) => {
    const name = tag.trim();
    return {
      get: (scope: unknown) =>
        name === "."
          ? scope
          : (scope as Record<string, unknown> | undefined)?.[name],
    };
  },
  nullGetter: () => "",
} as const;

function openZip(bytes: Uint8Array): PizZip {
  let zip: PizZip;
  try {
    zip = new PizZip(bytes);
  } catch {
    throw new FileError("docx-invalid");
  }
  if (!zip.file("word/document.xml")) throw new FileError("docx-invalid");
  return zip;
}

function engineIssues(cause: unknown): TemplateIssue[] {
  const root = cause as EngineError;
  const id = root?.properties?.id;
  if (!id) throw new FileError("docx-invalid");
  const errors =
    id === "multi_error" ? (root.properties?.errors ?? []) : [root];
  return errors.map((error): TemplateIssue => {
    const p = error.properties ?? {};
    const code = ENGINE_CODES[p.id ?? ""] ?? "syntax-other";
    const tag = shorten(
      p.xtag ??
        (p.openingtag ? `${p.openingtag} / ${p.closingtag ?? ""}` : undefined),
    );
    const context = shorten(p.context);
    return {
      code,
      ...(tag ? { tag } : {}),
      ...(context && context !== tag ? { context } : {}),
    };
  });
}

function toTags(parts: readonly EnginePart[]): TemplateTag[] {
  return parts
    .filter((part) => part.type === "placeholder")
    .map((part): TemplateTag => {
      const name = part.value.trim();
      if (part.module === "loop" && !part.inverted) {
        return {
          name,
          kind: "block",
          raw: `#${name}`,
          children: toTags(part.subparsed ?? []),
        };
      }
      if (part.module) {
        const prefix = part.inverted
          ? "^"
          : part.module === "rawxml"
            ? "@"
            : "";
        return { name, kind: "other", raw: `${prefix}${name}`, children: [] };
      }
      return { name, kind: "text", raw: name, children: [] };
    });
}

/**
 * Collects the parsed tag tree of every templated file. Replaces the bundled
 * InspectModule, which requires lodash at runtime without declaring it
 * (ADR 009). Uses only the public module `set` hook.
 */
class TagCollector {
  readonly name = "KandiduTagCollector";
  readonly files = new Map<string, EnginePart[]>();

  set(update: {
    inspect?: { filePath?: string; postparsed?: EnginePart[] };
  }): void {
    const inspect = update.inspect;
    if (inspect?.filePath && inspect.postparsed) {
      this.files.set(inspect.filePath, inspect.postparsed);
    }
  }

  allParts(): EnginePart[] {
    return [...this.files.values()].flat();
  }
}

function compile(zip: PizZip, modules: unknown[] = []): Docxtemplater {
  return new Docxtemplater(zip, { ...options, modules: modules as never });
}

/** Validates an uploaded template (FR-007). Throws FileError for non-DOCX input. */
export function inspectTemplate(
  bytes: Uint8Array,
  kind: TemplateKind,
): InspectResult {
  assertSize(bytes, MAX_DOCX_BYTES);
  const zip = openZip(bytes);
  const collector = new TagCollector();
  try {
    compile(zip, [collector]);
  } catch (cause) {
    return { ok: false, issues: engineIssues(cause) };
  }
  const tags = toTags(collector.allParts());
  const issues = checkTemplateTags(tags, kind);
  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, tags: usedPlaceholderNames(tags) };
}

/** Fills a validated template; throws FileError("render-failed") on failure. */
export function renderTemplate(
  bytes: Uint8Array,
  data: TemplateData,
): Uint8Array {
  const zip = openZip(bytes);
  try {
    const doc = compile(zip);
    doc.render(data);
    return doc
      .getZip()
      .generate({ type: "uint8array", compression: "DEFLATE" });
  } catch {
    throw new FileError("render-failed");
  }
}
