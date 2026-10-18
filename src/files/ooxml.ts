import PizZip from "pizzip";

// Minimal WordprocessingML package writer (research R2). Produces the parts
// Word and LibreOffice need: content types, package rels, document, styles,
// optional header.

export interface Run {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
}

export interface Paragraph {
  readonly runs: readonly Run[];
  readonly style?: "Title" | "Heading1" | "Small";
  readonly align?: "left" | "right";
  readonly spaceAfter?: number;
}

export interface DocxParts {
  readonly body: readonly Paragraph[];
  readonly header?: readonly Paragraph[];
  /** Raw XML inserted between runs, e.g. `<w:proofErr w:type="spellStart"/>`. */
  readonly betweenRuns?: string;
}

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runXml(run: Run): string {
  const props =
    run.bold || run.italic
      ? `<w:rPr>${run.bold ? "<w:b/>" : ""}${run.italic ? "<w:i/>" : ""}</w:rPr>`
      : "";
  return `<w:r>${props}<w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
}

function paragraphXml(paragraph: Paragraph, betweenRuns: string): string {
  const props: string[] = [];
  if (paragraph.style) props.push(`<w:pStyle w:val="${paragraph.style}"/>`);
  if (paragraph.spaceAfter !== undefined) {
    props.push(`<w:spacing w:after="${paragraph.spaceAfter}"/>`);
  }
  if (paragraph.align === "right") props.push('<w:jc w:val="right"/>');
  const pPr = props.length > 0 ? `<w:pPr>${props.join("")}</w:pPr>` : "";
  return `<w:p>${pPr}${paragraph.runs.map(runXml).join(betweenRuns)}</w:p>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W_NS}">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="de-DE"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Small"><w:name w:val="Small"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>
</w:styles>`;

export function buildDocx(parts: DocxParts): Uint8Array {
  const between = parts.betweenRuns ?? "";
  const hasHeader = Boolean(parts.header && parts.header.length > 0);
  const zip = new PizZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
${hasHeader ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ""}
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${R_NS}/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="${R_NS}/styles" Target="styles.xml"/>
${hasHeader ? `<Relationship Id="rIdHeader1" Type="${R_NS}/header" Target="header1.xml"/>` : ""}
</Relationships>`,
  );
  zip.file("word/styles.xml", STYLES);
  if (hasHeader) {
    zip.file(
      "word/header1.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="${W_NS}" xmlns:r="${R_NS}">${(parts.header ?? []).map((p) => paragraphXml(p, between)).join("")}</w:hdr>`,
    );
  }
  const headerRef = hasHeader
    ? '<w:headerReference w:type="default" r:id="rIdHeader1"/>'
    : "";
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${parts.body.map((p) => paragraphXml(p, between)).join("")}<w:sectPr>${headerRef}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1134" w:bottom="1134" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  );
  return zip.generate({ type: "uint8array", compression: "DEFLATE" });
}

/** Plain text of every paragraph in the main document (for tests and checks). */
export function docxParagraphTexts(
  bytes: Uint8Array,
  part = "word/document.xml",
): string[] {
  const xml = new PizZip(bytes).file(part)?.asText() ?? "";
  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  return paragraphs.map((p) =>
    (p.match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g) ?? [])
      .map((t) => t.replace(/<[^>]+>/g, ""))
      .join("")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&"),
  );
}
