export const MOTIVATION_MAX_PARAGRAPHS = 2;

/** Splits plain text into paragraphs at blank lines (FR-022). */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

export function exceedsMotivationLimit(text: string): boolean {
  return splitParagraphs(text).length > MOTIVATION_MAX_PARAGRAPHS;
}
