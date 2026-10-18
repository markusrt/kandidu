import { useId, useState } from "react";
import { findCvDocument } from "../../domain/documents";
import { datedName, withExtension } from "../../domain/fileNames";
import type { Lead, PackageDef, PackageItem } from "../../domain/lead";
import {
  defaultPackage,
  effectivePackages,
  itemKey,
  moveItem,
  setPackages,
} from "../../domain/packages";
import { ZIP_MIME } from "../../files/mime";
import { StoreError } from "../../storage/port";
import { downloadBytes } from "../download";
import { loadPdf, loadZip } from "../files";
import { type Messages, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp, useSnapshot, useTask } from "../state";
import { newId, nowIso, todayIso } from "../time";

function itemLabel(
  item: PackageItem,
  m: Messages,
  documentName: (id: string) => string,
): string {
  if (item.kind === "coverLetter") return m.package.items.coverLetter;
  if (item.kind === "cv") return m.package.items.cv;
  return m.package.items.document(documentName(item.documentId));
}

export function PackageStep({ lead }: { lead: Lead }) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy, store, announce } = useApp();
  const { running, run } = useTask();
  const nameId = useId();
  const words = m.letter.fileWords;
  const [definition, setDefinition] = useState<PackageDef>(
    () =>
      effectivePackages(lead, () =>
        defaultPackage(
          newId(),
          datedName(todayIso(), [lead.company.name, words.application], "pdf"),
        ),
      )[0] as PackageDef,
  );
  const cv = findCvDocument(snapshot.documents);
  const documentName = (id: string) =>
    snapshot.documents.find((d) => d.id === id)?.name ?? id;

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

  async function saveDefinition(def: PackageDef, success?: string) {
    const next = setPackages(lead, [def], nowIso());
    return commit(
      (s) => s.saveLeads([next]),
      (s) => ({
        ...s,
        leads: s.leads.map((l) => (l.id === next.id ? next : l)),
      }),
      success,
    );
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
    const def = {
      ...definition,
      fileName: withExtension(definition.fileName, "pdf"),
    };
    // Show the name that will actually be used.
    setDefinition(def);
    if (!(await saveDefinition(def))) return;
    announce(m.package.building);
    const result = await run(async () => {
      const sources = def.items.map(sourceOf);
      const parts = [];
      for (const source of sources)
        parts.push(await store.readFile(source.fileId));
      const [{ mergePdfs }, { zipFiles }] = await Promise.all([
        loadPdf(),
        loadZip(),
      ]);
      const merged = await mergePdfs(parts);
      const pageCount = sources.reduce((sum, s) => sum + s.pageCount, 0);
      const zip = zipFiles([
        { name: def.fileName, bytes: merged, compress: false },
      ]);
      downloadBytes(
        zip,
        datedName(todayIso(), [lead.company.name, words.application], "zip"),
        ZIP_MIME,
      );
      return pageCount;
    });
    if (result !== undefined) {
      announce(m.package.built(def.fileName, m.format.pages(result)));
    }
  }

  const needsCv = definition.items.some((item) => item.kind === "cv");
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
      <section className="card">
        <div className="field">
          <label htmlFor={nameId}>{m.package.fileNameLabel}</label>
          <input
            id={nameId}
            value={definition.fileName}
            maxLength={200}
            onChange={(event) =>
              setDefinition({ ...definition, fileName: event.target.value })
            }
          />
        </div>
        <h2>{m.package.itemsLabel}</h2>
        <ol className="item-list package-items">
          {definition.items.map((item, index) => {
            const label = itemLabel(item, m, documentName);
            return (
              <li key={itemKey(item)}>
                <span>{label}</span>
                <span className="actions compact">
                  <button
                    type="button"
                    className="secondary small"
                    aria-label={m.package.moveUp(label)}
                    disabled={index === 0}
                    onClick={() =>
                      setDefinition(moveItem(definition, index, -1))
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="secondary small"
                    aria-label={m.package.moveDown(label)}
                    disabled={index === definition.items.length - 1}
                    onClick={() =>
                      setDefinition(moveItem(definition, index, 1))
                    }
                  >
                    ↓
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="actions">
          <button
            type="button"
            disabled={busy || running || (needsCv && !cv)}
            onClick={() => void build()}
          >
            {running ? m.package.building : m.package.download}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy || running}
            onClick={() =>
              void saveDefinition(
                {
                  ...definition,
                  fileName: withExtension(definition.fileName, "pdf"),
                },
                m.common.saved,
              )
            }
          >
            {m.package.saveDefinition}
          </button>
        </div>
      </section>
    </>
  );
}
