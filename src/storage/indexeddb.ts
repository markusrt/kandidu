import {
  type DBSchema,
  deleteDB,
  type IDBPDatabase,
  type IDBPTransaction,
  openDB,
  type StoreNames,
} from "idb";
import type { z } from "zod";
import type {
  DocumentRecord,
  TemplateKind,
  TemplateRecord,
} from "../domain/documents";
import type { Lead } from "../domain/lead";
import type { Profile } from "../domain/profile";
import type { Project } from "../domain/project";
import { buildBackup, parseBackup } from "./backup";
import {
  type AppSnapshot,
  type KandiduStore,
  StoreError,
  type StoreErrorCode,
} from "./port";
import {
  documentSchema,
  leadSchema,
  metaSchema,
  profileSchema,
  projectSchema,
  SCHEMA_VERSION,
  templateSchema,
} from "./schema";

// ADR 008: the only database this app owns. Never touch other origin storage.
export const DB_NAME = "kandidu:data";
export const CHANGE_CHANNEL = "kandidu:changes";

interface Meta {
  schemaVersion: number;
  revision: number;
}

interface StoredFile {
  id: string;
  bytes: ArrayBuffer;
}

interface KandiduDb extends DBSchema {
  meta: { key: string; value: Meta };
  profile: { key: string; value: Profile };
  templates: { key: TemplateKind; value: TemplateRecord };
  documents: { key: string; value: DocumentRecord };
  projects: { key: string; value: Project };
  leads: { key: string; value: Lead; indexes: { projectId: string } };
  files: { key: string; value: StoredFile };
}

type Db = IDBPDatabase<KandiduDb>;
type StoreName = Exclude<StoreNames<KandiduDb>, "meta">;
type Tx = IDBPTransaction<
  KandiduDb,
  ArrayLike<StoreNames<KandiduDb>>,
  "readwrite"
>;

const META_KEY = "meta";
const PROFILE_KEY = "profile";

export function openKandiduDb(name = DB_NAME): Promise<Db> {
  return openDB<KandiduDb>(name, SCHEMA_VERSION, {
    upgrade(db) {
      db.createObjectStore("meta");
      db.createObjectStore("profile");
      db.createObjectStore("templates");
      db.createObjectStore("documents", { keyPath: "id" });
      db.createObjectStore("projects", { keyPath: "id" });
      const leads = db.createObjectStore("leads", { keyPath: "id" });
      leads.createIndex("projectId", "projectId");
      db.createObjectStore("files", { keyPath: "id" });
    },
  });
}

export interface IndexedDbStoreOptions {
  readonly name?: string;
  readonly open?: (name: string) => Promise<Db>;
  readonly storage?: Pick<StorageManager, "estimate" | "persist" | "persisted">;
  readonly channel?: () => BroadcastChannel | undefined;
}

function parseAll<T>(schema: z.ZodType, values: readonly unknown[]): T[] {
  return values.map((value) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw new StoreError("data-invalid");
    return parsed.data as T;
  });
}

function check(schema: z.ZodType, value: unknown): void {
  if (!schema.safeParse(value).success) throw new StoreError("record-invalid");
}

/** Maps a failed write to a store error code (exported for tests). */
export function writeError(
  cause: unknown,
  fallback: StoreErrorCode,
): StoreError {
  if (cause instanceof StoreError) return cause;
  const name =
    cause instanceof DOMException || cause instanceof Error ? cause.name : "";
  if (name === "QuotaExceededError") return new StoreError("quota-exceeded");
  return new StoreError(fallback);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function createIndexedDbStore(
  options: IndexedDbStoreOptions = {},
): KandiduStore {
  const name = options.name ?? DB_NAME;
  const open = options.open ?? openKandiduDb;
  const storage =
    options.storage ??
    (typeof navigator !== "undefined" ? navigator.storage : undefined);
  const channel =
    options.channel?.() ??
    (typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(CHANGE_CHANNEL)
      : undefined);

  let db: Db | undefined;
  // Writes stay blocked until a load succeeded (ADR 002/008 recovery model).
  let loaded = false;
  let knownRevision = 0;

  async function connection(): Promise<Db> {
    if (db) return db;
    try {
      db = await open(name);
    } catch {
      throw new StoreError("read-failed");
    }
    db.addEventListener("versionchange", () => {
      db?.close();
      db = undefined;
    });
    return db;
  }

  async function write(
    stores: readonly StoreName[],
    work: (tx: Tx) => Promise<void>,
    fallback: StoreErrorCode = "save-failed",
  ): Promise<void> {
    if (!loaded) throw new StoreError("store-blocked");
    const database = await connection().catch((cause) => {
      throw writeError(cause, fallback);
    });
    try {
      const tx = database.transaction(["meta", ...stores], "readwrite");
      const done = tx.done;
      // Mark as handled at once: an abort may settle it before we await it.
      done.catch(() => undefined);
      try {
        const meta = await tx.objectStore("meta").get(META_KEY);
        const revision = meta?.revision ?? 0;
        if (revision !== knownRevision) throw new StoreError("conflict");
        await work(tx);
        await tx
          .objectStore("meta")
          .put(
            { schemaVersion: SCHEMA_VERSION, revision: revision + 1 },
            META_KEY,
          );
      } catch (cause) {
        try {
          tx.abort();
        } catch {
          // Already finished or aborted.
        }
        await done.catch(() => undefined);
        throw cause;
      }
      await done;
      knownRevision += 1;
    } catch (cause) {
      throw writeError(cause, fallback);
    }
    channel?.postMessage({ revision: knownRevision });
  }

  async function replaceFile(
    tx: Tx,
    oldFileId: string | undefined,
    newFileId: string | undefined,
    bytes?: Uint8Array,
  ) {
    const files = tx.objectStore("files");
    if (oldFileId && oldFileId !== newFileId) await files.delete(oldFileId);
    if (bytes && newFileId) {
      await files.put({ id: newFileId, bytes: toArrayBuffer(bytes) });
    }
  }

  async function putLeads(tx: Tx, leads: readonly Lead[]) {
    const store = tx.objectStore("leads");
    for (const lead of leads) {
      const old = await store.get(lead.id);
      await replaceFile(
        tx,
        old?.coverLetterPdf?.fileId,
        lead.coverLetterPdf?.fileId,
      );
      await store.put(lead);
    }
  }

  async function removeLead(tx: Tx, id: string) {
    const store = tx.objectStore("leads");
    const lead = await store.get(id);
    if (!lead) return;
    await replaceFile(tx, lead.coverLetterPdf?.fileId, undefined);
    await store.delete(id);
  }

  /** Reads and validates everything; no effect on the write state. */
  async function readSnapshot(): Promise<{
    snapshot: AppSnapshot;
    revision: number;
  }> {
    const database = await connection();
    try {
      const tx = database.transaction(
        ["meta", "profile", "templates", "documents", "projects", "leads"],
        "readonly",
      );
      const [meta, profile, templates, documents, projects, leads] =
        await Promise.all([
          tx.objectStore("meta").get(META_KEY),
          tx.objectStore("profile").get(PROFILE_KEY),
          tx.objectStore("templates").getAll(),
          tx.objectStore("documents").getAll(),
          tx.objectStore("projects").getAll(),
          tx.objectStore("leads").getAll(),
        ]);
      await tx.done;
      if (meta !== undefined) {
        const parsed = metaSchema.safeParse(meta);
        if (!parsed.success) throw new StoreError("data-invalid");
        if (parsed.data.schemaVersion > SCHEMA_VERSION) {
          throw new StoreError("unsupported-version");
        }
      }
      const templateRecords = parseAll<TemplateRecord>(
        templateSchema,
        templates,
      );
      const snapshot: AppSnapshot = {
        profile:
          profile === undefined
            ? undefined
            : parseAll<Profile>(profileSchema, [profile])[0],
        templates: Object.fromEntries(
          templateRecords.map((record) => [record.kind, record]),
        ),
        documents: parseAll<DocumentRecord>(documentSchema, documents),
        projects: parseAll<Project>(projectSchema, projects),
        leads: parseAll<Lead>(leadSchema, leads),
      };
      return { snapshot, revision: meta?.revision ?? 0 };
    } catch (cause) {
      throw cause instanceof StoreError ? cause : new StoreError("read-failed");
    }
  }

  return {
    async load() {
      loaded = false;
      const { snapshot, revision } = await readSnapshot();
      knownRevision = revision;
      loaded = true;
      return snapshot;
    },

    async readFile(fileId) {
      const database = await connection();
      let file: StoredFile | undefined;
      try {
        file = await database.get("files", fileId);
      } catch {
        throw new StoreError("read-failed");
      }
      if (!file) throw new StoreError("file-missing");
      return new Uint8Array(file.bytes);
    },

    async saveProfile(profile) {
      check(profileSchema, profile);
      await write(["profile"], async (tx) => {
        await tx.objectStore("profile").put(profile, PROFILE_KEY);
      });
    },

    async saveTemplate(record, bytes) {
      check(templateSchema, record);
      await write(["templates", "files"], async (tx) => {
        const store = tx.objectStore("templates");
        const old = await store.get(record.kind);
        await replaceFile(tx, old?.fileId, record.fileId, bytes);
        await store.put(record, record.kind);
      });
    },

    async deleteTemplate(kind) {
      await write(
        ["templates", "files"],
        async (tx) => {
          const store = tx.objectStore("templates");
          const old = await store.get(kind);
          await replaceFile(tx, old?.fileId, undefined);
          await store.delete(kind);
        },
        "delete-failed",
      );
    },

    async saveDocument(record, bytes) {
      check(documentSchema, record);
      await write(["documents", "files"], async (tx) => {
        const store = tx.objectStore("documents");
        const old = await store.get(record.id);
        if (!old && !bytes) throw new StoreError("file-missing");
        if (record.role === "cv") {
          // Exactly one global CV PDF (FR-028).
          for (const other of await store.getAll()) {
            if (other.role === "cv" && other.id !== record.id) {
              await replaceFile(tx, other.fileId, undefined);
              await store.delete(other.id);
            }
          }
        }
        await replaceFile(tx, old?.fileId, record.fileId, bytes);
        await store.put(record);
      });
    },

    async deleteDocument(id, affectedLeads) {
      for (const lead of affectedLeads) check(leadSchema, lead);
      await write(
        ["documents", "files", "leads"],
        async (tx) => {
          const store = tx.objectStore("documents");
          const old = await store.get(id);
          await replaceFile(tx, old?.fileId, undefined);
          await store.delete(id);
          await putLeads(tx, affectedLeads);
        },
        "delete-failed",
      );
    },

    async saveProject(project) {
      check(projectSchema, project);
      await write(["projects"], async (tx) => {
        await tx.objectStore("projects").put(project);
      });
    },

    async saveLeads(leads, project) {
      for (const lead of leads) check(leadSchema, lead);
      if (project) check(projectSchema, project);
      await write(["leads", "files", "projects"], async (tx) => {
        await putLeads(tx, leads);
        if (project) await tx.objectStore("projects").put(project);
      });
    },

    async saveLeadFile(lead, bytes) {
      check(leadSchema, lead);
      if (!lead.coverLetterPdf) throw new StoreError("record-invalid");
      const fileId = lead.coverLetterPdf.fileId;
      await write(["leads", "files"], async (tx) => {
        await putLeads(tx, [lead]);
        await replaceFile(tx, undefined, fileId, bytes);
      });
    },

    async deleteLead(id) {
      await write(
        ["leads", "files"],
        async (tx) => {
          await removeLead(tx, id);
        },
        "delete-failed",
      );
    },

    async deleteProject(id) {
      await write(
        ["projects", "leads", "files"],
        async (tx) => {
          const leads = await tx
            .objectStore("leads")
            .index("projectId")
            .getAll(id);
          for (const lead of leads) await removeLead(tx, lead.id);
          await tx.objectStore("projects").delete(id);
        },
        "delete-failed",
      );
    },

    async exportBackup(readme) {
      // Reads the stored state directly (no effect on conflict detection).
      const { snapshot } = await readSnapshot();
      return buildBackup(
        snapshot,
        (fileId) => this.readFile(fileId),
        readme,
        new Date().toISOString(),
      );
    },

    async importBackup(zip) {
      // Everything is validated before the first write (contract rule 3).
      const { snapshot, files } = await parseBackup(zip);
      const database = await connection().catch((cause) => {
        throw writeError(cause, "save-failed");
      });
      let revision = 0;
      try {
        const tx = database.transaction(
          [
            "meta",
            "profile",
            "templates",
            "documents",
            "projects",
            "leads",
            "files",
          ],
          "readwrite",
        );
        const done = tx.done;
        done.catch(() => undefined);
        try {
          // A confirmed full replace: works from the recovery view too, so
          // the old meta is only used to keep the revision increasing.
          const old = metaSchema.safeParse(
            await tx.objectStore("meta").get(META_KEY),
          );
          revision = (old.success ? old.data.revision : knownRevision) + 1;
          for (const store of [
            "profile",
            "templates",
            "documents",
            "projects",
            "leads",
            "files",
          ] as const) {
            await tx.objectStore(store).clear();
          }
          if (snapshot.profile) {
            await tx.objectStore("profile").put(snapshot.profile, PROFILE_KEY);
          }
          for (const record of Object.values(snapshot.templates)) {
            if (record)
              await tx.objectStore("templates").put(record, record.kind);
          }
          for (const record of snapshot.documents) {
            await tx.objectStore("documents").put(record);
          }
          for (const record of snapshot.projects) {
            await tx.objectStore("projects").put(record);
          }
          for (const record of snapshot.leads) {
            await tx.objectStore("leads").put(record);
          }
          for (const [id, bytes] of files) {
            await tx
              .objectStore("files")
              .put({ id, bytes: toArrayBuffer(bytes) });
          }
          await tx
            .objectStore("meta")
            .put({ schemaVersion: SCHEMA_VERSION, revision }, META_KEY);
        } catch (cause) {
          try {
            tx.abort();
          } catch {
            // Already finished or aborted.
          }
          await done.catch(() => undefined);
          throw cause;
        }
        await done;
      } catch (cause) {
        throw writeError(cause, "save-failed");
      }
      knownRevision = revision;
      loaded = true;
      channel?.postMessage({ revision: knownRevision });
      return snapshot;
    },

    async resetAll() {
      db?.close();
      db = undefined;
      try {
        await deleteDB(name);
      } catch {
        throw new StoreError("delete-failed");
      }
      knownRevision = 0;
      loaded = false;
    },

    async storageEstimate() {
      if (!storage?.estimate) return undefined;
      try {
        const { usage, quota } = await storage.estimate();
        if (usage === undefined || quota === undefined) return undefined;
        return { usage, quota };
      } catch {
        return undefined;
      }
    },

    async requestPersistence() {
      if (!storage?.persist) return "unsupported";
      try {
        return (await storage.persist()) ? "granted" : "denied";
      } catch {
        return "denied";
      }
    },

    async persistenceState() {
      if (!storage?.persisted) return "unsupported";
      try {
        return (await storage.persisted()) ? "granted" : "denied";
      } catch {
        return "unsupported";
      }
    },

    onExternalChange(listener) {
      if (!channel) return () => undefined;
      const handler = () => listener();
      channel.addEventListener("message", handler);
      return () => channel.removeEventListener("message", handler);
    },
  };
}
