import { useId, useState } from "react";
import { findCvDocument } from "../../domain/documents";
import { datedName, withExtension } from "../../domain/fileNames";
import type { Lead, PackageDef, PackageItem } from "../../domain/lead";
import {
  defaultPackage,
  effectivePackages,
  type PackagePreset,
  presetPackage,
  setPackages,
} from "../../domain/packages";
import { ZIP_MIME } from "../../files/mime";
import { StoreError } from "../../storage/port";
import { downloadBytes } from "../download";
import { loadPdf, loadZip } from "../files";
import { useMessages } from "../i18n";
import { Link } from "../router";
import { useApp, useSnapshot, useTask } from "../state";
import { newId, nowIso, todayIso } from "../time";
import { useUnsavedGuard } from "../unsaved";
import { PackageEditor } from "./PackageEditor";

const PRESETS: readonly PackagePreset[] = [
  "coverLetterAndCv",
  "evidence",
  "all",
];

export function PackageStep({ lead }: { lead: Lead }) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy, store, announce, fail } = useApp();
  const { running, run } = useTask();
  const presetId = useId();
  const words = m.letter.fileWords;
  const [initial] = useState<readonly PackageDef[]>(() =>
    effectivePackages(lead, () =>
      defaultPackage(
        newId(),
        datedName(todayIso(), [lead.company.name, words.application], "pdf"),
      ),
    ),
  );
  const [definitions, setDefinitions] = useState(initial);
  const [preset, setPreset] = useState<PackagePreset>("coverLetterAndCv");
  // Added, removed or renamed packages only persist on save or download.
  const dirty =
    lead.status !== "review" &&
    JSON.stringify(definitions) !==
      JSON.stringify(lead.packages.length > 0 ? lead.packages : initial);
  useUnsavedGuard(dirty, m.common.unsavedConfirm);
  const cv = findCvDocument(snapshot.documents);
  const evidenceIds = snapshot.documents
    .filter((d) => d.role === "evidence")
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .map((d) => d.id);

  if (lead.status === "review") {
    return (
      <>
        <h1>{m.package.heading}</h1>
        <p>{m.package.notReleased}</p>
        <Link
          to={{
            name: "lead",
            projectId: lead.projectId,
            leadId: lead.id,
            step: "freigabe",
          }}
        >
          {m.package.toGate}
        </Link>
      </>
    );
  }

  /** Saves all package definitions; names become safe and unique (FR-031). */
  async function saveDefinitions(
    defs: readonly PackageDef[],
    success?: string,
  ): Promise<Lead | undefined> {
    const normalized = defs.map((def) => ({
      ...def,
      fileName: withExtension(def.fileName, "pdf"),
    }));
    let next: Lead;
    try {
      next = setPackages(lead, normalized, nowIso());
    } catch (cause) {
      fail(cause);
      return undefined;
    }
    // Show the names that will actually be used.
    setDefinitions(next.packages);
    const ok = await commit(
      (s) => s.saveLeads([next]),
      (s) => ({
        ...s,
        leads: s.leads.map((l) => (l.id === next.id ? next : l)),
      }),
      success,
    );
    return ok ? next : undefined;
  }

  function sourceOf(item: PackageItem): { fileId: string; pageCount: number } {
    const source =
      item.kind === "coverLetter"
        ? lead.coverLetterPdf
        : item.kind === "cv"
          ? cv
          : snapshot.documents.find((d) => d.id === item.documentId);
    if (!source) throw new StoreError("file-missing");
    return source;
  }

  async function build() {
    const saved = await saveDefinitions(definitions);
    if (!saved) return;
    announce(m.package.building);
    const result = await run(async () => {
      const [{ mergePdfs }, { zipFiles }] = await Promise.all([
        loadPdf(),
        loadZip(),
      ]);
      const entries = [];
      let pageCount = 0;
      for (const def of saved.packages) {
        const sources = def.items.map(sourceOf);
        const parts = [];
        for (const source of sources) {
          parts.push(await store.readFile(source.fileId));
        }
        entries.push({
          name: def.fileName,
          bytes: await mergePdfs(parts),
          compress: false,
        });
        pageCount += sources.reduce((sum, s) => sum + s.pageCount, 0);
      }
      downloadBytes(
        zipFiles(entries),
        datedName(todayIso(), [lead.company.name, words.application], "zip"),
        ZIP_MIME,
      );
      return { pageCount, names: entries.map((e) => e.name) };
    });
    if (result) {
      announce(
        result.names.length === 1
          ? m.package.built(
              result.names[0] ?? "",
              m.format.pages(result.pageCount),
            )
          : m.package.builtMany(
              result.names.length,
              m.format.pages(result.pageCount),
            ),
      );
    }
  }

  function addPackage() {
    const def = presetPackage(
      preset,
      newId(),
      todayIso(),
      lead.company.name,
      words,
      evidenceIds,
    );
    // The button is disabled when the preset would be empty.
    if (!def) return;
    setDefinitions([...definitions, def]);
    announce(m.package.packageAdded(definitions.length + 1));
  }

  function removePackage(id: string) {
    const index = definitions.findIndex((d) => d.id === id);
    setDefinitions(definitions.filter((d) => d.id !== id));
    announce(m.package.packageRemoved(index + 1));
  }

  const update = (next: PackageDef) =>
    setDefinitions(definitions.map((d) => (d.id === next.id ? next : d)));
  const items = definitions.flatMap((def) => def.items);
  const needsCv = items.some((item) => item.kind === "cv");
  const documentMissing = items.some(
    (item) =>
      item.kind === "document" &&
      !snapshot.documents.some((d) => d.id === item.documentId),
  );
  const presetAvailable = preset !== "evidence" || evidenceIds.length > 0;

  return (
    <>
      <h1>{m.package.heading}</h1>
      <p>{m.package.intro}</p>
      {needsCv && !cv && (
        <p className="warning">
          {m.package.cvMissing}{" "}
          <Link to={{ name: "setup", step: "lebenslauf" }}>
            {m.package.toCv}
          </Link>
        </p>
      )}
      {definitions.map((def, index) => (
        <section
          key={def.id}
          className="card"
          aria-labelledby={`package-${def.id}`}
        >
          <h2 id={`package-${def.id}`}>
            {m.package.packageHeading(index + 1)}
          </h2>
          <PackageEditor
            definition={def}
            onChange={update}
            documents={snapshot.documents}
            disabled={busy || running}
          />
          {definitions.length > 1 && (
            <div className="actions">
              <button
                type="button"
                className="secondary"
                disabled={busy || running}
                onClick={() => removePackage(def.id)}
              >
                {m.package.removePackage(index + 1)}
              </button>
            </div>
          )}
        </section>
      ))}
      <section className="card" aria-labelledby="package-add">
        <h2 id="package-add">{m.package.addPackageHeading}</h2>
        <p className="hint">{m.package.addPackageHint}</p>
        <div className="inline-form">
          <div className="field">
            <label htmlFor={presetId}>{m.package.presetLabel}</label>
            <select
              id={presetId}
              value={preset}
              onChange={(event) =>
                setPreset(event.target.value as PackagePreset)
              }
            >
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {m.package.presets[p]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="secondary"
            disabled={busy || running || !presetAvailable}
            onClick={addPackage}
          >
            {m.package.addPackage}
          </button>
        </div>
        {!presetAvailable && <p className="hint">{m.package.noEvidence}</p>}
      </section>
      <div className="actions">
        <button
          type="button"
          disabled={busy || running || (needsCv && !cv) || documentMissing}
          onClick={() => void build()}
        >
          {running ? m.package.building : m.package.download}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy || running}
          onClick={() => void saveDefinitions(definitions, m.common.saved)}
        >
          {m.package.saveDefinition}
        </button>
        {dirty && <span className="hint">{m.common.unsaved}</span>}
      </div>
    </>
  );
}
