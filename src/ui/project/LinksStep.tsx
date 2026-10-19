import { useEffect, useId, useRef, useState } from "react";
import {
  addLink,
  LINK_MAX,
  PROJECT_TITLE_MAX,
  PROMPT_CONTEXT_MAX,
  type Project,
  removeLink,
  renameProject,
  setPromptContext,
  updateLink,
} from "../../domain/project";
import { errorMessage, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp } from "../state";
import { newId, nowIso } from "../time";
import { useUnsavedGuard } from "../unsaved";

export function LinksStep({ project }: { project: Project }) {
  const m = useMessages();
  const { commit, busy } = useApp();
  const [title, setTitle] = useState(project.title);
  const [titleError, setTitleError] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [editing, setEditing] = useState<string>();
  const [editUrl, setEditUrl] = useState("");
  const [editError, setEditError] = useState("");
  const [context, setContext] = useState(project.promptContext);
  const [contextError, setContextError] = useState("");
  const titleId = useId();
  const urlId = useId();
  const editId = useId();
  const contextId = useId();
  const editInput = useRef<HTMLInputElement>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterEdit = useRef<string>(undefined);

  const editedLink = project.links.find((l) => l.id === editing);
  const contextDirty = context !== project.promptContext;
  const dirty =
    title.trim() !== project.title ||
    contextDirty ||
    url.trim() !== "" ||
    (editedLink !== undefined && editUrl.trim() !== editedLink.url);
  useUnsavedGuard(dirty, m.common.unsavedConfirm);

  useEffect(() => {
    if (editing) {
      editInput.current?.focus();
    } else if (focusAfterEdit.current) {
      editButtons.current.get(focusAfterEdit.current)?.focus();
      focusAfterEdit.current = undefined;
    }
  }, [editing]);

  function save(next: Project, success?: string) {
    return commit(
      (store) => store.saveProject(next),
      (s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === next.id ? next : p)),
      }),
      success,
    );
  }

  async function rename() {
    setTitleError("");
    try {
      await save(renameProject(project, title, nowIso()), m.common.saved);
    } catch (cause) {
      setTitleError(errorMessage(cause, m));
    }
  }

  async function add() {
    setUrlError("");
    let next: Project;
    try {
      next = addLink(project, url, newId(), nowIso());
    } catch (cause) {
      setUrlError(errorMessage(cause, m));
      return;
    }
    if (await save(next, m.common.saved)) setUrl("");
  }

  function startEdit(linkId: string, current: string) {
    setEditing(linkId);
    setEditUrl(current);
    setEditError("");
  }

  function stopEdit() {
    focusAfterEdit.current = editing;
    setEditing(undefined);
    setEditError("");
  }

  async function saveEdit(linkId: string) {
    setEditError("");
    let next: Project;
    try {
      next = updateLink(project, linkId, editUrl, nowIso());
    } catch (cause) {
      setEditError(errorMessage(cause, m));
      return;
    }
    if (await save(next, m.project.linkUpdated)) stopEdit();
  }

  async function saveContext() {
    setContextError("");
    let next: Project;
    try {
      next = setPromptContext(project, context, nowIso());
    } catch (cause) {
      setContextError(errorMessage(cause, m));
      return;
    }
    await save(next, m.common.saved);
  }

  return (
    <>
      <h1>{m.project.linksHeading}</h1>
      <section className="card">
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            void rename();
          }}
        >
          <div className="field">
            <label htmlFor={titleId}>{m.project.titleLabel}</label>
            <input
              id={titleId}
              value={title}
              maxLength={PROJECT_TITLE_MAX}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? `${titleId}-error` : undefined}
              onChange={(event) => setTitle(event.target.value)}
            />
            {titleError && (
              <p id={`${titleId}-error`} className="field-error">
                {titleError}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="secondary"
            disabled={busy || title.trim() === project.title}
          >
            {m.project.rename}
          </button>
        </form>
      </section>
      <section className="card" aria-labelledby="links-heading">
        <h2 id="links-heading">{m.project.linksHeading}</h2>
        <p>{m.project.linksIntro}</p>
        {project.links.length === 0 ? (
          <p>{m.project.noLinks}</p>
        ) : (
          <ol className="item-list">
            {project.links.map((link, index) =>
              link.id === editing ? (
                <li key={link.id}>
                  <form
                    className="inline-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveEdit(link.id);
                    }}
                  >
                    <div className="field">
                      <label htmlFor={editId}>
                        {m.project.editLinkLabel(index + 1)}
                      </label>
                      <input
                        id={editId}
                        ref={editInput}
                        type="url"
                        inputMode="url"
                        value={editUrl}
                        maxLength={LINK_MAX}
                        aria-invalid={editError ? true : undefined}
                        aria-describedby={
                          editError ? `${editId}-error` : undefined
                        }
                        onChange={(event) => setEditUrl(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            stopEdit();
                          }
                        }}
                      />
                      {editError && (
                        <p id={`${editId}-error`} className="field-error">
                          {editError}
                        </p>
                      )}
                    </div>
                    <span className="actions compact">
                      <button type="submit" disabled={busy || !editUrl.trim()}>
                        {m.common.save}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={stopEdit}
                      >
                        {m.common.cancel}
                      </button>
                    </span>
                  </form>
                </li>
              ) : (
                <li key={link.id}>
                  <span className="url">{link.url}</span>
                  <span className="actions compact">
                    <button
                      type="button"
                      className="secondary small"
                      disabled={busy || editing !== undefined}
                      aria-label={m.project.editLink(link.url)}
                      ref={(element) => {
                        if (element) editButtons.current.set(link.id, element);
                        else editButtons.current.delete(link.id);
                      }}
                      onClick={() => startEdit(link.id, link.url)}
                    >
                      {m.project.edit}
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      disabled={busy || editing !== undefined}
                      aria-label={m.project.removeLink(link.url)}
                      onClick={() =>
                        void save(
                          removeLink(project, link.id, nowIso()),
                          m.project.linkRemoved,
                        )
                      }
                    >
                      {m.common.delete}
                    </button>
                  </span>
                </li>
              ),
            )}
          </ol>
        )}
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <div className="field">
            <label htmlFor={urlId}>{m.project.linkLabel}</label>
            <input
              id={urlId}
              type="url"
              inputMode="url"
              value={url}
              maxLength={LINK_MAX}
              placeholder="https://"
              aria-invalid={urlError ? true : undefined}
              aria-describedby={urlError ? `${urlId}-error` : undefined}
              onChange={(event) => setUrl(event.target.value)}
            />
            {urlError && (
              <p id={`${urlId}-error`} className="field-error">
                {urlError}
              </p>
            )}
          </div>
          <button type="submit" disabled={busy || !url.trim()}>
            {m.project.addLink}
          </button>
        </form>
      </section>
      <section className="card" aria-labelledby="context-heading">
        <h2 id="context-heading">{m.project.contextHeading}</h2>
        <p>{m.project.contextIntro}</p>
        <p className="warning">{m.project.contextNotice}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveContext();
          }}
        >
          <div className="field">
            <label htmlFor={contextId}>{m.project.contextLabel}</label>
            <textarea
              id={contextId}
              value={context}
              rows={5}
              maxLength={PROMPT_CONTEXT_MAX}
              aria-invalid={contextError ? true : undefined}
              aria-describedby={`${contextId}-count${
                contextError ? ` ${contextId}-error` : ""
              }`}
              onChange={(event) => setContext(event.target.value)}
            />
            <p id={`${contextId}-count`} className="hint">
              {m.project.contextCount(context.length, PROMPT_CONTEXT_MAX)}
            </p>
            {contextError && (
              <p id={`${contextId}-error`} className="field-error">
                {contextError}
              </p>
            )}
          </div>
          <div className="actions">
            <button
              type="submit"
              className="secondary"
              disabled={busy || !contextDirty}
            >
              {m.project.contextSave}
            </button>
            {contextDirty && <span className="hint">{m.common.unsaved}</span>}
          </div>
        </form>
      </section>
      {project.links.length > 0 && (
        <p>
          <Link
            to={{ name: "project", projectId: project.id, step: "prompt" }}
            className="button"
          >
            {m.project.toPrompt}
          </Link>
        </p>
      )}
    </>
  );
}
