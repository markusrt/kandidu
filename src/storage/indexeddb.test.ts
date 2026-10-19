import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import type { DocumentRecord, TemplateRecord } from "../domain/documents";
import { sampleLead, sampleProfile, sampleProject } from "../domain/testing";
import {
  createIndexedDbStore,
  DB_NAME,
  openKandiduDb,
  writeError,
} from "./indexeddb";
import { StoreError, type StoreErrorCode } from "./port";

const noChannel = () => undefined;

beforeEach(() => {
  // Fresh in-memory engine per test.
  globalThis.indexedDB = new IDBFactory();
});

function store() {
  return createIndexedDbStore({ channel: noChannel });
}

async function expectCode(promise: Promise<unknown>, code: StoreErrorCode) {
  const error = await promise.then(
    () => undefined,
    (cause: unknown) => cause,
  );
  expect(error).toBeInstanceOf(StoreError);
  expect((error as StoreError).code).toBe(code);
}

const bytes = (...values: number[]) => new Uint8Array(values);

function template(fileId: string): TemplateRecord {
  return {
    kind: "coverLetter",
    fileName: "anschreiben.docx",
    fileId,
    size: 3,
    uploadedAt: "2026-10-18T10:00:00.000Z",
    tags: ["Vorname"],
  };
}

function cvDocument(id: string, fileId: string): DocumentRecord {
  return {
    id,
    role: "cv",
    name: "Lebenslauf",
    fileName: "cv.pdf",
    tags: [],
    fileId,
    size: 3,
    pageCount: 2,
    uploadedAt: "2026-10-18T10:00:00.000Z",
  };
}

async function storedFileIds(): Promise<string[]> {
  const db = await openDB(DB_NAME);
  const keys = await db.getAllKeys("files" as never);
  db.close();
  return keys.map(String).sort();
}

async function rawPut(storeName: string, value: unknown, key?: string) {
  const db = await openDB(DB_NAME);
  await db.put(storeName as never, value as never, key as never);
  db.close();
}

describe("IndexedDB store", () => {
  it("loads an empty snapshot from a fresh database", async () => {
    expect(await store().load()).toEqual({
      profile: undefined,
      templates: {},
      documents: [],
      projects: [],
      leads: [],
    });
  });

  it("round-trips records and files across instances", async () => {
    const first = store();
    await first.load();
    await first.saveProfile(sampleProfile());
    await first.saveTemplate(template("t1"), bytes(1, 2, 3));
    await first.saveProject(sampleProject());
    await first.saveLeads([sampleLead()]);

    const second = store();
    const snapshot = await second.load();
    expect(snapshot.profile).toEqual(sampleProfile());
    expect(snapshot.templates.coverLetter?.fileId).toBe("t1");
    expect(snapshot.projects).toHaveLength(1);
    expect(snapshot.leads[0]?.company.name).toBe("Beispiel GmbH");
    expect(await second.readFile("t1")).toEqual(bytes(1, 2, 3));
  });

  it("replaces a template file atomically and removes the old bytes", async () => {
    const s = store();
    await s.load();
    await s.saveTemplate(template("t1"), bytes(1));
    await s.saveTemplate(template("t2"), bytes(2));
    await expectCode(s.readFile("t1"), "file-missing");
    expect(await s.readFile("t2")).toEqual(bytes(2));
    await s.deleteTemplate("coverLetter");
    expect((await s.load()).templates).toEqual({});
    await expectCode(s.readFile("t2"), "file-missing");
  });

  it("keeps exactly one global CV PDF", async () => {
    const s = store();
    await s.load();
    await s.saveDocument(cvDocument("cv1", "f1"), bytes(1));
    await s.saveDocument(cvDocument("cv2", "f2"), bytes(2));
    const { documents } = await s.load();
    expect(documents.map((d) => d.id)).toEqual(["cv2"]);
    await expectCode(s.readFile("f1"), "file-missing");
  });

  it("stores the cover letter PDF with its lead and drops it on back-to-review", async () => {
    const s = store();
    await s.load();
    const pdf = {
      fileId: "c1",
      fileName: "a.pdf",
      size: 1,
      pageCount: 1,
      uploadedAt: "t",
    };
    await s.saveLeadFile(sampleLead({ coverLetterPdf: pdf }), bytes(9));
    expect(await s.readFile("c1")).toEqual(bytes(9));
    await s.saveLeads([sampleLead()]);
    await expectCode(s.readFile("c1"), "file-missing");
  });

  it("deletes a project with its leads and their files", async () => {
    const s = store();
    await s.load();
    await s.saveProject(sampleProject());
    const pdf = {
      fileId: "c1",
      fileName: "a.pdf",
      size: 1,
      pageCount: 1,
      uploadedAt: "t",
    };
    await s.saveLeadFile(sampleLead({ coverLetterPdf: pdf }), bytes(9));
    await s.saveLeads([sampleLead({ id: "other", projectId: "p2" })]);
    await s.deleteProject("p1");
    const snapshot = await s.load();
    expect(snapshot.projects).toEqual([]);
    expect(snapshot.leads.map((lead) => lead.id)).toEqual(["other"]);
    await expectCode(s.readFile("c1"), "file-missing");
  });

  it("deletes an evidence document with its file and writes the affected leads", async () => {
    const s = store();
    await s.load();
    const evidence: DocumentRecord = {
      ...cvDocument("d1", "f1"),
      role: "evidence",
      name: "Zeugnis",
      tags: ["zeugnis"],
    };
    await s.saveDocument(evidence, bytes(1));
    await s.saveDocument(cvDocument("cv", "f2"), bytes(2));
    const withDoc = sampleLead({
      status: "ready",
      packages: [
        {
          id: "pk1",
          fileName: "a.pdf",
          items: [{ kind: "cv" }, { kind: "document", documentId: "d1" }],
        },
      ],
    });
    await s.saveLeads([withDoc]);
    const cleaned = sampleLead({
      status: "ready",
      packages: [{ id: "pk1", fileName: "a.pdf", items: [{ kind: "cv" }] }],
    });
    await s.deleteDocument("d1", [cleaned]);
    const snapshot = await s.load();
    expect(snapshot.documents.map((d) => d.id)).toEqual(["cv"]);
    expect(snapshot.leads[0]?.packages[0]?.items).toEqual([{ kind: "cv" }]);
    await expectCode(s.readFile("f1"), "file-missing");
    expect(await storedFileIds()).toEqual(["f2"]);
  });

  it("deletes the CV PDF and keeps cv package items for a later upload", async () => {
    const s = store();
    await s.load();
    await s.saveDocument(cvDocument("cv", "f2"), bytes(2));
    await s.saveLeads([
      sampleLead({
        status: "ready",
        packages: [{ id: "pk1", fileName: "a.pdf", items: [{ kind: "cv" }] }],
      }),
    ]);
    await s.deleteDocument("cv", []);
    const snapshot = await s.load();
    expect(snapshot.documents).toEqual([]);
    expect(snapshot.leads[0]?.status).toBe("ready");
    expect(snapshot.leads[0]?.packages[0]?.items).toEqual([{ kind: "cv" }]);
    expect(await storedFileIds()).toEqual([]);
  });

  it("leaves everything unchanged when a document delete is refused", async () => {
    const s = store();
    await s.load();
    await s.saveDocument(cvDocument("cv", "f2"), bytes(2));
    await expectCode(
      s.deleteDocument("cv", [sampleLead({ company: { name: "" } })]),
      "record-invalid",
    );
    expect((await s.load()).documents.map((d) => d.id)).toEqual(["cv"]);
    expect(await s.readFile("f2")).toEqual(bytes(2));
  });

  it("blocks writes before a successful load", async () => {
    await expectCode(store().saveProfile(sampleProfile()), "store-blocked");
  });

  it("reports corrupt records as data-invalid and keeps writes blocked", async () => {
    await store().load();
    await rawPut("projects", { id: "broken", title: 42 });
    const s = store();
    await expectCode(s.load(), "data-invalid");
    await expectCode(s.saveProfile(sampleProfile()), "store-blocked");
  });

  it("refuses data from a newer schema version", async () => {
    await store().load();
    await rawPut("meta", { schemaVersion: 99, revision: 0 }, "meta");
    await expectCode(store().load(), "unsupported-version");
  });

  it("maps an open failure to read-failed", async () => {
    const s = createIndexedDbStore({
      channel: noChannel,
      open: () => Promise.reject(new Error("blocked by browser")),
    });
    await expectCode(s.load(), "read-failed");
  });

  it("rejects invalid records before writing", async () => {
    const s = store();
    await s.load();
    await expectCode(
      s.saveProject(sampleProject({ title: "" })),
      "record-invalid",
    );
    expect((await s.load()).projects).toEqual([]);
  });

  it("detects writes from another instance as conflict", async () => {
    const tabA = store();
    const tabB = store();
    await tabA.load();
    await tabB.load();
    await tabA.saveProfile(sampleProfile());
    await expectCode(tabB.saveProject(sampleProject()), "conflict");
    await tabB.load();
    await tabB.saveProject(sampleProject());
    expect((await tabB.load()).projects).toHaveLength(1);
  });

  it("tells other instances about a committed write, not a failed one", async () => {
    const channels: BroadcastChannel[] = [];
    // Both tabs use one channel name, as in the browser.
    const shared = () => {
      const created = new BroadcastChannel("kandidu-test-changes");
      channels.push(created);
      return created;
    };
    const tabA = createIndexedDbStore({ channel: shared });
    const tabB = createIndexedDbStore({ channel: shared });
    try {
      await tabA.load();
      await tabB.load();
      let seen = 0;
      let notify: () => void = () => undefined;
      const unsubscribe = tabB.onExternalChange(() => {
        seen += 1;
        notify();
      });
      const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

      // A transaction that aborts midway is not announced.
      await expectCode(
        tabA.saveDocument({ ...cvDocument("new", "f9"), role: "evidence" }),
        "file-missing",
      );
      await settle();
      expect(seen).toBe(0);

      const changed = new Promise<void>((resolve) => {
        notify = resolve;
      });
      await tabA.saveProject(sampleProject());
      await changed;
      await settle();
      expect(seen).toBe(1);

      unsubscribe();
      await tabA.saveProfile(sampleProfile());
      await settle();
      expect(seen).toBe(1);
    } finally {
      for (const created of channels) created.close();
    }
  });

  it("aborts the whole transaction when a write fails midway", async () => {
    const s = store();
    await s.load();
    await s.saveProfile(sampleProfile());
    // Unknown document without bytes fails inside the transaction.
    await expectCode(
      s.saveDocument({ ...cvDocument("new", "f9"), role: "evidence" }),
      "file-missing",
    );
    const after = await s.load();
    expect(after.documents).toEqual([]);
    expect(after.profile).toEqual(sampleProfile());
    // A failed write must not advance the revision (no false conflict).
    await s.saveProject(sampleProject());
  });

  it("maps a lost connection to save-failed and keeps data", async () => {
    let opened: Awaited<ReturnType<typeof openKandiduDb>> | undefined;
    const s = createIndexedDbStore({
      channel: noChannel,
      open: async (name) => {
        opened = await openKandiduDb(name);
        return opened;
      },
    });
    await s.load();
    await s.saveProfile(sampleProfile());
    opened?.close();
    await expectCode(s.saveProject(sampleProject()), "save-failed");
    expect((await store().load()).projects).toEqual([]);
  });

  it("maps quota errors to quota-exceeded", () => {
    expect(
      writeError(new DOMException("full", "QuotaExceededError"), "save-failed")
        .code,
    ).toBe("quota-exceeded");
    expect(writeError(new Error("other"), "delete-failed").code).toBe(
      "delete-failed",
    );
    expect(writeError(new StoreError("conflict"), "save-failed").code).toBe(
      "conflict",
    );
  });

  it("resets only its own database and unblocks writes after a new load", async () => {
    await store().load();
    await rawPut("projects", { id: "broken" });
    const other = await openDB("unrelated-db", 1, {
      upgrade(db) {
        db.createObjectStore("x");
      },
    });
    await other.put("x", "keep", "k");
    other.close();

    const s = store();
    await expectCode(s.load(), "data-invalid");
    await s.resetAll();
    expect((await s.load()).projects).toEqual([]);
    await s.saveProfile(sampleProfile());

    const check = await openDB("unrelated-db", 1);
    expect(await check.get("x", "k")).toBe("keep");
    check.close();
  });

  it("reports storage estimate and persistence results", async () => {
    const s = createIndexedDbStore({
      channel: noChannel,
      storage: {
        estimate: async () => ({ usage: 10, quota: 100 }),
        persist: async () => false,
        persisted: async () => false,
      },
    });
    expect(await s.storageEstimate()).toEqual({ usage: 10, quota: 100 });
    expect(await s.requestPersistence()).toBe("denied");
    const none = createIndexedDbStore({
      channel: noChannel,
      storage: {} as never,
    });
    expect(await none.requestPersistence()).toBe("unsupported");
  });

  it("reads the persistence state without asking the browser", async () => {
    let asked = 0;
    const withAnswer = (persisted: () => Promise<boolean>) =>
      createIndexedDbStore({
        channel: noChannel,
        storage: {
          estimate: async () => ({ usage: 0, quota: 1 }),
          persist: async () => {
            asked += 1;
            return true;
          },
          persisted,
        },
      });
    expect(await withAnswer(async () => true).persistenceState()).toBe(
      "granted",
    );
    expect(await withAnswer(async () => false).persistenceState()).toBe(
      "denied",
    );
    expect(
      await withAnswer(async () => {
        throw new Error("blocked");
      }).persistenceState(),
    ).toBe("unsupported");
    expect(
      await createIndexedDbStore({
        channel: noChannel,
        storage: {} as never,
      }).persistenceState(),
    ).toBe("unsupported");
    expect(asked).toBe(0);
  });
});

// FR-053: data stored by C1/C2 (database and schema version 1).
describe("IndexedDB migration 1 → 2", () => {
  const v1Records = {
    meta: { schemaVersion: 1, revision: 7 },
    profile: sampleProfile(),
    project: sampleProject(),
    lead: sampleLead(),
    document: cvDocument("cv", "f-cv"),
  };

  /** Creates the version 1 layout exactly as the C1/C2 code did. */
  async function seedV1(records: Partial<typeof v1Records> = v1Records) {
    const db = await openDB(DB_NAME, 1, {
      upgrade(raw) {
        raw.createObjectStore("meta");
        raw.createObjectStore("profile");
        raw.createObjectStore("templates");
        raw.createObjectStore("documents", { keyPath: "id" });
        raw.createObjectStore("projects", { keyPath: "id" });
        const leads = raw.createObjectStore("leads", { keyPath: "id" });
        leads.createIndex("projectId", "projectId");
        raw.createObjectStore("files", { keyPath: "id" });
      },
    });
    const put = (name: string, value: unknown, key?: string) =>
      db.put(name as never, value as never, key as never);
    if (records.meta) await put("meta", records.meta, "meta");
    if (records.profile) await put("profile", records.profile, "profile");
    if (records.project) await put("projects", records.project);
    if (records.lead) await put("leads", records.lead);
    if (records.document) {
      await put("documents", records.document);
      await put("files", { id: "f-cv", bytes: bytes(1, 2, 3).buffer });
    }
    db.close();
  }

  async function rawState() {
    const db = await openDB(DB_NAME);
    const state = {
      version: db.version,
      meta: await db.get("meta" as never, "meta" as never),
      leads: await db.getAll("leads" as never),
      projects: await db.getAll("projects" as never),
    };
    db.close();
    return state;
  }

  it("opens v1 data unchanged and records schema version 2", async () => {
    await seedV1();
    const snapshot = await store().load();
    expect(snapshot.profile).toEqual(v1Records.profile);
    expect(snapshot.projects).toEqual([v1Records.project]);
    expect(snapshot.leads).toEqual([v1Records.lead]);
    expect(snapshot.documents).toEqual([v1Records.document]);
    const raw = await rawState();
    expect(raw.version).toBe(2);
    expect(raw.meta).toEqual({ schemaVersion: 2, revision: 8 });
    expect(raw.projects).toEqual([v1Records.project]);
    expect(raw.leads).toEqual([v1Records.lead]);
  });

  it("keeps working after the upgrade, with the new fields", async () => {
    await seedV1();
    const s = store();
    await s.load();
    await s.saveProject({
      ...v1Records.project,
      position: "Industriekaufmann",
    });
    await s.saveLeads([
      {
        ...v1Records.lead,
        letterPosition: "Kaufmann für Büromanagement",
        originalPostingUrl: "https://karriere.example.org/stelle/1",
        sources: [{ title: "Impressum", url: "https://example.org/impressum" }],
      },
    ]);
    const again = await store().load();
    expect(again.projects[0]?.position).toBe("Industriekaufmann");
    expect(again.leads[0]?.sources).toHaveLength(1);
    expect((await rawState()).meta).toEqual({ schemaVersion: 2, revision: 10 });
  });

  it("upgrades an empty v1 database", async () => {
    await seedV1({});
    expect((await store().load()).projects).toEqual([]);
    const raw = await rawState();
    expect(raw.version).toBe(2);
    expect(raw.meta).toBeUndefined();
  });

  it("reports a damaged v1 record and rewrites no record", async () => {
    const broken = { id: "broken", title: 42 };
    await seedV1({ ...v1Records, project: broken as never });
    const s = store();
    await expectCode(s.load(), "data-invalid");
    await expectCode(s.saveProfile(sampleProfile()), "store-blocked");
    expect((await rawState()).projects).toEqual([broken]);
  });

  it("leaves version 1 untouched when the upgrade fails", async () => {
    await seedV1();
    const proto = globalThis.IDBObjectStore.prototype;
    const original = proto.put;
    proto.put = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    try {
      await expectCode(store().load(), "read-failed");
    } finally {
      proto.put = original;
    }
    const raw = await rawState();
    expect(raw.version).toBe(1);
    expect(raw.meta).toEqual(v1Records.meta);
    // The next start migrates normally.
    expect((await store().load()).leads).toEqual([v1Records.lead]);
    expect((await rawState()).version).toBe(2);
  });

  it("tells a tab of the old version to reload after the upgrade", async () => {
    await seedV1();
    const oldTab = new BroadcastChannel("kandidu-test-migration");
    const newTab = new BroadcastChannel("kandidu-test-migration");
    try {
      const heard = new Promise<unknown>((resolve) => {
        oldTab.addEventListener("message", (event) => resolve(event.data), {
          once: true,
        });
      });
      await createIndexedDbStore({ channel: () => newTab }).load();
      expect(await heard).toEqual({ migrated: 2 });
    } finally {
      oldTab.close();
      newTab.close();
    }
  });

  it("does not announce opening a database that needs no upgrade", async () => {
    await store().load();
    const listener = new BroadcastChannel("kandidu-test-no-migration");
    const sender = new BroadcastChannel("kandidu-test-no-migration");
    try {
      let seen = 0;
      listener.addEventListener("message", () => {
        seen += 1;
      });
      await createIndexedDbStore({ channel: () => sender }).load();
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(seen).toBe(0);
    } finally {
      listener.close();
      sender.close();
    }
  });

  it("refuses a database upgraded by a newer Kandidu version", async () => {
    const future = await openDB(DB_NAME, 3, {
      upgrade(raw) {
        raw.createObjectStore("meta");
      },
    });
    future.close();
    await expectCode(store().load(), "unsupported-version");
  });

  it("opens the current layout through openKandiduDb without migrating", async () => {
    let migratedFrom: number | undefined;
    const db = await openKandiduDb(DB_NAME, (from) => {
      migratedFrom = from;
    });
    expect(db.version).toBe(2);
    db.close();
    expect(migratedFrom).toBeUndefined();
  });
});
