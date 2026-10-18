import { buildDocx, type Paragraph, type Run } from "../ooxml";

// Test-only builders for DOCX templates that look like Word output: tags split
// across several formatted runs, with proofing and bookmark markers between
// runs (research R2). Synthetic content only.

export type FixtureParagraph = readonly (string | Run)[];

export interface FixtureOptions {
  readonly proofErr?: boolean;
  readonly bookmarks?: boolean;
  readonly header?: readonly FixtureParagraph[];
}

const PROOF =
  '<w:proofErr w:type="spellStart"/><w:proofErr w:type="spellEnd"/>';
const BOOKMARK =
  '<w:bookmarkStart w:id="0" w:name="_GoBack"/><w:bookmarkEnd w:id="0"/>';

function toParagraph(runs: FixtureParagraph): Paragraph {
  return {
    runs: runs.map((run) => (typeof run === "string" ? { text: run } : run)),
  };
}

export function buildFixtureDocx(
  paragraphs: readonly FixtureParagraph[],
  options: FixtureOptions = {},
): Uint8Array {
  const between = `${options.proofErr ? PROOF : ""}${options.bookmarks ? BOOKMARK : ""}`;
  return buildDocx({
    body: paragraphs.map(toParagraph),
    ...(options.header ? { header: options.header.map(toParagraph) } : {}),
    betweenRuns: between,
  });
}

/** Splits text into runs of the given sizes, alternating bold, like Word does. */
export function splitRuns(text: string, ...sizes: number[]): Run[] {
  const runs: Run[] = [];
  let index = 0;
  for (const [i, size] of sizes.entries()) {
    runs.push({ text: text.slice(index, index + size), bold: i % 2 === 1 });
    index += size;
  }
  if (index < text.length) runs.push({ text: text.slice(index) });
  return runs;
}
