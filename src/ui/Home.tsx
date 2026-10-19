import { useEffect, useId, useRef, useState } from "react";
import { findCvDocument } from "../domain/documents";
import { nextDate, statusCounts } from "../domain/overview";
import { createProject, PROJECT_TITLE_MAX } from "../domain/project";
import { focusOnMount } from "./focus";
import { errorMessage, useMessages } from "./i18n";
import { Link, navigate } from "./router";
import { useApp, useSnapshot } from "./state";
import { localNow, newId, nowIso } from "./time";

export function Home() {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy } = useApp();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const inputId = useId();

  const cv = findCvDocument(snapshot.documents);
  const setupItems = [
    { label: m.home.setupItemProfile, done: Boolean(snapshot.profile) },
    { label: m.home.setupItemTemplates, done: true },
    { label: m.home.setupItemCv, done: Boolean(cv) },
  ];
  const setupDone = setupItems.every((item) => item.done);
  const projects = [...snapshot.projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const now = localNow();
  const [deleting, setDeleting] = useState<string>();
  const projectsHeading = useRef<HTMLHeadingElement>(null);
  const deleteButtons = useRef(new Map<string, HTMLButtonElement>());

  // After a cancelled delete, focus returns to the project's button once it
  // is rendered and enabled again (after the re-render).
  const returnFocus = useRef<string>(undefined);
  useEffect(() => {
    if (deleting !== undefined || !returnFocus.current) return;
    deleteButtons.current.get(returnFocus.current)?.focus();
    returnFocus.current = undefined;
  }, [deleting]);

  function cancelDelete(id: string) {
    returnFocus.current = id;
    setDeleting(undefined);
  }

  // FR-037: the project with its responses, leads and their files.
  async function remove(id: string, projectTitle: string) {
    const ok = await commit(
      (store) => store.deleteProject(id),
      (s) => ({
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
        leads: s.leads.filter((lead) => lead.projectId !== id),
      }),
      m.home.deleted(projectTitle),
    );
    if (ok) {
      setDeleting(undefined);
      projectsHeading.current?.focus();
    }
  }

  async function create() {
    setError("");
    let project: ReturnType<typeof createProject>;
    try {
      project = createProject(title, newId(), nowIso());
    } catch (cause) {
      setError(errorMessage(cause, m));
      return;
    }
    const ok = await commit(
      (store) => store.saveProject(project),
      (s) => ({ ...s, projects: [...s.projects, project] }),
      m.home.created,
    );
    if (ok) {
      setTitle("");
      navigate({ name: "project", projectId: project.id, step: "links" });
    }
  }

  return (
    <>
      <h1>{m.home.heading}</h1>
      <p className="lead-text">{m.common.tagline}</p>

      <section className="card" aria-labelledby="setup-heading">
        <h2 id="setup-heading">{m.home.setupHeading}</h2>
        {setupDone ? (
          <p>{m.home.setupDone}</p>
        ) : (
          <>
            <p>{m.home.setupOpen}</p>
            <ul className="checklist">
              {setupItems.map((item) => (
                <li key={item.label} className={item.done ? "done" : "open"}>
                  {item.label}:{" "}
                  <strong>
                    {item.done ? m.home.setupItemDone : m.home.setupItemOpen}
                  </strong>
                </li>
              ))}
            </ul>
            <Link to={{ name: "setup", step: "profil" }} className="button">
              {m.home.toSetup}
            </Link>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="projects-heading">
        <h2 id="projects-heading" ref={projectsHeading} tabIndex={-1}>
          {m.home.projectsHeading}
        </h2>
        {projects.length === 0 ? (
          <p>{m.home.noProjects}</p>
        ) : (
          <ul className="item-list project-list">
            {projects.map((project) => {
              const leads = snapshot.leads.filter(
                (lead) => lead.projectId === project.id,
              );
              const next = nextDate(leads, now);
              return (
                <li key={project.id}>
                  <div className="project-summary">
                    <Link
                      to={{
                        name: "project",
                        projectId: project.id,
                        step: undefined,
                      }}
                    >
                      {project.title}
                    </Link>
                    <span className="meta">
                      {m.home.leadCount(leads.length)}
                      {project.promptState === "copied" && (
                        <span className="badge">{m.home.pendingResponse}</span>
                      )}
                    </span>
                    {leads.length > 0 && (
                      <ul
                        className="status-counts"
                        aria-label={m.home.statusCountsLabel(project.title)}
                      >
                        {statusCounts(leads).map(({ status, count }) => (
                          <li key={status}>
                            {m.home.statusCount(m.leads.status[status], count)}
                          </li>
                        ))}
                      </ul>
                    )}
                    {next && (
                      <p className="meta">
                        {m.home.nextInterview(m.format.dateTime(next))}
                      </p>
                    )}
                  </div>
                  {deleting === project.id ? (
                    <div className="confirm" role="alert">
                      <p>
                        {m.home.deletePrompt(
                          project.title,
                          leads.length,
                          project.responses.length,
                        )}
                      </p>
                      <div className="actions">
                        <button
                          type="button"
                          className="danger"
                          disabled={busy}
                          onClick={() => void remove(project.id, project.title)}
                        >
                          {m.home.deleteConfirm}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          // The project's own button is disabled now.
                          ref={focusOnMount}
                          onClick={() => cancelDelete(project.id)}
                        >
                          {m.common.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="secondary small"
                      disabled={busy || deleting !== undefined}
                      aria-label={m.home.deleteLabel(project.title)}
                      ref={(element) => {
                        if (element)
                          deleteButtons.current.set(project.id, element);
                        else deleteButtons.current.delete(project.id);
                      }}
                      onClick={() => setDeleting(project.id)}
                    >
                      {m.common.delete}
                    </button>
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
            void create();
          }}
        >
          <h3>{m.home.newProjectHeading}</h3>
          <div className="field">
            <label htmlFor={inputId}>{m.home.newProjectLabel}</label>
            <input
              id={inputId}
              value={title}
              maxLength={PROJECT_TITLE_MAX}
              aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ""}`}
              aria-invalid={error ? true : undefined}
              onChange={(event) => setTitle(event.target.value)}
            />
            <p id={`${inputId}-hint`} className="hint">
              {m.home.newProjectHint}
            </p>
            {error && (
              <p id={`${inputId}-error`} className="field-error">
                {error}
              </p>
            )}
          </div>
          <button type="submit" disabled={busy || !title.trim()}>
            {m.home.createProject}
          </button>
        </form>
      </section>
    </>
  );
}
