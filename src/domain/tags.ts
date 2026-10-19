export const PREDEFINED_TAGS = [
  "zeugnis",
  "zertifikat",
  "arbeitszeugnis",
  "schulzeugnis",
  "referenz",
] as const;

export const TAG_MAX = 40;

const MAX_SUGGESTIONS = 10;

export type TagErrorCode = "tag-invalid";

export class TagError extends Error {
  readonly code: TagErrorCode;

  constructor(code: TagErrorCode) {
    super(code);
    this.name = "TagError";
    this.code = code;
  }
}

/** NFC, trimmed, whitespace collapsed, lower-cased; "" for blank input. */
export function normalizeTag(input: string): string {
  const tag = input
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("de-DE");
  if (tag.length > TAG_MAX) throw new TagError("tag-invalid");
  return tag;
}

export function normalizeTags(inputs: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const input of inputs) {
    const tag = normalizeTag(input);
    if (tag !== "") seen.add(tag);
  }
  return [...seen];
}

const byAlphabet = (a: string, b: string): number => a.localeCompare(b, "de");

export function suggestTags(
  input: string,
  inUse: readonly string[],
  exclude: readonly string[] = [],
): string[] {
  // While typing, an over-long input simply matches nothing. Lower-casing
  // can lengthen text ("İ" → "i̇"), so the check follows normalization.
  let query: string;
  try {
    query = normalizeTag(input);
  } catch {
    return [];
  }
  const excluded = new Set(normalizeTags(exclude));
  const predefined: readonly string[] = PREDEFINED_TAGS;
  const candidates = normalizeTags([...PREDEFINED_TAGS, ...inUse]).filter(
    (tag) => !excluded.has(tag),
  );

  if (query === "") {
    const first = candidates.filter((tag) => predefined.includes(tag));
    const rest = candidates.filter((tag) => !predefined.includes(tag));
    return [...first.sort(byAlphabet), ...rest.sort(byAlphabet)].slice(
      0,
      MAX_SUGGESTIONS,
    );
  }

  const prefix = candidates.filter((tag) => tag.startsWith(query));
  const substring = candidates.filter(
    (tag) => !tag.startsWith(query) && tag.includes(query),
  );
  return [...prefix.sort(byAlphabet), ...substring.sort(byAlphabet)].slice(
    0,
    MAX_SUGGESTIONS,
  );
}

export function tagsInUse(
  documents: readonly { tags: readonly string[] }[],
): string[] {
  const all = new Set<string>();
  for (const document of documents) {
    for (const tag of document.tags) all.add(tag);
  }
  return [...all].sort(byAlphabet);
}
