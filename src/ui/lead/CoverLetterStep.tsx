import { useEffect, useState } from "react";
import { datedName } from "../../domain/fileNames";
import type { Lead } from "../../domain/lead";
import { buildCoverLetterData, missingValues } from "../../domain/letterData";
import { DOCX_MIME } from "../../files/mime";
import { downloadBytes } from "../download";
import { activeTemplateBytes, activeTemplateTags, loadDocx } from "../files";
import { letterFormatter, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp, useSnapshot, useTask } from "../state";
import { todayIso } from "../time";

export function CoverLetterStep({ lead }: { lead: Lead }) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { busy, store, announce } = useApp();
  const { running, run } = useTask();
  const [missing, setMissing] = useState<readonly string[]>([]);
  const { profile } = snapshot;
  const project = snapshot.projects.find((p) => p.id === lead.projectId);
  const letterData = () =>
    buildCoverLetterData(
      profile,
      project,
      lead,
      todayIso(),
      letterFormatter(m),
    );

  // biome-ignore lint/correctness/useExhaustiveDependencies: recompute when the template, lead or profile changes
  useEffect(() => {
    let cancelled = false;
    void run(async () => {
      const bytes = await activeTemplateBytes(
        "coverLetter",
        snapshot,
        store,
        m,
      );
      const tags = await activeTemplateTags("coverLetter", bytes);
      const found = missingValues(tags, letterData());
      if (!cancelled) setMissing(found);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, project, lead, snapshot.templates.coverLetter, store, m]);

  async function download() {
    const done = await run(async () => {
      const bytes = await activeTemplateBytes(
        "coverLetter",
        snapshot,
        store,
        m,
      );
      const { renderTemplate } = await loadDocx();
      const out = renderTemplate(bytes, letterData());
      downloadBytes(
        out,
        datedName(
          todayIso(),
          [lead.company.name, m.letter.fileWords.coverLetter],
          "docx",
        ),
        DOCX_MIME,
      );
      return true;
    });
    if (done) announce(m.coverLetter.downloaded);
  }

  return (
    <>
      <h1>{m.coverLetter.heading}</h1>
      <p>{m.coverLetter.intro}</p>
      <section className="card">
        {missing.length > 0 && (
          <div className="warning">
            <p>{m.coverLetter.missingHeading}</p>
            <ul className="tag-list">
              {missing.map((name) => (
                <li key={name}>
                  <code>{`{${name}}`}</code>
                </li>
              ))}
            </ul>
            <p className="hint">{m.coverLetter.missingHint}</p>
            <p>
              <Link
                to={{
                  name: "lead",
                  projectId: lead.projectId,
                  leadId: lead.id,
                  step: "pruefen",
                }}
              >
                {m.coverLetter.toReview}
              </Link>{" "}
              <Link to={{ name: "setup", step: "profil" }}>
                {m.coverLetter.toProfile}
              </Link>
            </p>
          </div>
        )}
        <div className="actions">
          <button
            type="button"
            className={missing.length > 0 ? "secondary" : undefined}
            disabled={busy || running}
            onClick={() => void download()}
          >
            {missing.length > 0
              ? m.coverLetter.downloadAnyway
              : m.coverLetter.download}
          </button>
        </div>
        <p className="hint">{m.coverLetter.pdfHowTo}</p>
      </section>
      <p>
        <Link
          to={{
            name: "lead",
            projectId: lead.projectId,
            leadId: lead.id,
            step: "freigabe",
          }}
          className="button"
        >
          {m.coverLetter.toGate}
        </Link>
      </p>
    </>
  );
}
