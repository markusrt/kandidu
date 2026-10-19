import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createLeadsFromDrafts, type Lead } from "../../domain/lead";
import {
  addResponse,
  type EntryIssue,
  findImportedResponse,
  markResponseImported,
  type ParseResult,
  type ParseWarning,
  type Project,
  partialImport,
  RESPONSE_MAX,
  type StoredResponse,
  setResponseDraft,
} from "../../domain/project";
import { parseResponse } from "../../llm/parse";
import { type Messages, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp } from "../state";
import { newId, nowIso } from "../time";

const DRAFT_DELAY_MS = 800;

export function fieldLabel(path: readonly string[], m: Messages): string {
  const fields = m.response.fields;
  const joined = path.join(".");
  return (
    fields[joined] ??
    fields[path.slice(0, 2).join(".")] ??
    fields[path[0] ?? ""] ??
    m.response.fieldFallback(joined)
  );
}

export function issueLine(issue: EntryIssue, m: Messages): string {
  return m.response.issue(issue.entry, fieldLabel(issue.path, m), issue.kind);
}

export function warningLine(warning: ParseWarning, m: Messages): string {
  return m.response.warning[warning.kind](warning.entry);
}

function replaceProject(projects: readonly Project[], next: Project) {
  return projects.map((p) => (p.id === next.id ? next : p));
}

export function ResponseStep({ project }: { project: Project }) {
  const m = useMessages();
  const { commit } = useApp();
  // Not tied to the global busy flag: blur-autosave runs as the user clicks
  // submit, and commit() queues both writes.
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState(project.responseDraft);
  const [draftNote, setDraftNote] = useState("");
  const [result, setResult] = useState<ParseResult>();
  const projectLinks = project.links.map((link) => link.url);
  const [created, setCreated] = useState<readonly Lead[]>([]);
  const [responseId, setResponseId] = useState<string>();
  const areaId = useId();
  const saved = useRef<string | undefined>(project.responseDraft);
  const latest = useRef(project);
  latest.current = project;

  const textRef = useRef(text);
  textRef.current = text;

  // Saves the paste box unless it is unchanged or over the limit. Writes are
  // queued by commit(), so a save requested during another write still lands.
  const saveDraft = useCallback(() => {
    const value = textRef.current;
    if (value === saved.current || value.length > RESPONSE_MAX) return;
    saved.current = value;
    // Built when the write runs, from the state after earlier writes: a
    // response import queued before it must not be undone (FR-020).
    let next: Project | undefined;
    void commit(
      (s, snapshot) => {
        const id = latest.current.id;
        const base =
          snapshot?.projects.find((p) => p.id === id) ?? latest.current;
        next = setResponseDraft(base, value, nowIso());
        return s.saveProject(next);
      },
      (s) => (next ? { ...s, projects: replaceProject(s.projects, next) } : s),
      undefined,
      { background: true },
    ).then((ok) => {
      if (!ok) {
        // Allow the next attempt (blur, navigation, typing) to retry.
        if (saved.current === value) saved.current = undefined;
        return;
      }
      if (textRef.current === value) setDraftNote(m.response.draftSaved);
    });
  }, [commit, m]);

  // Autosave so a pause or crash never loses the paste (FR-017, FR-020).
  useEffect(() => {
    if (text === saved.current) return;
    const timer = window.setTimeout(saveDraft, DRAFT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text, saveDraft]);

  // Flush immediately when leaving the step or the page.
  useEffect(() => {
    window.addEventListener("pagehide", saveDraft);
    return () => {
      window.removeEventListener("pagehide", saveDraft);
      saveDraft();
    };
  }, [saveDraft]);

  const tooLong = text.length > RESPONSE_MAX;
  const duplicate = findImportedResponse(project, text);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  async function submit() {
    if (duplicate && !confirmDuplicate) {
      setConfirmDuplicate(true);
      return;
    }
    setConfirmDuplicate(false);
    setCreated([]);
    if (tooLong) {
      setResult({ ok: false, error: "response-too-large" });
      return;
    }
    const parsed = parseResponse(text);
    const now = nowIso();
    const responseId = newId();
    const leads = parsed.ok
      ? createLeadsFromDrafts(
          parsed.leads,
          project.id,
          projectLinks,
          responseId,
          newId,
          now,
        )
      : [];
    const response: StoredResponse = {
      id: responseId,
      text,
      receivedAt: now,
      result: parsed,
      importedLeadIds: leads.map((lead) => lead.id),
    };
    // The paste is persisted together with the result, success or not (FR-020).
    const withDraft = setResponseDraft(project, text, now);
    const next = addResponse(withDraft, response, now);
    setSubmitting(true);
    const ok = await commit(
      (s) =>
        leads.length > 0 ? s.saveLeads(leads, next) : s.saveProject(next),
      (s) => ({
        ...s,
        projects: replaceProject(s.projects, next),
        leads: [...s.leads, ...leads],
      }),
      leads.length > 0 ? m.response.created(leads.length) : undefined,
    );
    setSubmitting(false);
    if (!ok) return;
    saved.current = next.responseDraft;
    setResult(parsed);
    setResponseId(responseId);
    setCreated(leads);
    if (leads.length > 0) setText("");
  }

  // Takes over only the valid entries of the response just read (FR-021).
  async function importValid() {
    if (!result || result.ok || result.error !== "schema-invalid") return;
    if (!responseId) return;
    const now = nowIso();
    const leads = createLeadsFromDrafts(
      result.validLeads,
      project.id,
      projectLinks,
      responseId,
      newId,
      now,
    );
    const next = markResponseImported(
      project,
      responseId,
      leads.map((lead) => lead.id),
      now,
    );
    setSubmitting(true);
    const ok = await commit(
      (s) => s.saveLeads(leads, next),
      (s) => ({
        ...s,
        projects: replaceProject(s.projects, next),
        leads: [...s.leads, ...leads],
      }),
      m.response.created(leads.length),
    );
    setSubmitting(false);
    if (!ok) return;
    saved.current = next.responseDraft;
    setResult(undefined);
    setCreated(leads);
    setText("");
  }

  return (
    <>
      <h1>{m.response.heading}</h1>
      <p>{m.response.intro}</p>
      <section className="card">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="field">
            <label htmlFor={areaId}>{m.response.label}</label>
            <textarea
              id={areaId}
              value={text}
              rows={14}
              spellCheck={false}
              aria-describedby={`${areaId}-note`}
              onBlur={saveDraft}
              onChange={(event) => {
                setDraftNote("");
                setConfirmDuplicate(false);
                setText(event.target.value);
              }}
            />
            <p id={`${areaId}-note`} className="hint">
              {tooLong ? m.response.errors["response-too-large"] : draftNote}
            </p>
          </div>
          <button type="submit" disabled={submitting || !text.trim()}>
            {m.response.submit}
          </button>
          {confirmDuplicate && duplicate && (
            <div className="confirm" role="alert">
              <p>
                {m.response.duplicatePrompt(
                  m.format.timestamp(duplicate.receivedAt),
                  duplicate.importedLeadIds.length,
                )}
              </p>
              <div className="actions">
                <button type="submit" disabled={submitting}>
                  {m.response.duplicateConfirm}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setConfirmDuplicate(false)}
                >
                  {m.common.cancel}
                </button>
              </div>
            </div>
          )}
        </form>
        {result && !result.ok && (
          <ParseErrors
            result={result}
            busy={submitting}
            onImportValid={() => void importValid()}
          />
        )}
        {result?.ok && result.warnings.length > 0 && (
          <ul className="warnings">
            {result.warnings.map((warning) => (
              <li key={`${warning.entry}-${warning.kind}`}>
                {warningLine(warning, m)}
              </li>
            ))}
          </ul>
        )}
        {created.length > 0 && (
          <p>
            <Link
              to={{ name: "project", projectId: project.id, step: "leads" }}
              className="button"
            >
              {m.response.toLeads}
            </Link>
          </p>
        )}
      </section>
      {project.responses.length > 0 && <History project={project} />}
    </>
  );
}

function ParseErrors({
  result,
  busy,
  onImportValid,
}: {
  result: Extract<ParseResult, { ok: false }>;
  busy: boolean;
  onImportValid: () => void;
}) {
  const m = useMessages();
  const partial = partialImport(result);
  return (
    <div className="issues" role="alert">
      <h2>{m.response.errorHeading}</h2>
      <p>{m.response.errors[result.error]}</p>
      {result.error === "json-invalid" &&
        result.detail?.position !== undefined && (
          <p>{m.response.jsonPosition(result.detail.position)}</p>
        )}
      {result.error === "schema-invalid" && (
        <ul>
          {result.issues.map((issue) => (
            <li key={`${issue.entry}-${issue.path.join(".")}-${issue.kind}`}>
              {issueLine(issue, m)}
            </li>
          ))}
        </ul>
      )}
      <p>{m.response.keptHint}</p>
      {partial && (
        <div className="actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onImportValid}
          >
            {m.response.importValid(partial.valid, partial.total)}
          </button>
        </div>
      )}
    </div>
  );
}

function History({ project }: { project: Project }) {
  const m = useMessages();
  return (
    <section className="card" aria-labelledby="history-heading">
      <h2 id="history-heading">{m.response.historyHeading}</h2>
      <ul className="item-list">
        {[...project.responses].reverse().map((response) => (
          <li key={response.id}>
            <details>
              <summary>
                {m.response.historyItem(
                  m.format.timestamp(response.receivedAt),
                  response.importedLeadIds.length > 0,
                )}
              </summary>
              <pre className="response-text">{response.text}</pre>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
