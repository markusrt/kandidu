// File names for downloads and ZIP entries (FR-027, FR-031).

const FORBIDDEN = /[\\/:*?"<>|]/g;
export const FILE_NAME_PART_MAX = 60;

function withoutControlChars(text: string): string {
  return [...text]
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? " " : char;
    })
    .join("");
}

/**
 * Makes text safe as part of a file name on Windows, macOS and Linux.
 * `fallback` replaces parts that sanitize to nothing.
 */
export function safeFileNamePart(text: string, fallback = "_"): string {
  const clean = withoutControlChars(text)
    .normalize("NFC")
    .replace(FORBIDDEN, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "")
    .slice(0, FILE_NAME_PART_MAX)
    .replace(/[_.]+$/g, "");
  return clean || fallback;
}

/** `YYYY-MM-DD_Part_Part.ext` with every part made safe. */
export function datedName(
  date: string,
  parts: readonly string[],
  extension: string,
): string {
  const safe = parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => safeFileNamePart(part));
  return `${[date, ...safe].join("_")}.${extension}`;
}

/** Ensures `name` ends with `.ext` and is safe; keeps the user's wording. */
export function withExtension(name: string, extension: string): string {
  const suffix = `.${extension}`;
  const base = name.toLowerCase().endsWith(suffix)
    ? name.slice(0, -suffix.length)
    : name;
  return `${safeFileNamePart(base)}${suffix}`;
}

/** Appends " (2)", " (3)" … to case-insensitive duplicates, keeping order. */
export function uniqueFileNames(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let candidate = name;
    for (let n = 2; used.has(candidate.toLowerCase()); n++) {
      candidate = `${base} (${n})${ext}`;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
