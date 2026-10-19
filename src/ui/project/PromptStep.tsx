import { useId, useMemo, useRef, useState } from "react";
import {
  isPromptChangedSinceCopy,
  markPromptCopied,
  type Project,
} from "../../domain/project";
import { useMessages } from "../i18n";
import { buildPrompt } from "../prompt";
import { Link } from "../router";
import { useApp } from "../state";
import { nowIso } from "../time";

export function PromptStep({ project }: { project: Project }) {
  const m = useMessages();
  const { commit, busy } = useApp();
  const [copyFailed, setCopyFailed] = useState(false);
  const text = useMemo(() => buildPrompt(project, m), [project, m]);
  const area = useRef<HTMLTextAreaElement>(null);
  const areaId = useId();

  async function markCopied() {
    const next = markPromptCopied(project, nowIso());
    await commit(
      (store) => store.saveProject(next),
      (s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === next.id ? next : p)),
      }),
      m.common.copied,
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setCopyFailed(true);
      area.current?.focus();
      area.current?.select();
      return;
    }
    setCopyFailed(false);
    await markCopied();
  }

  if (project.links.length === 0) {
    return (
      <>
        <h1>{m.prompt.heading}</h1>
        <p>{m.prompt.noLinks}</p>
        <Link to={{ name: "project", projectId: project.id, step: "links" }}>
          {m.project.steps.links}
        </Link>
      </>
    );
  }

  const copied = project.promptState !== "draft";
  return (
    <>
      <h1>{m.prompt.heading}</h1>
      <p>{m.prompt.intro}</p>
      {project.promptContext.trim() !== "" && (
        <p className="warning">{m.prompt.contextIncluded}</p>
      )}
      {isPromptChangedSinceCopy(project) && (
        <p className="warning">{m.prompt.changedSinceCopy}</p>
      )}
      <section className="card">
        <label htmlFor={areaId}>{m.prompt.label}</label>
        <textarea
          id={areaId}
          ref={area}
          className="prompt-text"
          readOnly
          value={text}
          rows={16}
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="actions">
          <button type="button" disabled={busy} onClick={() => void copy()}>
            {m.prompt.copy}
          </button>
        </div>
        {copyFailed && (
          <div className="confirm">
            <p>{m.prompt.copyFailed}</p>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => void markCopied()}
            >
              {m.prompt.copiedManually}
            </button>
          </div>
        )}
      </section>
      {copied && (
        <>
          <p>{m.prompt.afterCopy}</p>
          <p>
            <Link
              to={{ name: "project", projectId: project.id, step: "antwort" }}
              className="button"
            >
              {m.prompt.toResponse}
            </Link>
          </p>
        </>
      )}
    </>
  );
}
