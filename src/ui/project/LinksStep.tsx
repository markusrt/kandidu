import { useId, useState } from "react";
import {
  addLink,
  LINK_MAX,
  PROJECT_TITLE_MAX,
  type Project,
  removeLink,
  renameProject,
} from "../../domain/project";
import { errorMessage, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp } from "../state";
import { newId, nowIso } from "../time";

export function LinksStep({ project }: { project: Project }) {
  const m = useMessages();
  const { commit, busy } = useApp();
  const [title, setTitle] = useState(project.title);
  const [titleError, setTitleError] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const titleId = useId();
  const urlId = useId();

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
            {project.links.map((link) => (
              <li key={link.id}>
                <span className="url">{link.url}</span>
                <button
                  type="button"
                  className="secondary small"
                  disabled={busy}
                  aria-label={m.project.removeLink(link.url)}
                  onClick={() =>
                    void save(removeLink(project, link.id, nowIso()))
                  }
                >
                  {m.common.delete}
                </button>
              </li>
            ))}
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
