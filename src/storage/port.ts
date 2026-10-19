import type {
  DocumentRecord,
  TemplateKind,
  TemplateRecord,
} from "../domain/documents";
import type { Lead } from "../domain/lead";
import type { Profile } from "../domain/profile";
import type { Project } from "../domain/project";

export interface AppSnapshot {
  readonly profile: Profile | undefined;
  readonly templates: Partial<Record<TemplateKind, TemplateRecord>>;
  readonly documents: readonly DocumentRecord[];
  readonly projects: readonly Project[];
  readonly leads: readonly Lead[];
}

export type PersistenceResult = "granted" | "denied" | "unsupported";

export interface StorageEstimate {
  readonly usage: number;
  readonly quota: number;
}

/**
 * Asynchronous storage boundary (contracts/storage-port.md). Every write
 * resolves only after its transaction committed.
 */
export interface KandiduStore {
  load(): Promise<AppSnapshot>;
  readFile(fileId: string): Promise<Uint8Array>;

  saveProfile(profile: Profile): Promise<void>;
  saveTemplate(record: TemplateRecord, bytes: Uint8Array): Promise<void>;
  deleteTemplate(kind: TemplateKind): Promise<void>;
  saveDocument(record: DocumentRecord, bytes?: Uint8Array): Promise<void>;
  deleteDocument(id: string, affectedLeads: readonly Lead[]): Promise<void>;

  saveProject(project: Project): Promise<void>;
  saveLeads(leads: readonly Lead[], project?: Project): Promise<void>;
  saveLeadFile(lead: Lead, bytes: Uint8Array): Promise<void>;
  deleteLead(id: string): Promise<void>;
  deleteProject(id: string): Promise<void>;

  /** Backup ZIP of all data and files; `readme` is the catalog's LIESMICH text. */
  exportBackup(readme: string): Promise<Uint8Array>;
  /** Validates the whole backup first, then replaces everything in one transaction. */
  importBackup(zip: Uint8Array): Promise<AppSnapshot>;
  resetAll(): Promise<void>;

  storageEstimate(): Promise<StorageEstimate | undefined>;
  requestPersistence(): Promise<PersistenceResult>;
  /** Whether the browser already granted persistent storage (no prompt). */
  persistenceState(): Promise<PersistenceResult>;
  onExternalChange(listener: () => void): () => void;
}

export type StoreErrorCode =
  | "read-failed"
  | "data-invalid"
  | "save-failed"
  | "quota-exceeded"
  | "conflict"
  | "file-missing"
  | "delete-failed"
  | "unsupported-version"
  | "store-blocked"
  | "record-invalid"
  | "backup-invalid";

// Adapters report codes, not user-facing text; the UI localizes them.
export class StoreError extends Error {
  readonly code: StoreErrorCode;

  constructor(code: StoreErrorCode) {
    super(code);
    this.name = "StoreError";
    this.code = code;
  }
}
