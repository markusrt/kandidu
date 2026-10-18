import type { TemplateKind } from "../domain/documents";
import { FileError } from "../files/errors";
import type { AppSnapshot, KandiduStore } from "../storage/port";
import type { Messages } from "./i18n";

// Lazy access to the document libraries (ADR 009) so first paint stays fast.

export const loadDocx = () => import("../files/docx");
export const loadPdf = () => import("../files/pdf");
export const loadZip = () => import("../files/zip");
export const loadDemo = () => import("../files/demoTemplates");

/** Reads a picked file after a cheap size check (no full read for huge files). */
export async function readPicked(file: File, max: number): Promise<Uint8Array> {
  if (file.size > max) throw new FileError("file-too-large");
  return new Uint8Array(await file.arrayBuffer());
}

/** Bytes of the active template: the uploaded one, else the demo. */
export async function activeTemplateBytes(
  kind: TemplateKind,
  snapshot: AppSnapshot,
  store: KandiduStore,
  m: Messages,
): Promise<Uint8Array> {
  const record = snapshot.templates[kind];
  if (record) return store.readFile(record.fileId);
  const { buildDemoTemplate } = await loadDemo();
  return buildDemoTemplate(kind === "cv" ? m.demo.cv : m.demo.coverLetter);
}

/** Placeholder names used by the active template. */
export async function activeTemplateTags(
  kind: TemplateKind,
  bytes: Uint8Array,
): Promise<readonly string[]> {
  const { inspectTemplate } = await loadDocx();
  const result = inspectTemplate(bytes, kind);
  return result.ok ? result.tags : [];
}
