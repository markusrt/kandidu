import { uniqueFileNames, withExtension } from "./fileNames";
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
