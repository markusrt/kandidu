import { useRef, useState } from "react";
import { TEMPLATE_KINDS, type TemplateKind } from "../../domain/documents";
import type { TemplateIssue } from "../../domain/placeholders";
import { MAX_DOCX_BYTES } from "../../files/errors";
import { DOCX_MIME } from "../../files/mime";
import { downloadBytes } from "../download";
import { FileField } from "../FileField";
import { loadDemo, loadDocx, readPicked } from "../files";
import { focusOnMount } from "../focus";
import { type Messages, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp, useSnapshot, useTask } from "../state";
import { newId, nowIso } from "../time";

export function issueText(issue: TemplateIssue, m: Messages): string {
  const tag = issue.tag ?? issue.context ?? m.templates.issueUnknownTag;
  return m.templates.issue[issue.code](tag);
}

export function TemplatesStep() {
  const m = useMessages();
  return (
    <>
      <h1>{m.templates.heading}</h1>
      <p>{m.templates.intro}</p>
      <p>
        <Link to={{ name: "placeholders" }}>{m.templates.helpLink}</Link>
      </p>
      {TEMPLATE_KINDS.map((kind) => (
        <TemplateCard key={kind} kind={kind} />
      ))}
      <p>
        <Link to={{ name: "setup", step: "lebenslauf" }} className="button">
          {m.common.next}
        </Link>
      </p>
    </>
  );
}

function TemplateCard({ kind }: { kind: TemplateKind }) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy, announce } = useApp();
  const { running, run } = useTask();
  const [issues, setIssues] = useState<readonly TemplateIssue[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);

  function cancelRemove() {
    setConfirmRemove(false);
    // Runs after the button is back in the DOM.
    requestAnimationFrame(() => removeButton.current?.focus());
  }
  const record = snapshot.templates[kind];
  const kindLabel = m.templates.kinds[kind];
  const headingId = `template-${kind}`;

  async function downloadDemo() {
    await run(async () => {
      const { buildDemoTemplate } = await loadDemo();
      const bytes = buildDemoTemplate(
        kind === "cv" ? m.demo.cv : m.demo.coverLetter,
      );
      downloadBytes(bytes, m.templates.demoFileName(kindLabel), DOCX_MIME);
    });
  }

  async function upload(file: File) {
    setIssues([]);
    announce(m.templates.checking);
    const checked = await run(async () => {
      const bytes = await readPicked(file, MAX_DOCX_BYTES);
      const { inspectTemplate } = await loadDocx();
      return { bytes, result: inspectTemplate(bytes, kind) };
    });
    if (!checked) return;
    if (!checked.result.ok) {
      setIssues(checked.result.issues);
      return;
    }
    const next = {
      kind,
      fileName: file.name.slice(0, 200) || `${kindLabel}.docx`,
      fileId: newId(),
      size: checked.bytes.byteLength,
      uploadedAt: nowIso(),
      tags: [...checked.result.tags],
    };
    await commit(
      (store) => store.saveTemplate(next, checked.bytes),
      (s) => ({ ...s, templates: { ...s.templates, [kind]: next } }),
      m.templates.accepted,
    );
  }

  async function remove() {
    const ok = await commit(
      (store) => store.deleteTemplate(kind),
      (s) => {
        const templates = { ...s.templates };
        delete templates[kind];
        return { ...s, templates };
      },
      m.templates.removed,
    );
    if (ok) {
      setConfirmRemove(false);
      // The demo is active again; the remove button is gone.
      heading.current?.focus();
    }
  }

  return (
    <section className="card" aria-labelledby={headingId}>
      <h2 id={headingId} ref={heading} tabIndex={-1}>
        {kindLabel}
      </h2>
      <p>
        {record
          ? m.templates.activeOwn(
              record.fileName,
              m.format.timestamp(record.uploadedAt),
            )
          : m.templates.activeDemo}
      </p>
      <div className="actions">
        <button
          type="button"
          className="secondary"
          disabled={running}
          onClick={() => void downloadDemo()}
        >
          {m.templates.downloadDemo}
        </button>
      </div>
      <FileField
        label={m.templates.uploadLabel(kindLabel)}
        hint={m.fileLimits.docx}
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        disabled={busy || running}
        onFile={(file) => void upload(file)}
      />
      {issues.length > 0 && (
        <div className="issues" role="alert">
          <h3>{m.templates.rejectedHeading}</h3>
          <p>{m.templates.rejectedIntro}</p>
          <ul>
            {issues.map((issue) => (
              <li
                key={`${issue.code}-${issue.tag ?? ""}-${issue.context ?? ""}`}
              >
                {issueText(issue, m)}
                {issue.suggestion && (
                  <> {m.templates.suggestion(issue.suggestion)}</>
                )}
                {issue.context && issue.context !== issue.tag && (
                  <span className="hint">
                    {" "}
                    {m.templates.context(issue.context)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {record && (
        <>
          <h3>{m.templates.usedHeading}</h3>
          {record.tags.length === 0 ? (
            <p>{m.templates.noneUsed}</p>
          ) : (
            <ul className="tag-list">
              {record.tags.map((tag) => (
                <li key={tag}>
                  <code>{`{${tag}}`}</code>
                </li>
              ))}
            </ul>
          )}
          {confirmRemove ? (
            <div className="confirm">
              <p>{m.templates.removePrompt}</p>
              <div className="actions">
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  {m.common.confirm}
                </button>
                <button
                  type="button"
                  className="secondary"
                  ref={focusOnMount}
                  onClick={cancelRemove}
                >
                  {m.common.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              ref={removeButton}
              onClick={() => setConfirmRemove(true)}
            >
              {m.templates.removeOwn}
            </button>
          )}
        </>
      )}
    </section>
  );
}
