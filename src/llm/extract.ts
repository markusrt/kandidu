// Finds JSON inside an LLM answer (research R5). Pure string logic.

const FENCE = /```[^\n`]*\n([\s\S]*?)```/g;

/** Balanced top-level `{…}` / `[…]` spans, ignoring brackets inside strings. */
export function balancedSpans(text: string): string[] {
  const spans: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"' && depth > 0) {
      inString = true;
    } else if (char === "{" || char === "[") {
      if (depth === 0) start = i;
      depth++;
    } else if ((char === "}" || char === "]") && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        spans.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return spans;
}

/** Candidate JSON texts in priority order, without duplicates. */
export function jsonCandidates(text: string): string[] {
  const candidates: string[] = [text.trim()];
  for (const match of text.matchAll(FENCE)) {
    if (match[1]) candidates.push(match[1].trim());
  }
  candidates.push(...balancedSpans(text));
  for (const match of text.matchAll(FENCE)) {
    if (match[1]) candidates.push(...balancedSpans(match[1]));
  }
  return [...new Set(candidates.filter((c) => c.length > 0))];
}

/** Removes commas directly before a closing bracket, outside strings. */
export function removeTrailingCommas(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    const char = json[i] ?? "";
    if (inString) {
      out += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    if (char === ",") {
      const rest = json.slice(i + 1).match(/^\s*([}\]])/);
      if (rest) continue;
    }
    out += char;
  }
  return out;
}

/** Replaces typographic double quotes, for answers that use them as delimiters. */
export function replaceTypographicQuotes(json: string): string {
  return json.replace(/[“”„‟″]/g, '"');
}

/** Variants to try for one candidate: as is, then conservative repairs. */
export function repairVariants(candidate: string): string[] {
  const noCommas = removeTrailingCommas(candidate);
  const quotes = replaceTypographicQuotes(candidate);
  return [
    ...new Set([candidate, noCommas, quotes, removeTrailingCommas(quotes)]),
  ];
}

export function looksLikeJson(text: string): boolean {
  return /[{[]/.test(text);
}
