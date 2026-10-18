import { buildDocx, type Paragraph } from "./ooxml";

/**
 * One paragraph of a demo template. The text comes from the UI catalog and
 * contains placeholders such as `{Vorname}` (research R11); `**…**` marks a
 * bold segment.
 */
export interface DemoParagraph {
  readonly text: string;
  readonly style?: "Title" | "Heading1" | "Small";
  readonly align?: "left" | "right";
  readonly spaceAfter?: number;
}

function toParagraph(paragraph: DemoParagraph): Paragraph {
  const runs = paragraph.text
    .split(/(\*\*[^*]+\*\*)/)
    .filter((part) => part.length > 0)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? { text: part.slice(2, -2), bold: true }
        : { text: part },
    );
  return {
    runs: runs.length > 0 ? runs : [{ text: "" }],
    ...(paragraph.style ? { style: paragraph.style } : {}),
    ...(paragraph.align ? { align: paragraph.align } : {}),
    ...(paragraph.spaceAfter !== undefined
      ? { spaceAfter: paragraph.spaceAfter }
      : {}),
  };
}

/** Builds a demo DOCX template from catalog paragraphs (FR-003). */
export function buildDemoTemplate(
  paragraphs: readonly DemoParagraph[],
): Uint8Array {
  return buildDocx({ body: paragraphs.map(toParagraph) });
}
