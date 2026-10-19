import { datedName, uniqueFileNames, withExtension } from "./fileNames";
import {
  type Lead,
  LeadError,
  type PackageDef,
  type PackageItem,
} from "./lead";

// Package definitions (FR-030–FR-033).

export function defaultPackage(id: string, fileName: string): PackageDef {
  return {
    id,
    fileName: withExtension(fileName, "pdf"),
    items: [{ kind: "coverLetter" }, { kind: "cv" }],
  };
}

export type PackagePreset = "all" | "coverLetterAndCv" | "evidence";

/** File-name words for the presets, from the UI catalog. */
export interface PackageWords {
  readonly application: string;
  readonly coverLetterAndCv: string;
  readonly certificates: string;
}

/**
 * A new package from a preset with its suggested name (FR-031):
 * all → `…_Bewerbung.pdf`, coverLetterAndCv → `…_Anschreiben_Lebenslauf.pdf`,
 * evidence → `…_Zeugnisse.pdf`. Undefined when the preset would be empty.
 */
export function presetPackage(
  preset: PackagePreset,
  id: string,
  date: string,
  company: string,
  words: PackageWords,
  evidenceIds: readonly string[],
): PackageDef | undefined {
  const documents: PackageItem[] = evidenceIds.map((documentId) => ({
    kind: "document",
    documentId,
  }));
  const letters: PackageItem[] = [{ kind: "coverLetter" }, { kind: "cv" }];
  const items =
    preset === "all"
      ? [...letters, ...documents]
      : preset === "coverLetterAndCv"
        ? letters
        : documents;
  if (items.length === 0) return undefined;
  const word =
    preset === "all"
      ? words.application
      : preset === "coverLetterAndCv"
        ? words.coverLetterAndCv
        : words.certificates;
  return { id, fileName: datedName(date, [company, word], "pdf"), items };
}

export function itemKey(item: PackageItem): string {
  return item.kind === "document" ? `document:${item.documentId}` : item.kind;
}

/** Packages to show: stored ones, or the default when none exist yet. */
export function effectivePackages(
  lead: Lead,
  fallback: () => PackageDef,
): readonly PackageDef[] {
  return lead.packages.length > 0 ? lead.packages : [fallback()];
}

export function moveItem(
  def: PackageDef,
  index: number,
  delta: -1 | 1,
): PackageDef {
  const target = index + delta;
  if (target < 0 || target >= def.items.length) return def;
  const items = [...def.items];
  const [item] = items.splice(index, 1);
  if (item) items.splice(target, 0, item);
  return { ...def, items };
}

export function renamePackage(def: PackageDef, fileName: string): PackageDef {
  return { ...def, fileName: withExtension(fileName, "pdf") };
}

export function addItem(def: PackageDef, item: PackageItem): PackageDef {
  if (def.items.some((existing) => itemKey(existing) === itemKey(item))) {
    return def;
  }
  return { ...def, items: [...def.items, item] };
}

export function removeItem(def: PackageDef, index: number): PackageDef {
  if (def.items.length <= 1) return def;
  return { ...def, items: def.items.filter((_, i) => i !== index) };
}

export interface DocumentUsage {
  readonly lead: Lead;
  readonly packages: readonly PackageDef[];
}

/** Leads and packages that contain a stored document (FR-038). */
export function documentUsage(
  leads: readonly Lead[],
  documentId: string,
): DocumentUsage[] {
  const uses = (def: PackageDef) =>
    def.items.some(
      (item) => item.kind === "document" && item.documentId === documentId,
    );
  return leads
    .map((lead) => ({ lead, packages: lead.packages.filter(uses) }))
    .filter((usage) => usage.packages.length > 0);
}

/**
 * The lead without the document in its packages; a package left empty is
 * dropped (no lead packages left = the default package applies again).
 */
export function withoutDocument(
  lead: Lead,
  documentId: string,
  now: string,
): Lead {
  const packages = lead.packages
    .map((def) => ({
      ...def,
      items: def.items.filter(
        (item) => !(item.kind === "document" && item.documentId === documentId),
      ),
    }))
    .filter((def) => def.items.length > 0);
  return { ...lead, packages, updatedAt: now };
}

/** Stores package definitions on a released lead; names become unique. */
export function setPackages(
  lead: Lead,
  packages: readonly PackageDef[],
  now: string,
): Lead {
  if (lead.status === "review") throw new LeadError("transition-not-allowed");
  if (packages.length === 0 || packages.some((p) => p.items.length === 0)) {
    throw new LeadError("lead-invalid");
  }
  const names = uniqueFileNames(packages.map((p) => p.fileName));
  return {
    ...lead,
    packages: packages.map((p, i) => ({
      ...p,
      fileName: names[i] ?? p.fileName,
    })),
    updatedAt: now,
  };
}
