# Contract: Storage port (`src/storage/port.ts`)

Asynchronous, adapter-independent. The IndexedDB adapter (`src/storage/indexeddb.ts`)
is composed in `src/main.tsx`; the UI only sees this interface (dependency-cruiser
rule `ui-uses-storage-port`).

```ts
interface AppSnapshot {
  profile: Profile | undefined;
  templates: Partial<Record<TemplateKind, TemplateRecord>>;
  documents: DocumentRecord[];          // evidence + global CV
  projects: Project[];
  leads: Lead[];
}

interface KandiduStore {
  load(): Promise<AppSnapshot>;                       // validates everything; throws StoreError
  readFile(fileId: string): Promise<Uint8Array>;      // file-missing if absent

  saveProfile(profile: Profile): Promise<void>;
  saveTemplate(record: TemplateRecord, bytes: Uint8Array): Promise<void>;   // replaces old file atomically
  deleteTemplate(kind: TemplateKind): Promise<void>;
  saveDocument(record: DocumentRecord, bytes?: Uint8Array): Promise<void>;  // bytes on create/replace
  deleteDocument(id: string, affectedLeads: Lead[]): Promise<void>;         // cascade (FR-038)

  saveProject(project: Project): Promise<void>;
  saveLeads(leads: Lead[], project?: Project): Promise<void>;               // one transaction; with project = atomic response import
  saveLeadFile(lead: Lead, bytes: Uint8Array): Promise<void>;               // cover letter PDF + lead
  deleteLead(id: string): Promise<void>;                                    // cascade (FR-037)
  deleteProject(id: string): Promise<void>;                                 // cascade (FR-037)

  exportBackup(): Promise<Uint8Array>;                                      // C2, contracts/backup-format.md
  importBackup(zip: Uint8Array): Promise<AppSnapshot>;                      // validates fully, then replaces
  resetAll(): Promise<void>;                                                // only own database, confirmed by user

  storageEstimate(): Promise<{ usage: number; quota: number } | undefined>;
  requestPersistence(): Promise<"granted" | "denied" | "unsupported">;
  onExternalChange(listener: () => void): () => void;                       // other tab wrote (FR-044)
}
```

Rules:

- A method resolves only after its transaction committed (FR-040). The UI shows
  "gespeichert" only then.
- `load` failure (`read-failed`, `data-invalid`, `unsupported-version`) blocks all
  writes until a successful `load` or a confirmed `resetAll`/`importBackup`
  (as in the starter's recovery model).
- `QuotaExceededError` → `quota-exceeded`; other write failures → `save-failed`.
- Writes before a successful `load` → `store-blocked`; records failing their Zod
  schema are refused before any write → `record-invalid`.
- Replacing or dropping a file reference (template, CV PDF, cover letter PDF)
  deletes the old bytes in the same transaction; `saveDocument` with role `cv`
  removes any other CV record and its bytes (exactly one global CV PDF).
- Every write checks and increments `meta.revision`; mismatch → `conflict` (C2).
- Deletes remove file bytes in the same transaction as the records that referenced them.
- The adapter never touches databases or keys other than `kandidu:data`.
