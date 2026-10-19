import { useEffect, useId, useRef, useState } from "react";
import {
  addComment,
  COMMENT_MAX,
  type Comment,
  deleteComment,
  editComment,
  type Interview,
  LEAD_LIMITS,
  type Lead,
  type LeadStatus,
  type StatusEntry,
} from "../../domain/lead";
import {
  allowedTransitions,
  applyTransition,
  nextInterview,
  type TransitionTarget,
  undoableEntry,
  undoLast,
} from "../../domain/lifecycle";
import { isHttpUrl } from "../../domain/profile";
import { focusOnMount } from "../focus";
import { errorMessage, type Messages, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp } from "../state";
import { localNow, newId, nowIso, todayIso } from "../time";

function replaceLead(leads: readonly Lead[], next: Lead) {
  return leads.map((lead) => (lead.id === next.id ? next : lead));
}

function InterviewDetail({
  interview,
  m,
}: {
  interview: Interview;
  m: Messages;
}) {
  return (
    <>
      {m.format.dateTime(interview.dateTime)},{" "}
      {interview.mode === "onsite"
        ? m.history.interviewDetail.onsite(interview.location ?? "")
        : m.history.interviewDetail.online}
      {interview.mode === "online" && interview.link && (
        <>
          {" "}
          <a href={interview.link} target="_blank" rel="noopener noreferrer">
            {m.history.interviewDetail.openLink}
          </a>
        </>
      )}
    </>
  );
}

function entryWhen(entry: StatusEntry, m: Messages): string {
  return entry.date ? m.format.date(entry.date) : m.format.timestamp(entry.at);
}

function sortedComments(comments: readonly Comment[]): readonly Comment[] {
  return [...comments].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );
}

export function HistoryView({ lead }: { lead: Lead }) {
  const m = useMessages();
  const { commit, busy } = useApp();
  const status = (s: LeadStatus) => m.leads.status[s];

  // Status change
  const [date, setDate] = useState(todayIso());
  const [dateError, setDateError] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [dateTimeError, setDateTimeError] = useState("");
  const [mode, setMode] = useState<"onsite" | "online">("onsite");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const dateId = useId();
  const dateTimeId = useId();
  const locationId = useId();
  const linkId = useId();

  // Undo
  const [askUndo, setAskUndo] = useState(false);
  const listHeading = useRef<HTMLHeadingElement>(null);

  // Comments
  const [newDate, setNewDate] = useState(todayIso());
  const [newText, setNewText] = useState("");
  const [newError, setNewError] = useState("");
  const [editing, setEditing] = useState<string>();
  const [editDate, setEditDate] = useState("");
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState("");
  const [deleting, setDeleting] = useState<string>();
  const newDateId = useId();
  const newTextId = useId();
  const editDateId = useId();
  const editTextId = useId();
  const newTextArea = useRef<HTMLTextAreaElement>(null);
  const editTextArea = useRef<HTMLTextAreaElement>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterEdit = useRef<string>(undefined);

  useEffect(() => {
    if (editing) {
      editTextArea.current?.focus();
    } else if (focusAfterEdit.current) {
      editButtons.current.get(focusAfterEdit.current)?.focus();
      focusAfterEdit.current = undefined;
    }
  }, [editing]);

  // Cancelling a confirmation returns focus to the button that opened it,
  // once that button is rendered again.
  const undoButton = useRef<HTMLButtonElement>(null);
  const returnToUndo = useRef(false);
  useEffect(() => {
    if (askUndo || !returnToUndo.current) return;
    returnToUndo.current = false;
    undoButton.current?.focus();
  }, [askUndo]);
  const deleteButtons = useRef(new Map<string, HTMLButtonElement>());
  const returnToDelete = useRef<string>(undefined);
  useEffect(() => {
    if (deleting !== undefined || !returnToDelete.current) return;
    deleteButtons.current.get(returnToDelete.current)?.focus();
    returnToDelete.current = undefined;
  }, [deleting]);

  function save(next: Lead, success: string) {
    return commit(
      (store) => store.saveLeads([next]),
      (s) => ({ ...s, leads: replaceLead(s.leads, next) }),
      success,
    );
  }

  const targets = allowedTransitions(lead.status);
  const dateTargets = targets.filter(
    (target): target is Exclude<TransitionTarget, "interview"> =>
      target !== "interview",
  );
  const interviewAllowed = targets.includes("interview");
  const upcoming = nextInterview(lead, localNow());
  const undoEntry = undoableEntry(lead);

  async function changeStatus(target: Exclude<TransitionTarget, "interview">) {
    setDateError("");
    if (!date) {
      setDateError(m.history.errors.dateRequired);
      return;
    }
    let next: Lead;
    try {
      next = applyTransition(lead, { status: target, date }, newId(), nowIso());
    } catch (cause) {
      setDateError(errorMessage(cause, m));
      return;
    }
    await save(next, m.history.changed(status(target)));
  }

  async function addInterview() {
    setDateTimeError("");
    setLinkError("");
    let invalid = false;
    if (!dateTime) {
      setDateTimeError(m.history.errors.dateTimeRequired);
      invalid = true;
    }
    if (mode === "online" && link.trim() && !isHttpUrl(link.trim())) {
      setLinkError(m.history.errors.linkInvalid);
      invalid = true;
    }
    if (invalid) return;
    let next: Lead;
    try {
      next = applyTransition(
        lead,
        {
          status: "interview",
          interview: {
            dateTime,
            mode,
            ...(mode === "onsite" ? { location } : { link }),
          },
        },
        newId(),
        nowIso(),
      );
    } catch (cause) {
      setDateTimeError(errorMessage(cause, m));
      return;
    }
    if (await save(next, m.history.changed(status("interview")))) {
      setDateTime("");
      setLocation("");
      setLink("");
    }
  }

  async function undo() {
    let next: Lead;
    try {
      next = undoLast(lead, nowIso());
    } catch (cause) {
      setDateError(errorMessage(cause, m));
      setAskUndo(false);
      return;
    }
    const ok = await save(next, m.history.undone);
    if (ok) {
      setAskUndo(false);
      listHeading.current?.focus();
    }
  }

  async function add() {
    setNewError("");
    let next: Lead;
    try {
      next = addComment(
        lead,
        { date: newDate, text: newText },
        newId(),
        nowIso(),
      );
    } catch (cause) {
      setNewError(errorMessage(cause, m));
      return;
    }
    if (await save(next, m.history.commentAdded)) {
      setNewText("");
      setNewDate(todayIso());
    }
  }

  function startEdit(comment: Comment) {
    setDeleting(undefined);
    setEditing(comment.id);
    setEditDate(comment.date);
    setEditText(comment.text);
    setEditError("");
  }

  function stopEdit() {
    focusAfterEdit.current = editing;
    setEditing(undefined);
    setEditError("");
  }

  async function saveEdit(id: string) {
    setEditError("");
    let next: Lead;
    try {
      next = editComment(
        lead,
        id,
        { date: editDate, text: editText },
        nowIso(),
      );
    } catch (cause) {
      setEditError(errorMessage(cause, m));
      return;
    }
    if (await save(next, m.history.commentSaved)) stopEdit();
  }

  async function remove(id: string) {
    let next: Lead;
    try {
      next = deleteComment(lead, id, nowIso());
    } catch (cause) {
      setEditError(errorMessage(cause, m));
      return;
    }
    if (await save(next, m.history.commentDeleted)) {
      setDeleting(undefined);
      newTextArea.current?.focus();
    }
  }

  const toGate = {
    name: "lead" as const,
    projectId: lead.projectId,
    leadId: lead.id,
    step: "freigabe" as const,
  };
  const comments = sortedComments(lead.comments);

  return (
    <>
      <h1>{m.history.heading}</h1>

      <section className="card" aria-labelledby="history-current">
        <h2 id="history-current">{m.history.currentHeading}</h2>
        <p>{m.history.current(status(lead.status))}</p>
        {upcoming && (
          <p>
            {m.history.nextInterview(
              m.format.dateTime(upcoming.dateTime),
              upcoming.mode === "onsite"
                ? m.history.interviewDetail.onsite(upcoming.location ?? "")
                : m.history.interviewDetail.online,
            )}
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="history-change">
        <h2 id="history-change">{m.history.changeHeading}</h2>
        {lead.status === "review" && (
          <p className="info">
            {m.history.inReview} <Link to={toGate}>{m.history.toGate}</Link>
          </p>
        )}
        {targets.length === 0 && <p>{m.history.terminal}</p>}
        {dateTargets.length > 0 && (
          <>
            <div className="field">
              <label htmlFor={dateId}>{m.history.dateLabel}</label>
              <input
                id={dateId}
                type="date"
                value={date}
                aria-invalid={dateError ? true : undefined}
                aria-describedby={dateError ? `${dateId}-error` : undefined}
                onChange={(event) => setDate(event.target.value)}
              />
              {dateError && (
                <p id={`${dateId}-error`} className="field-error">
                  {dateError}
                </p>
              )}
            </div>
            <fieldset>
              <legend>{m.history.newStatus}</legend>
              <div className="actions">
                {dateTargets.map((target) => (
                  <button
                    key={target}
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => void changeStatus(target)}
                  >
                    {status(target)}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {interviewAllowed && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void addInterview();
            }}
          >
            <fieldset>
              <legend>{m.history.interviewHeading}</legend>
              <div className="field">
                <label htmlFor={dateTimeId}>
                  {m.history.interviewDateTime}
                </label>
                <input
                  id={dateTimeId}
                  type="datetime-local"
                  value={dateTime}
                  aria-invalid={dateTimeError ? true : undefined}
                  aria-describedby={
                    dateTimeError ? `${dateTimeId}-error` : undefined
                  }
                  onChange={(event) => setDateTime(event.target.value)}
                />
                {dateTimeError && (
                  <p id={`${dateTimeId}-error`} className="field-error">
                    {dateTimeError}
                  </p>
                )}
              </div>
              <fieldset>
                <legend>{m.history.modeLegend}</legend>
                <div className="check-field">
                  <input
                    id={`${dateTimeId}-onsite`}
                    type="radio"
                    name={`${dateTimeId}-mode`}
                    checked={mode === "onsite"}
                    onChange={() => setMode("onsite")}
                  />
                  <label htmlFor={`${dateTimeId}-onsite`}>
                    {m.history.modeOnsite}
                  </label>
                </div>
                <div className="check-field">
                  <input
                    id={`${dateTimeId}-online`}
                    type="radio"
                    name={`${dateTimeId}-mode`}
                    checked={mode === "online"}
                    onChange={() => setMode("online")}
                  />
                  <label htmlFor={`${dateTimeId}-online`}>
                    {m.history.modeOnline}
                  </label>
                </div>
              </fieldset>
              {mode === "onsite" ? (
                <div className="field">
                  <label htmlFor={locationId}>{m.history.location}</label>
                  <input
                    id={locationId}
                    value={location}
                    maxLength={LEAD_LIMITS.shortText}
                    onChange={(event) => setLocation(event.target.value)}
                  />
                </div>
              ) : (
                <div className="field">
                  <label htmlFor={linkId}>{m.history.linkOptional}</label>
                  <input
                    id={linkId}
                    type="text"
                    inputMode="url"
                    value={link}
                    maxLength={LEAD_LIMITS.url}
                    aria-invalid={linkError ? true : undefined}
                    aria-describedby={linkError ? `${linkId}-error` : undefined}
                    onChange={(event) => setLink(event.target.value)}
                  />
                  {linkError && (
                    <p id={`${linkId}-error`} className="field-error">
                      {linkError}
                    </p>
                  )}
                </div>
              )}
              <button type="submit" disabled={busy}>
                {m.history.interviewSubmit}
              </button>
            </fieldset>
          </form>
        )}
        {undoEntry &&
          (askUndo ? (
            <div className="confirm">
              <p>
                {(undoEntry.status === "ready"
                  ? m.history.undoPromptReady
                  : m.history.undoPrompt)(
                  status(undoEntry.status),
                  entryWhen(undoEntry, m),
                )}
              </p>
              <div className="actions">
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => void undo()}
                >
                  {m.history.undoConfirm}
                </button>
                <button
                  type="button"
                  className="secondary"
                  ref={focusOnMount}
                  onClick={() => {
                    returnToUndo.current = true;
                    setAskUndo(false);
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
              ref={undoButton}
              onClick={() => setAskUndo(true)}
            >
              {m.history.undo}
            </button>
          ))}
      </section>

      <section className="card" aria-labelledby="history-list">
        <h2 id="history-list" ref={listHeading} tabIndex={-1}>
          {m.history.listHeading}
        </h2>
        <ol className="history-list">
          {lead.history.map((entry) => (
            <li
              key={entry.id}
              className={entry.undoneAt ? "undone" : undefined}
            >
              <p>
                <strong>{status(entry.status)}</strong> · {entryWhen(entry, m)}
              </p>
              {entry.interview && (
                <p>
                  <InterviewDetail interview={entry.interview} m={m} />
                </p>
              )}
              {entry.undoneAt && (
                <p className="undone-note">
                  {m.history.entryUndone(m.format.timestamp(entry.undoneAt))}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="card" aria-labelledby="history-comments">
        <h2 id="history-comments">{m.history.commentsHeading}</h2>
        {comments.length === 0 ? (
          <p>{m.history.noComments}</p>
        ) : (
          <ul className="comment-list">
            {comments.map((comment, index) => {
              const n = index + 1;
              if (comment.id === editing) {
                return (
                  <li key={comment.id}>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveEdit(comment.id);
                      }}
                    >
                      <div className="field">
                        <label htmlFor={editDateId}>
                          {m.history.editDateLabel(n)}
                        </label>
                        <input
                          id={editDateId}
                          type="date"
                          value={editDate}
                          onChange={(event) => setEditDate(event.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={editTextId}>
                          {m.history.editTextLabel(n)}
                        </label>
                        <textarea
                          id={editTextId}
                          ref={editTextArea}
                          rows={4}
                          maxLength={COMMENT_MAX}
                          value={editText}
                          aria-invalid={editError ? true : undefined}
                          aria-describedby={
                            editError ? `${editTextId}-error` : undefined
                          }
                          onChange={(event) => setEditText(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              stopEdit();
                            }
                          }}
                        />
                        <p className="hint">
                          {m.history.commentCount(editText.length, COMMENT_MAX)}
                        </p>
                        {editError && (
                          <p id={`${editTextId}-error`} className="field-error">
                            {editError}
                          </p>
                        )}
                      </div>
                      <div className="actions">
                        <button type="submit" disabled={busy}>
                          {m.common.save}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={stopEdit}
                        >
                          {m.common.cancel}
                        </button>
                      </div>
                    </form>
                  </li>
                );
              }
              return (
                <li key={comment.id}>
                  <p className="comment-date">
                    <strong>{m.format.date(comment.date)}</strong>
                  </p>
                  <p className="comment-text">{comment.text}</p>
                  {deleting === comment.id ? (
                    <div className="confirm">
                      <p>{m.history.deletePrompt}</p>
                      <div className="actions">
                        <button
                          type="button"
                          className="danger"
                          disabled={busy}
                          onClick={() => void remove(comment.id)}
                        >
                          {m.history.deleteConfirm}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          ref={focusOnMount}
                          onClick={() => {
                            returnToDelete.current = comment.id;
                            setDeleting(undefined);
                          }}
                        >
                          {m.common.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="actions compact">
                      <button
                        type="button"
                        className="secondary small"
                        disabled={busy || editing !== undefined}
                        aria-label={m.history.editLabel(n)}
                        ref={(element) => {
                          if (element) {
                            editButtons.current.set(comment.id, element);
                          } else {
                            editButtons.current.delete(comment.id);
                          }
                        }}
                        onClick={() => startEdit(comment)}
                      >
                        {m.history.edit}
                      </button>
                      <button
                        type="button"
                        className="secondary small"
                        disabled={busy || editing !== undefined}
                        aria-label={m.history.deleteLabel(n)}
                        ref={(element) => {
                          if (element) {
                            deleteButtons.current.set(comment.id, element);
                          } else {
                            deleteButtons.current.delete(comment.id);
                          }
                        }}
                        onClick={() => setDeleting(comment.id)}
                      >
                        {m.common.delete}
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <div className="field">
            <label htmlFor={newDateId}>{m.history.commentDate}</label>
            <input
              id={newDateId}
              type="date"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={newTextId}>{m.history.commentText}</label>
            <textarea
              id={newTextId}
              ref={newTextArea}
              rows={4}
              maxLength={COMMENT_MAX}
              value={newText}
              aria-invalid={newError ? true : undefined}
              aria-describedby={`${newTextId}-count${
                newError ? ` ${newTextId}-error` : ""
              }`}
              onChange={(event) => setNewText(event.target.value)}
            />
            <p id={`${newTextId}-count`} className="hint">
              {m.history.commentCount(newText.length, COMMENT_MAX)}
            </p>
            {newError && (
              <p id={`${newTextId}-error`} className="field-error">
                {newError}
              </p>
            )}
          </div>
          <button type="submit" disabled={busy}>
            {m.history.addComment}
          </button>
        </form>
      </section>
    </>
  );
}
