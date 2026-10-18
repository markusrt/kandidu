import { useId, useState } from "react";
import { findCvDocument } from "../domain/documents";
import { createProject, PROJECT_TITLE_MAX } from "../domain/project";
import { errorMessage, useMessages } from "./i18n";
import { Link, navigate } from "./router";
import { useApp, useSnapshot } from "./state";
import { newId, nowIso } from "./time";

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
        <h2 id="projects-heading">{m.home.projectsHeading}</h2>
        {projects.length === 0 ? (
          <p>{m.home.noProjects}</p>
        ) : (
          <ul className="item-list">
            {projects.map((project) => {
              const count = snapshot.leads.filter(
                (lead) => lead.projectId === project.id,
              ).length;
              return (
                <li key={project.id}>
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
                    {m.home.leadCount(count)}
                    {project.promptState === "copied" && (
                      <span className="badge">{m.home.pendingResponse}</span>
                    )}
                  </span>
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
