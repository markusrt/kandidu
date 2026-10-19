import { useEffect, useState } from "react";
import { type DocumentRecord, findCvDocument } from "../../domain/documents";
import { datedName } from "../../domain/fileNames";
import { buildCvData, missingValues } from "../../domain/letterData";
import { splitMissing } from "../../domain/placeholders";
import { MAX_PDF_BYTES } from "../../files/errors";
import { DOCX_MIME } from "../../files/mime";
import { downloadBytes } from "../download";
import { FileField } from "../FileField";
import {
  activeTemplateBytes,
  activeTemplateTags,
  loadDocx,
  loadPdf,
  readPicked,
} from "../files";
import { letterFormatter, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp, useSnapshot, useTask } from "../state";
import { newId, nowIso, todayIso } from "../time";

export function CvStep() {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy, store } = useApp();
  const { running, run } = useTask();
  const [missing, setMissing] = useState<readonly string[]>([]);
  const cv = findCvDocument(snapshot.documents);
  const { profile } = snapshot;

  // biome-ignore lint/correctness/useExhaustiveDependencies: recompute when the template or profile changes
  useEffect(() => {
    let cancelled = false;
    void run(async () => {
      const bytes = await activeTemplateBytes("cv", snapshot, store, m);
      const tags = await activeTemplateTags("cv", bytes);
      const found = missingValues(
        tags,
        buildCvData(profile, letterFormatter(m)),
      );
      if (!cancelled) setMissing(found);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, snapshot.templates.cv, store, m]);

  async function download() {
    await run(async () => {
      const bytes = await activeTemplateBytes("cv", snapshot, store, m);
      const { renderTemplate } = await loadDocx();
      const out = renderTemplate(
        bytes,
        buildCvData(profile, letterFormatter(m)),
      );
      downloadBytes(
        out,
        datedName(
          todayIso(),
          [
            profile?.firstName ?? "",
            profile?.lastName ?? "",
            m.letter.fileWords.cv,
          ],
          "docx",
        ),
        DOCX_MIME,
      );
    });
  }

  async function upload(file: File) {
    const checked = await run(async () => {
      const bytes = await readPicked(file, MAX_PDF_BYTES);
      const { inspectPdf } = await loadPdf();
      return { bytes, info: await inspectPdf(bytes) };
    });
    if (!checked) return;
    const record: DocumentRecord = {
      id: cv?.id ?? newId(),
      role: "cv",
      name: m.cv.defaultName,
      fileName: file.name.slice(0, 200) || `${m.cv.defaultName}.pdf`,
      tags: [],
      fileId: newId(),
      size: checked.bytes.byteLength,
      pageCount: checked.info.pageCount,
      uploadedAt: nowIso(),
    };
    await commit(
      (s) => s.saveDocument(record, checked.bytes),
      (s) => ({
        ...s,
        documents: [...s.documents.filter((d) => d.role !== "cv"), record],
      }),
      m.cv.uploaded,
    );
  }

  // Only empty required data needs a deliberate "anyway" (FR-025).
  const { required, optional } = splitMissing(missing);
  const tagList = (names: readonly string[]) => (
    <ul className="tag-list">
      {names.map((name) => (
        <li key={name}>
          <code>{`{${name}}`}</code>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <h1>{m.cv.heading}</h1>
      <p>{m.cv.intro}</p>
      <section className="card">
        {required.length > 0 && (
          <div className="warning">
            <p>{m.cv.missingHeading}</p>
            {tagList(required)}
            <p className="hint">{m.cv.missingHint}</p>
            <p>
              <Link to={{ name: "setup", step: "profil" }}>
                {m.cv.toProfile}
              </Link>
            </p>
          </div>
        )}
        {optional.length > 0 && (
          <div className="info">
            <p>{m.cv.optionalHeading}</p>
            {tagList(optional)}
            <p className="hint">{m.cv.optionalHint}</p>
            {required.length === 0 && (
              <p>
                <Link to={{ name: "setup", step: "profil" }}>
                  {m.cv.toProfile}
                </Link>
              </p>
            )}
          </div>
        )}
        <div className="actions">
          <button
            type="button"
            className={required.length > 0 ? "secondary" : undefined}
            disabled={busy || running}
            onClick={() => void download()}
          >
            {required.length > 0 ? m.cv.downloadAnyway : m.cv.downloadFilled}
          </button>
        </div>
        <p className="hint">{m.cv.pdfHowTo}</p>
      </section>
      <section className="card">
        <p>
          {cv
            ? m.cv.current(
                cv.fileName,
                m.format.pages(cv.pageCount),
                m.format.bytes(cv.size),
                m.format.timestamp(cv.uploadedAt),
              )
            : m.cv.none}
        </p>
        {cv && <p className="warning">{m.cv.replaceWarning}</p>}
        <FileField
          label={m.cv.uploadLabel}
          hint={m.fileLimits.pdf}
          accept=".pdf,application/pdf"
          disabled={busy || running}
          onFile={(file) => void upload(file)}
        />
      </section>
    </>
  );
}
