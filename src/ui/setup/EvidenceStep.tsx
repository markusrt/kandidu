import { useEffect, useId, useRef, useState } from "react";
import { DOCUMENT_NAME_MAX, type DocumentRecord } from "../../domain/documents";
import { documentUsage, withoutDocument } from "../../domain/packages";
import { tagsInUse } from "../../domain/tags";
import { MAX_PDF_BYTES } from "../../files/errors";
import { FileField } from "../FileField";
import { loadPdf, readPicked } from "../files";
import { focusOnMount } from "../focus";
import { useMessages } from "../i18n";
import { useApp, useSnapshot, useTask } from "../state";
import { newId, nowIso } from "../time";
import { TagInput, withPendingTag } from "./TagInput";

const validName = (name: string) =>
  name.trim().length >= 1 && name.trim().length <= DOCUMENT_NAME_MAX;

const withoutPdfExtension = (fileName: string) =>
  fileName.replace(/\.pdf$/iu, "");

export function EvidenceStep() {
  const m = useMessages();
  return (
    <>
      <h1>{m.evidence.heading}</h1>
      <p>{m.evidence.intro}</p>
      <UploadForm />
      <EvidenceList />
    </>
  );
}

function UploadForm() {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy, fail } = useApp();
  const { running, run } = useTask();
  const nameId = useId();
  const [file, setFile] = useState<File>();
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [pendingTag, setPendingTag] = useState("");
  // Remounts the tag input after an upload, which clears its text.
  const [round, setRound] = useState(0);

  async function submit() {
    if (!file || !validName(name)) return;
    let allTags: string[];
    try {
      allTags = withPendingTag(tags, pendingTag);
    } catch (cause) {
      fail(cause);
      return;
    }
    const checked = await run(async () => {
      const bytes = await readPicked(file, MAX_PDF_BYTES);
      const { inspectPdf } = await loadPdf();
      return { bytes, info: await inspectPdf(bytes) };
    });
    if (!checked) return;
    const record: DocumentRecord = {
      id: newId(),
      role: "evidence",
      name: name.trim(),
      fileName: file.name.slice(0, 200) || `${name.trim()}.pdf`,
      tags: allTags,
      fileId: newId(),
      size: checked.bytes.byteLength,
      pageCount: checked.info.pageCount,
      uploadedAt: nowIso(),
    };
    const ok = await commit(
      (s) => s.saveDocument(record, checked.bytes),
      (s) => ({ ...s, documents: [...s.documents, record] }),
      m.evidence.uploaded,
    );
    if (ok) {
      setFile(undefined);
      setName("");
      setTags([]);
      setPendingTag("");
      setRound((n) => n + 1);
    }
  }

  return (
    <section className="card" aria-labelledby={`${nameId}-heading`}>
      <h2 id={`${nameId}-heading`}>{m.evidence.uploadHeading}</h2>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FileField
          label={m.evidence.fileLabel}
          hint={m.fileLimits.pdf}
          accept=".pdf,application/pdf"
          disabled={busy || running}
          onFile={(picked) => {
            setFile(picked);
            setName(
              withoutPdfExtension(picked.name).slice(0, DOCUMENT_NAME_MAX),
            );
          }}
        />
        {file && <p className="hint">{m.evidence.picked(file.name)}</p>}
        <div className="field">
          <label htmlFor={nameId}>{m.evidence.nameLabel}</label>
          <input
            id={nameId}
            value={name}
            maxLength={DOCUMENT_NAME_MAX}
            aria-describedby={`${nameId}-hint`}
            onChange={(event) => setName(event.target.value)}
          />
          <p id={`${nameId}-hint`} className="hint">
            {m.evidence.nameHint(DOCUMENT_NAME_MAX)}
          </p>
        </div>
        <TagInput
          key={round}
          value={tags}
          inUse={tagsInUse(snapshot.documents)}
          onChange={setTags}
          onPendingChange={setPendingTag}
        />
        <button
          type="submit"
          disabled={busy || running || !file || !validName(name)}
        >
          {m.evidence.upload}
        </button>
      </form>
    </section>
  );
}

function EvidenceList() {
  const m = useMessages();
  const snapshot = useSnapshot();
  const filterId = useId();
  const [filter, setFilter] = useState("");
  const listHeading = useRef<HTMLHeadingElement>(null);
  const evidence = snapshot.documents
    .filter((d) => d.role === "evidence")
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const inUse = tagsInUse(evidence);
  const activeFilter = inUse.includes(filter) ? filter : "";
  const shown = activeFilter
    ? evidence.filter((d) => d.tags.includes(activeFilter))
    : evidence;

  return (
    <section className="card" aria-labelledby={`${filterId}-heading`}>
      <h2 id={`${filterId}-heading`} ref={listHeading} tabIndex={-1}>
        {m.evidence.listHeading}
      </h2>
      {evidence.length === 0 ? (
        <p>{m.evidence.none}</p>
      ) : (
        <>
          <div className="field">
            <label htmlFor={filterId}>{m.evidence.filterLabel}</label>
            <select
              id={filterId}
              value={activeFilter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">{m.evidence.filterAll}</option>
              {inUse.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          {shown.length === 0 ? (
            <p>{m.evidence.filterEmpty}</p>
          ) : (
            <ul className="document-list">
              {shown.map((document) => (
                <EvidenceItem
                  key={document.id}
                  document={document}
                  onDeleted={() => listHeading.current?.focus()}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function EvidenceItem({
  document,
  onDeleted,
}: {
  document: DocumentRecord;
  onDeleted: () => void;
}) {
  const m = useMessages();
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const editButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  // Back in view mode, focus returns to the button that left it.
  const returnTo = useRef<"edit" | "delete">(undefined);

  useEffect(() => {
    if (mode !== "view" || !returnTo.current) return;
    (returnTo.current === "edit" ? editButton : deleteButton).current?.focus();
    returnTo.current = undefined;
  }, [mode]);

  function open(next: "edit" | "delete") {
    returnTo.current = next;
    setMode(next);
  }

  return (
    <li>
      {mode === "edit" ? (
        <EditForm document={document} onDone={() => setMode("view")} />
      ) : (
        <>
          <h3>{document.name}</h3>
          <p>
            {document.tags.length === 0
              ? m.evidence.noTags
              : m.evidence.tagsLine(document.tags)}
          </p>
          <p className="hint">
            {m.evidence.meta(
              m.format.pages(document.pageCount),
              m.format.bytes(document.size),
              m.format.timestamp(document.uploadedAt),
            )}
          </p>
          {mode === "delete" ? (
            <DeleteConfirm
              document={document}
              onDone={() => setMode("view")}
              onDeleted={onDeleted}
            />
          ) : (
            <div className="actions">
              <button
                type="button"
                className="secondary"
                ref={editButton}
                onClick={() => open("edit")}
              >
                {m.evidence.edit}
              </button>
              <button
                type="button"
                className="secondary"
                ref={deleteButton}
                onClick={() => open("delete")}
              >
                {m.evidence.delete}
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

function EditForm({
  document,
  onDone,
}: {
  document: DocumentRecord;
  onDone: () => void;
}) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy, fail } = useApp();
  const nameId = useId();
  const [name, setName] = useState(document.name);
  const [tags, setTags] = useState<string[]>([...document.tags]);
  const [pendingTag, setPendingTag] = useState("");

  async function save() {
    if (!validName(name)) return;
    let allTags: string[];
    try {
      allTags = withPendingTag(tags, pendingTag);
    } catch (cause) {
      fail(cause);
      return;
    }
    const record: DocumentRecord = {
      ...document,
      name: name.trim(),
      tags: allTags,
    };
    const ok = await commit(
      (s) => s.saveDocument(record),
      (s) => ({
        ...s,
        documents: s.documents.map((d) => (d.id === record.id ? record : d)),
      }),
      m.evidence.saved,
    );
    if (ok) onDone();
  }

  return (
    <form
      className="inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h3>{m.evidence.editHeading(document.name)}</h3>
      <div className="field">
        <label htmlFor={nameId}>{m.evidence.nameLabel}</label>
        <input
          id={nameId}
          value={name}
          maxLength={DOCUMENT_NAME_MAX}
          aria-describedby={`${nameId}-hint`}
          onChange={(event) => setName(event.target.value)}
        />
        <p id={`${nameId}-hint`} className="hint">
          {m.evidence.nameHint(DOCUMENT_NAME_MAX)}
        </p>
      </div>
      <TagInput
        value={tags}
        inUse={tagsInUse(snapshot.documents)}
        onChange={setTags}
        onPendingChange={setPendingTag}
      />
      <div className="actions">
        <button type="submit" disabled={busy || !validName(name)}>
          {m.evidence.save}
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          {m.evidence.cancel}
        </button>
      </div>
    </form>
  );
}

function DeleteConfirm({
  document,
  onDone,
  onDeleted,
}: {
  document: DocumentRecord;
  onDone: () => void;
  /** The item is gone afterwards; the list moves focus. */
  onDeleted: () => void;
}) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy } = useApp();
  const usage = documentUsage(snapshot.leads, document.id);

  async function remove() {
    const now = nowIso();
    const affected = usage.map((u) =>
      withoutDocument(u.lead, document.id, now),
    );
    const ok = await commit(
      (s) => s.deleteDocument(document.id, affected),
      (s) => ({
        ...s,
        leads: s.leads.map(
          (lead) => affected.find((a) => a.id === lead.id) ?? lead,
        ),
        documents: s.documents.filter((d) => d.id !== document.id),
      }),
      m.evidence.deleted,
    );
    if (ok) onDeleted();
  }

  return (
    <div className="confirm">
      <p>{m.evidence.deleteHeading(document.name)}</p>
      {usage.length === 0 ? (
        <p>{m.evidence.notUsed}</p>
      ) : (
        <>
          <p>{m.evidence.usedIn}</p>
          <ul>
            {usage.map((u) => (
              <li key={u.lead.id}>
                {m.evidence.usageItem(
                  u.lead.company.name,
                  u.packages.map((p) => p.fileName).join(", "),
                )}
              </li>
            ))}
          </ul>
          <p className="warning">{m.evidence.deleteWarning}</p>
        </>
      )}
      <div className="actions">
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={() => void remove()}
        >
          {m.evidence.confirmDelete}
        </button>
        <button
          type="button"
          className="secondary"
          // The button that opened this confirmation is gone now.
          ref={focusOnMount}
          onClick={onDone}
        >
          {m.evidence.cancel}
        </button>
      </div>
    </div>
  );
}
