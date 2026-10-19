import { z } from "zod";
import type {
  DocumentRecord,
  TemplateKind,
  TemplateRecord,
} from "../domain/documents";
import type { Lead } from "../domain/lead";
import type { Profile } from "../domain/profile";
import type { Project } from "../domain/project";
import { unzipFiles, zipFiles } from "../files/zip";
import { type AppSnapshot, StoreError } from "./port";
import {
  documentSchema,
  leadSchema,
  profileSchema,
  projectSchema,
  SCHEMA_VERSION,
  templateSchema,
} from "./schema";

// Backup ZIP (contracts/backup-format.md, FR-043). Import validates the whole
// archive before the adapter changes anything.

export const BACKUP_FORMAT = "kandidu-backup";
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_JSON = "kandidu-backup.json";
export const BACKUP_README = "LIESMICH.txt";
const FILE_PREFIX = "files/";

export interface BackupContents {
  readonly snapshot: AppSnapshot;
  readonly files: ReadonlyMap<string, Uint8Array>;
}

/** Every file id the data refers to, once, in a stable order. */
export function referencedFileIds(snapshot: AppSnapshot): string[] {
  const ids = [
    ...Object.values(snapshot.templates).map((t) => t?.fileId),
    ...snapshot.documents.map((d) => d.fileId),
    ...snapshot.leads.map((l) => l.coverLetterPdf?.fileId),
  ].filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes as Uint8Array<ArrayBuffer>,
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const encoder = new TextEncoder();

export async function buildBackup(
  snapshot: AppSnapshot,
  readFile: (fileId: string) => Promise<Uint8Array>,
  readme: string,
  exportedAt: string,
): Promise<Uint8Array> {
  const ids = referencedFileIds(snapshot);
  const files: { id: string; bytes: Uint8Array; sha256: string }[] = [];
  for (const id of ids) {
    const bytes = await readFile(id);
    files.push({ id, bytes, sha256: await sha256Hex(bytes) });
  }
  const manifest = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    data: {
      profile: snapshot.profile ?? null,
      templates: Object.values(snapshot.templates),
      documents: snapshot.documents,
      projects: snapshot.projects,
      leads: snapshot.leads,
    },
    files: files.map(({ id, bytes, sha256 }) => ({
      id,
      size: bytes.byteLength,
      sha256,
    })),
  };
  return zipFiles([
    {
      name: BACKUP_JSON,
      bytes: encoder.encode(JSON.stringify(manifest, null, 2)),
      compress: true,
    },
    { name: BACKUP_README, bytes: encoder.encode(readme), compress: true },
    // Stored files are PDF/DOCX, already compressed.
    ...files.map(({ id, bytes }) => ({
      name: `${FILE_PREFIX}${id}`,
      bytes,
      compress: false,
    })),
  ]);
}

const versionSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.number().int().min(1),
  schemaVersion: z.number().int().min(1),
});

const manifestSchema = z.object({
  exportedAt: z.string(),
  data: z.object({
    profile: z.unknown(),
    templates: z.array(z.unknown()),
    documents: z.array(z.unknown()),
    projects: z.array(z.unknown()),
    leads: z.array(z.unknown()),
  }),
  files: z.array(
    z.object({
      id: z.string().min(1),
      size: z.number().int().nonnegative(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
    }),
  ),
});

const invalid = () => new StoreError("backup-invalid");

function parseList<T>(schema: z.ZodType, values: readonly unknown[]): T[] {
  return values.map((value) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw invalid();
    return parsed.data as T;
  });
}

function assertUnique(keys: readonly string[]): void {
  if (new Set(keys).size !== keys.length) throw invalid();
}

/**
 * Reads and fully validates a backup ZIP. Throws `backup-invalid` for a
 * damaged or incomplete archive and `unsupported-version` for a newer one.
 */
export async function parseBackup(zip: Uint8Array): Promise<BackupContents> {
  let entries: Map<string, Uint8Array>;
  try {
    entries = unzipFiles(zip);
  } catch {
    throw invalid();
  }
  const json = entries.get(BACKUP_JSON);
  if (!json) throw invalid();
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(json));
  } catch {
    throw invalid();
  }
  const version = versionSchema.safeParse(raw);
  if (!version.success) throw invalid();
  if (
    version.data.formatVersion > BACKUP_FORMAT_VERSION ||
    version.data.schemaVersion > SCHEMA_VERSION
  ) {
    throw new StoreError("unsupported-version");
  }
  const manifest = manifestSchema.safeParse(raw);
  if (!manifest.success) throw invalid();
  const { data } = manifest.data;

  const profile =
    data.profile === null || data.profile === undefined
      ? undefined
      : parseList<Profile>(profileSchema, [data.profile])[0];
  const templates = parseList<TemplateRecord>(templateSchema, data.templates);
  const documents = parseList<DocumentRecord>(documentSchema, data.documents);
  const projects = parseList<Project>(projectSchema, data.projects);
  const leads = parseList<Lead>(leadSchema, data.leads);
  assertUnique(templates.map((t) => t.kind));
  assertUnique(documents.map((d) => d.id));
  assertUnique(projects.map((p) => p.id));
  assertUnique(leads.map((l) => l.id));
  if (documents.filter((d) => d.role === "cv").length > 1) throw invalid();

  const snapshot: AppSnapshot = {
    profile,
    templates: Object.fromEntries(templates.map((t) => [t.kind, t])) as Partial<
      Record<TemplateKind, TemplateRecord>
    >,
    documents,
    projects,
    leads,
  };

  const listed = new Map(manifest.data.files.map((f) => [f.id, f]));
  const files = new Map<string, Uint8Array>();
  for (const id of referencedFileIds(snapshot)) {
    const entry = listed.get(id);
    const bytes = entries.get(`${FILE_PREFIX}${id}`);
    if (!entry || !bytes || bytes.byteLength !== entry.size) throw invalid();
    if ((await sha256Hex(bytes)) !== entry.sha256) throw invalid();
    files.set(id, bytes);
  }
  return { snapshot, files };
}
