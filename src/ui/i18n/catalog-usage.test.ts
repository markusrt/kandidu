import { describe, expect, it } from "vitest";

// Localization guard (FR-048, constitution XII): component files must not
// contain user-facing text. All wording lives in the message catalog.
//
// Heuristics (a simple scan, not a parser):
// - JSX text: text between a tag-closing ">" and the next "<" that contains
//   no braces, parentheses, "=" or ";" (this skips arrows, generics and code)
//   fails when it holds a run of 2+ letters. Text inside "{...}" is code, so
//   it never matches.
// - aria-label, placeholder, title and alt written as plain string literals
//   fail when they contain letters; "https://" placeholders are allowed.
// - Symbols such as "↑", "✕" or "×" have no letters and pass; they need a
//   catalog-based aria-label anyway.

const sources = import.meta.glob("../**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const files = Object.entries(sources).filter(
  ([path]) => !path.startsWith("../i18n/"),
);

const JSX_TEXT = /(?<![=-])>([^<>{}()=;]+)</g;
const LETTERS = /\p{L}{2,}/u;
const ATTRIBUTE = /\b(aria-label|placeholder|title|alt)="([^"]*)"/g;

function findings(source: string): string[] {
  const found: string[] = [];
  for (const [, text] of source.matchAll(JSX_TEXT)) {
    if (text !== undefined && LETTERS.test(text)) {
      found.push(`text node "${text.trim()}"`);
    }
  }
  for (const [, name, value] of source.matchAll(ATTRIBUTE)) {
    if (value === "https://") continue;
    if (value !== undefined && LETTERS.test(value)) {
      found.push(`${name}="${value}"`);
    }
  }
  return found;
}

describe("catalog usage (FR-048)", () => {
  it("scans the component files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("flags hard-coded text in a sample (the guard works)", () => {
    expect(findings("<p>Hallo</p>")).toHaveLength(1);
    expect(findings('<input aria-label="Name" />')).toHaveLength(1);
    expect(findings('<input placeholder="https://" />')).toHaveLength(0);
    expect(findings("<button>{m.save}</button>")).toHaveLength(0);
    expect(findings("<span>✕</span>")).toHaveLength(0);
  });

  it.each(files)("%s has no hard-coded user-facing text", (_path, source) => {
    expect(findings(source)).toEqual([]);
  });
});
