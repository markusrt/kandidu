import { useEffect, useId, useRef, useState } from "react";
import { findCvDocument } from "../../domain/documents";
import { type Lead, setCoverLetterPdf } from "../../domain/lead";
import { backToReview, confirmGate, gateMissing } from "../../domain/lifecycle";
import { MAX_PDF_BYTES } from "../../files/errors";
import { FileField } from "../FileField";
import { loadPdf, readPicked } from "../files";
import { focusOnMount, useReturnFocus } from "../focus";
import { errorMessage, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp, useSnapshot, useTask } from "../state";
import { newId, nowIso } from "../time";

function replaceLead(leads: readonly Lead[], next: Lead) {
  return leads.map((lead) => (lead.id === next.id ? next : lead));
}

export function GateStep({ lead }: { lead: Lead }) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy } = useApp();
  const { running, run } = useTask();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<readonly string[]>([]);
  const errorId = useId();
  const [askBack, setAskBack] = useState(false);
  const backFocus = useReturnFocus(askBack);
  // Releasing or going back swaps the whole view; the clicked button is
  // gone, so focus moves to the heading of the new view (FR-047).
  const heading = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after the status change re-rendered the view
  useEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    heading.current?.focus();
  }, [lead.status]);
  const checkId = useId();
  const cv = findCvDocument(snapshot.documents);
  const toPackage = {
    name: "lead" as const,
    projectId: lead.projectId,
    leadId: lead.id,
    step: "paket" as const,
  };

  async function upload(file: File) {
    const checked = await run(async () => {
      const bytes = await readPicked(file, MAX_PDF_BYTES);
      const { inspectPdf } = await loadPdf();
      return { bytes, info: await inspectPdf(bytes) };
    });
    if (!checked) return;
    const next = setCoverLetterPdf(
      lead,
      {
        fileId: newId(),
        fileName: file.name.slice(0, 200) || m.gate.defaultFileName,
        size: checked.bytes.byteLength,
        pageCount: checked.info.pageCount,
        uploadedAt: nowIso(),
      },
      nowIso(),
    );
    await commit(
      (store) => store.saveLeadFile(next, checked.bytes),
      (s) => ({ ...s, leads: replaceLead(s.leads, next) }),
      m.gate.coverSaved,
    );
  }

  async function release() {
    setError("");
    const gaps = gateMissing(lead, { cvPresent: Boolean(cv), confirmed });
    const labels = [
      gaps.coverLetterPdf && m.gate.missingCover,
      gaps.cvPdf && m.gate.missingCv,
      gaps.confirmation && m.gate.missingConfirmation,
    ].filter((label): label is string => Boolean(label));
    setMissing(labels);
    if (labels.length > 0) {
      setError(m.gate.incomplete);
      return;
    }
    let next: Lead;
    try {
      next = confirmGate(
        lead,
        { cvPresent: Boolean(cv), confirmed },
        newId(),
        nowIso(),
      );
    } catch (cause) {
      setError(errorMessage(cause, m));
      return;
    }
    // Set before the commit: the new status may render before it returns.
    focusHeading.current = true;
    const ok = await commit(
      (store) => store.saveLeads([next]),
      (s) => ({ ...s, leads: replaceLead(s.leads, next) }),
      m.gate.released,
    );
    if (!ok) focusHeading.current = false;
  }

  async function back() {
    const next = backToReview(lead, nowIso());
    focusHeading.current = true;
    const ok = await commit(
      (store) => store.saveLeads([next]),
      (s) => ({ ...s, leads: replaceLead(s.leads, next) }),
      m.gate.backDone,
    );
    if (ok) {
      setAskBack(false);
      setConfirmed(false);
    } else {
      focusHeading.current = false;
    }
  }

  if (lead.status !== "review") {
    return (
      <>
        <h1 ref={heading} tabIndex={-1}>
          {m.gate.heading}
        </h1>
        <section className="card">
          <p>{m.gate.releasedNotice}</p>
          {lead.coverLetterPdf && (
            <p>
              {m.gate.coverCurrent(
                lead.coverLetterPdf.fileName,
                m.format.pages(lead.coverLetterPdf.pageCount),
                m.format.bytes(lead.coverLetterPdf.size),
              )}
            </p>
          )}
          <p>
            <Link to={toPackage} className="button">
              {m.gate.toPackage}
            </Link>
          </p>
          {lead.status === "ready" &&
            (askBack ? (
              <div className="confirm" role="alert">
                <p>{m.gate.backPrompt}</p>
                <div className="actions">
                  <button
                    type="button"
                    className="danger"
                    disabled={busy}
                    onClick={() => void back()}
                  >
                    {m.gate.backConfirm}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    ref={focusOnMount}
                    onClick={() => {
                      backFocus.returnFocus();
                      setAskBack(false);
                    }}
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
                ref={backFocus.opener}
                onClick={() => setAskBack(true)}
              >
                {m.gate.backToReview}
              </button>
            ))}
        </section>
      </>
    );
  }

  return (
    <>
      <h1 ref={heading} tabIndex={-1}>
        {m.gate.heading}
      </h1>
      <p>{m.gate.intro}</p>
      <section className="card">
        <p>
          {lead.coverLetterPdf
            ? m.gate.coverCurrent(
                lead.coverLetterPdf.fileName,
                m.format.pages(lead.coverLetterPdf.pageCount),
                m.format.bytes(lead.coverLetterPdf.size),
              )
            : m.gate.coverMissing}
        </p>
        <FileField
          label={m.gate.coverUpload}
          hint={m.fileLimits.pdf}
          accept=".pdf,application/pdf"
          disabled={busy || running}
          onFile={(file) => void upload(file)}
        />
        {cv ? (
          <p>{m.gate.cvPresent(cv.fileName, m.format.pages(cv.pageCount))}</p>
        ) : (
          <p className="warning">
            {m.gate.cvMissing}{" "}
            <Link to={{ name: "setup", step: "lebenslauf" }}>
              {m.gate.toCv}
            </Link>
          </p>
        )}
        <div className="check-field">
          <input
            id={checkId}
            type="checkbox"
            checked={confirmed}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <label htmlFor={checkId}>{m.gate.confirmLabel}</label>
        </div>
        {error && (
          <div id={errorId} role="alert" className="field-error">
            <p>{error}</p>
            {missing.length > 0 && (
              <ul>
                {missing.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <button
          type="button"
          disabled={busy || running}
          onClick={() => void release()}
        >
          {m.gate.release}
        </button>
      </section>
    </>
  );
}
