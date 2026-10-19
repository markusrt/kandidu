import { useId, useRef } from "react";
import {
  LEAD_LIMITS,
  type LeadLinkField,
  type LeadLinkIssue,
} from "../../domain/lead";
import { isHttpUrl } from "../../domain/profile";
import { useMessages } from "../i18n";
import type { LeadForm, SourceRow } from "./leadForm";

// "Links" block at the top of the lead review (FR-050, C2 feedback R1).

const FIXED: readonly LeadLinkField[] = [
  "sourceUrl",
  "originalPostingUrl",
  "portalUrl",
  "companyWebsite",
];

let rowCounter = 0;

/** Row index in the form for the n-th source of the draft (empty rows are skipped there). */
function rowOfSource(rows: readonly SourceRow[], source: number): number {
  let seen = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && (row.title.trim() || row.url.trim())) seen += 1;
    if (seen === source) return i;
  }
  return -1;
}

function OpenLink({ url, label }: { url: string; label: string }) {
  const m = useMessages();
  if (!isHttpUrl(url.trim())) return null;
  return (
    <a
      href={url.trim()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={m.review.links.openLabel(label)}
    >
      {m.review.links.open}
    </a>
  );
}

export function LeadLinks({
  form,
  locked,
  issues,
  showIssues,
  onChange,
}: {
  form: LeadForm;
  locked: boolean;
  issues: readonly LeadLinkIssue[];
  /** Field errors are shown once a save was attempted. */
  showIssues: boolean;
  onChange: (patch: Partial<LeadForm>) => void;
}) {
  const m = useMessages();
  const t = m.review.links;
  const idBase = useId();
  const addButton = useRef<HTMLButtonElement>(null);
  const focusRow = useRef<string>(undefined);

  const labels: Record<LeadLinkField, string> = {
    sourceUrl: t.sourceUrl,
    originalPostingUrl: t.originalPostingUrl,
    portalUrl: t.portalUrl,
    companyWebsite: t.companyWebsite,
  };

  function issueFor(field: LeadLinkField | number): string | undefined {
    if (!showIssues) return undefined;
    const issue = issues.find((candidate) =>
      typeof field === "number"
        ? typeof candidate.field === "object" &&
          rowOfSource(form.sources, candidate.field.source) === field
        : candidate.field === field,
    );
    return issue ? t.errors[issue.code] : undefined;
  }

  function setRow(index: number, patch: Partial<SourceRow>) {
    onChange({
      sources: form.sources.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  }

  function addRow() {
    rowCounter += 1;
    const key = `new-${rowCounter}`;
    focusRow.current = key;
    onChange({ sources: [...form.sources, { key, title: "", url: "" }] });
  }

  function removeRow(index: number) {
    onChange({ sources: form.sources.filter((_, i) => i !== index) });
    // The removed row's button is gone; keep focus in the block.
    addButton.current?.focus();
  }

  if (locked) {
    const fixed = FIXED.map((field) => [field, form[field].trim()] as const)
      .filter(([, url]) => url)
      .map(([field, url]) => ({ label: labels[field], url }));
    const sources = form.sources
      .filter((row) => row.url.trim())
      .map((row) => ({
        label: row.title.trim() || row.url.trim(),
        url: row.url,
      }));
    return (
      <fieldset className="lead-links">
        <legend>{t.heading}</legend>
        {fixed.length + sources.length === 0 ? (
          <p>{t.none}</p>
        ) : (
          <ul className="item-list">
            {[...fixed, ...sources].map(({ label, url }) => (
              <li key={`${label}-${url}`}>
                <span>
                  {label}
                  <br />
                  <span className="url">{url}</span>
                </span>
                <OpenLink url={url} label={label} />
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    );
  }

  return (
    <fieldset className="lead-links">
      <legend>{t.heading}</legend>
      <p className="warning">{t.checkNotice}</p>
      {FIXED.map((field) => {
        const id = `${idBase}-${field}`;
        const error = issueFor(field);
        return (
          <div className="field" key={field}>
            <label htmlFor={id}>{labels[field]}</label>
            <input
              id={id}
              type="url"
              inputMode="url"
              value={form[field]}
              maxLength={LEAD_LIMITS.url}
              placeholder="https://"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => onChange({ [field]: event.target.value })}
            />
            {error && (
              <p id={`${id}-error`} className="field-error">
                {error}
              </p>
            )}
            <OpenLink url={form[field]} label={labels[field]} />
          </div>
        );
      })}

      <fieldset>
        <legend>{t.sourcesHeading}</legend>
        {form.sources.length === 0 && <p>{t.noSources}</p>}
        <ol className="source-list">
          {form.sources.map((row, index) => {
            const id = `${idBase}-source-${row.key}`;
            const n = index + 1;
            const error = issueFor(index);
            return (
              <li key={row.key}>
                <div className="field">
                  <label htmlFor={`${id}-title`}>{t.sourceTitle(n)}</label>
                  <input
                    id={`${id}-title`}
                    value={row.title}
                    maxLength={LEAD_LIMITS.sourceTitle}
                    onChange={(event) =>
                      setRow(index, { title: event.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${id}-url`}>{t.sourceRowUrl(n)}</label>
                  <input
                    id={`${id}-url`}
                    type="url"
                    inputMode="url"
                    value={row.url}
                    maxLength={LEAD_LIMITS.url}
                    placeholder="https://"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    ref={(element) => {
                      if (element && focusRow.current === row.key) {
                        focusRow.current = undefined;
                        element.focus();
                      }
                    }}
                    onChange={(event) =>
                      setRow(index, { url: event.target.value })
                    }
                  />
                  {error && (
                    <p id={`${id}-error`} className="field-error">
                      {error}
                    </p>
                  )}
                </div>
                <span className="actions compact">
                  <OpenLink
                    url={row.url}
                    label={row.title || t.sourceLabel(n)}
                  />
                  <button
                    type="button"
                    className="secondary small"
                    aria-label={t.removeSource(n)}
                    onClick={() => removeRow(index)}
                  >
                    {t.remove}
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className="secondary"
          ref={addButton}
          disabled={form.sources.length >= LEAD_LIMITS.sources}
          aria-describedby={`${idBase}-sources-hint`}
          onClick={addRow}
        >
          {t.addSource}
        </button>
        <p id={`${idBase}-sources-hint`} className="hint">
          {t.sourcesHint(LEAD_LIMITS.sources)}
        </p>
      </fieldset>
    </fieldset>
  );
}
