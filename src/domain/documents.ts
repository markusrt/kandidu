export type TemplateKind = "cv" | "coverLetter";

export const TEMPLATE_KINDS: readonly TemplateKind[] = ["cv", "coverLetter"];

/** A user-uploaded template that passed validation (FR-008). */
export interface TemplateRecord {
  readonly kind: TemplateKind;
  readonly fileName: string;
  readonly fileId: string;
  readonly size: number;
  readonly uploadedAt: string;
  readonly tags: readonly string[];
}

export type DocumentRole = "evidence" | "cv";

/** A stored PDF: evidence (Nachweis) or the single global CV PDF. */
export interface DocumentRecord {
  readonly id: string;
  readonly role: DocumentRole;
  readonly name: string;
  readonly fileName: string;
  readonly tags: readonly string[];
  readonly fileId: string;
  readonly size: number;
  readonly pageCount: number;
  readonly uploadedAt: string;
}

/** Reference to a stored PDF file owned by another record. */
export interface FileRef {
  readonly fileId: string;
  readonly fileName: string;
  readonly size: number;
  readonly pageCount: number;
  readonly uploadedAt: string;
}

export const DOCUMENT_NAME_MAX = 120;

export function findCvDocument(
  documents: readonly DocumentRecord[],
): DocumentRecord | undefined {
  return documents.find((document) => document.role === "cv");
}
