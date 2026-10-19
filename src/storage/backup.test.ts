import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import type { DocumentRecord, TemplateRecord } from "../domain/documents";
import { sampleLead, sampleProfile, sampleProject } from "../domain/testing";
import { unzipFiles, zipFiles } from "../files/zip";
import { BACKUP_JSON, BACKUP_README, parseBackup } from "./backup";
import { createIndexedDbStore, DB_NAME } from "./indexeddb";
import { StoreError, type StoreErrorCode } from "./port";

const README = "Diese Datei enthält persönliche Daten.";
const noChannel = () => undefined;

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const store = () => createIndexedDbStore({ channel: noChannel });
const bytes = (...values: number[]) => new Uint8Array(values);

const template: TemplateRecord = {
  kind: "cv",
  fileName: "lebenslauf.docx",
  fileId: "t1",
  size: 3,
  uploadedAt: "2026-10-18T10:00:00.000Z",
  tags: ["Name"],
};
const cv: DocumentRecord = {
  id: "cv",
  role: "cv",
  name: "Lebenslauf",
  fileName: "cv.pdf",
  tags: [],
  fileId: "f-cv",
  size: 4,
  pageCount: 2,
  uploadedAt: "2026-10-18T10:00:00.000Z",
};
const evidence: DocumentRecord = {
  ...cv,
  id: "d1",
  role: "evidence",
  name: "Zeugnis",
  fileName: "zeugnis.pdf",
  tags: ["zeugnis"],
  fileId: "f-d1",
  size: 2,
};
const coverLetterPdf = {
  fileId: "f-cl",
  fileName: "anschreiben.pdf",
  size: 1,
  pageCount: 1,
  uploadedAt: "2026-10-18T10:00:00.000Z",
};

/** A store with every kind of record and file. */
async function filledStore() {
  const s = store();
  await s.load();
  await s.saveProfile(sampleProfile());
  await s.saveTemplate(template, bytes(1, 2, 3));
  await s.saveDocument(cv, bytes(4, 5, 6, 7));
  await s.saveDocument(evidence, bytes(8, 9));
  await s.saveProject(sampleProject());
  await s.saveLeadFile(
    sampleLead({
      coverLetterPdf,
      status: "ready",
      packages: [
        {
          id: "pk",
          fileName: "a.pdf",
          items: [{ kind: "cv" }, { kind: "document", documentId: "d1" }],
        },
      ],
    }),
    bytes(10),
  );
  return s;
}

async function expectCode(promise: Promise<unknown>, code: StoreErrorCode) {
  const error = await promise.then(
    () => undefined,
    (cause: unknown) => cause,
  );
  expect(error).toBeInstanceOf(StoreError);
  expect((error as StoreError).code).toBe(code);
}

/** Rewrites one entry of a backup ZIP. */
function patch(
  zip: Uint8Array,
  change: (entries: Map<string, Uint8Array>) => void,
): Uint8Array {
  const entries = unzipFiles(zip);
  change(entries);
  return zipFiles(
    [...entries].map(([name, data]) => ({ name, bytes: data, compress: true })),
  );
}

/** The parts of kandidu-backup.json the tests damage. */
interface BackupJson {
  format: string;
  formatVersion: number;
  schemaVersion: number;
  data: { projects: { title: string }[] };
}

function patchJson(
  zip: Uint8Array,
  change: (json: BackupJson) => void,
): Uint8Array {
  return patch(zip, (entries) => {
    const json = JSON.parse(new TextDecoder().decode(entries.get(BACKUP_JSON)));
    change(json);
    entries.set(BACKUP_JSON, new TextEncoder().encode(JSON.stringify(json)));
  });
}

describe("backup", () => {
  it("round-trips all data and files bit-identically into an empty store", async () => {
    const source = await filledStore();
    const before = await source.load();
    const zip = await source.exportBackup(README);
    const entries = unzipFiles(zip);
    expect(new TextDecoder().decode(entries.get(BACKUP_README))).toBe(README);

    globalThis.indexedDB = new IDBFactory();
    const target = store();
    await target.load();
    const imported = await target.importBackup(zip);
    expect(imported).toEqual(before);
    expect(await target.load()).toEqual(before);
    expect(await target.readFile("t1")).toEqual(bytes(1, 2, 3));
    expect(await target.readFile("f-cv")).toEqual(bytes(4, 5, 6, 7));
    expect(await target.readFile("f-d1")).toEqual(bytes(8, 9));
    expect(await target.readFile("f-cl")).toEqual(bytes(10));
    // Writes keep working after the import (no false conflict).
    await target.saveProject(sampleProject({ id: "p2" }));
  });

  it("replaces existing data completely", async () => {
    const zip = await (await filledStore()).exportBackup(README);
    globalThis.indexedDB = new IDBFactory();
    const other = store();
    await other.load();
    await other.saveProject(sampleProject({ id: "old", title: "Alt" }));
    await other.saveDocument(
      { ...evidence, id: "old-doc", fileId: "f-old" },
      bytes(1),
    );
    await other.importBackup(zip);
    const snapshot = await other.load();
    expect(snapshot.projects.map((p) => p.id)).toEqual(["p1"]);
    expect(snapshot.documents.map((d) => d.id).sort()).toEqual(["cv", "d1"]);
    await expectCode(other.readFile("f-old"), "file-missing");
  });

  it("imports from the recovery state without a successful load", async () => {
    const zip = await (await filledStore()).exportBackup(README);
    globalThis.indexedDB = new IDBFactory();
    const fresh = store();
    // No load(): writes are blocked, but a confirmed import is allowed.
    await expectCode(fresh.saveProfile(sampleProfile()), "store-blocked");
    await fresh.importBackup(zip);
    await fresh.saveProfile(sampleProfile());
  });

  it.each<[string, (zip: Uint8Array) => Uint8Array, StoreErrorCode]>([
    [
      "a missing file",
      (zip) => patch(zip, (e) => e.delete("files/f-cv")),
      "backup-invalid",
    ],
    [
      "a hash mismatch",
      (zip) => patch(zip, (e) => e.set("files/f-cv", bytes(9, 9, 9, 9))),
      "backup-invalid",
    ],
    [
      "a size mismatch",
      (zip) => patch(zip, (e) => e.set("files/f-cv", bytes(1))),
      "backup-invalid",
    ],
    [
      "a newer schema version",
      (zip) => patchJson(zip, (json) => (json.schemaVersion = 99)),
      "unsupported-version",
    ],
    [
      "a newer format version",
      (zip) => patchJson(zip, (json) => (json.formatVersion = 2)),
      "unsupported-version",
    ],
    [
      "corrupt JSON",
      (zip) =>
        patch(zip, (e) =>
          e.set(BACKUP_JSON, new TextEncoder().encode("{ kaputt")),
        ),
      "backup-invalid",
    ],
    [
      "a missing manifest",
      (zip) => patch(zip, (e) => e.delete(BACKUP_JSON)),
      "backup-invalid",
    ],
    [
      "an invalid record",
      (zip) =>
        patchJson(zip, (json) => {
          for (const project of json.data.projects) project.title = "";
        }),
      "backup-invalid",
    ],
    [
      "duplicate ids",
      (zip) =>
        patchJson(zip, (json) => {
          json.data.projects.push(...json.data.projects);
        }),
      "backup-invalid",
    ],
    [
      "another file format",
      (zip) => patchJson(zip, (json) => (json.format = "other")),
      "backup-invalid",
    ],
    [
      "no ZIP at all",
      () => new TextEncoder().encode("hallo"),
      "backup-invalid",
    ],
  ])(
    "rejects %s and leaves current data untouched",
    async (_, damage, code) => {
      const zip = await (await filledStore()).exportBackup(README);
      globalThis.indexedDB = new IDBFactory();
      const current = store();
      await current.load();
      await current.saveProject(sampleProject({ id: "keep" }));
      await expectCode(current.importBackup(damage(zip)), code);
      expect((await current.load()).projects.map((p) => p.id)).toEqual([
        "keep",
      ]);
      await expectCode(parseBackup(damage(zip)), code);
    },
  );

  it("does not move the known revision when exporting", async () => {
    const tabA = await filledStore();
    const tabB = store();
    await tabB.load();
    await tabA.saveProject(sampleProject({ id: "p9" }));
    // tabB is stale; exporting must not hide that.
    await tabB.exportBackup(README);
    await expectCode(tabB.saveProject(sampleProject()), "conflict");
  });
});

// FR-054: backups written by C1/C2 (schema version 1) stay importable.
describe("backup versions", () => {
  const v1Json = Object.values(
    import.meta.glob("./fixtures/backup-v1.json", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>,
  )[0];
  if (v1Json === undefined) throw new Error("missing fixture backup-v1.json");
  const v1 = JSON.parse(v1Json);

  /** The synthetic v1 backup as the C2 code exported it. */
  const v1Zip = () =>
    zipFiles([
      {
        name: BACKUP_JSON,
        bytes: new TextEncoder().encode(v1Json),
        compress: true,
      },
      {
        name: BACKUP_README,
        bytes: new TextEncoder().encode(README),
        compress: true,
      },
      { name: "files/f-cv", bytes: bytes(1, 2, 3), compress: false },
    ]);

  const manifestOf = (zip: Uint8Array) =>
    JSON.parse(new TextDecoder().decode(unzipFiles(zip).get(BACKUP_JSON)));

  it("imports a v1 backup and stores it as the current version", async () => {
    const target = store();
    await target.load();
    const imported = await target.importBackup(v1Zip());
    expect(imported.projects).toEqual(v1.data.projects);
    expect(imported.leads).toEqual(v1.data.leads);
    expect(imported.profile).toEqual(v1.data.profile);
    expect(await target.readFile("f-cv")).toEqual(bytes(1, 2, 3));
    const raw = await openDB(DB_NAME);
    expect(await raw.get("meta" as never, "meta" as never)).toMatchObject({
      schemaVersion: 2,
    });
    raw.close();
    // A new export of the imported data carries the current version.
    const again = await target.exportBackup(README);
    expect(manifestOf(again)).toMatchObject({
      formatVersion: 1,
      schemaVersion: 2,
    });
    expect(manifestOf(again).data.leads).toEqual(v1.data.leads);
    await target.saveProject({ ...v1.data.projects[0], position: "Kaufmann" });
  });

  it("round-trips the v2 fields bit-identically", async () => {
    const source = store();
    await source.load();
    await source.saveProject(sampleProject({ position: "Industriekaufmann" }));
    await source.saveLeads([
      sampleLead({
        letterPosition: "Kaufmann für Büromanagement",
        originalPostingUrl: "https://karriere.example.org/stelle/1",
        sources: [
          { title: "Impressum", url: "https://example.org/impressum" },
          { url: "https://example.org/karriere" },
        ],
      }),
    ]);
    const before = await source.load();
    const zip = await source.exportBackup(README);
    expect(manifestOf(zip).schemaVersion).toBe(2);

    globalThis.indexedDB = new IDBFactory();
    const target = store();
    await target.load();
    await target.importBackup(zip);
    expect(await target.load()).toEqual(before);
  });

  it("refuses a backup of a newer data version and changes nothing", async () => {
    const newer = patchJson(v1Zip(), (json) => (json.schemaVersion = 3));
    const current = store();
    await current.load();
    await current.saveProject(sampleProject({ id: "keep" }));
    await expectCode(current.importBackup(newer), "unsupported-version");
    expect((await current.load()).projects.map((p) => p.id)).toEqual(["keep"]);
  });

  it("rejects v2 fields that break the limits, also in a v1 backup", async () => {
    const broken = patchJson(v1Zip(), (json) => {
      Object.assign(json.data.projects[0] ?? {}, { position: "" });
    });
    await expectCode(parseBackup(broken), "backup-invalid");
  });
});
