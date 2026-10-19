import { type FormEvent, useId, useState } from "react";
import {
  APPLICATION_CHANNELS,
  type ApplicationChannel,
  LEAD_LIMITS,
  type Lead,
  LeadError,
  reviseLead,
} from "../../domain/lead";
import { letterPosition, suggestedSalutation } from "../../domain/letterData";
import {
  exceedsMotivationLimit,
  splitParagraphs,
} from "../../domain/motivation";
import { letterFormatter, useMessages } from "../i18n";
import { LazyMarkdown } from "../LazyMarkdown";
import { useApp, useSnapshot } from "../state";
import { nowIso } from "../time";
import { useUnsavedGuard } from "../unsaved";
import { draftFromForm, formFromLead, type LeadForm } from "./leadForm";

type TextKey = {
  [K in keyof LeadForm]: LeadForm[K] extends string ? K : never;
}[keyof LeadForm];

export function ReviewStep({ lead }: { lead: Lead }) {
  const m = useMessages();
  const { commit, busy } = useApp();
  const project = useSnapshot().projects.find((p) => p.id === lead.projectId);
  const [form, setForm] = useState<LeadForm>(() => formFromLead(lead));
  const [invalid, setInvalid] = useState(false);
  const [preview, setPreview] = useState({ process: false, research: false });
  const idBase = useId();
  const locked = lead.status !== "review";
  const invalidId = `${idBase}-invalid`;
  const dirty =
    !locked && JSON.stringify(form) !== JSON.stringify(formFromLead(lead));
  useUnsavedGuard(dirty, m.common.unsavedConfirm);

  function set<K extends keyof LeadForm>(key: K, value: LeadForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function field(
    key: TextKey,
    label: string,
    max: number,
    type: "text" | "url" | "email" | "tel" = "text",
    required = false,
    hint?: string,
  ) {
    const id = `${idBase}-${key}`;
    const flagged = required && invalid && !form[key].trim();
    const describedBy =
      [hint ? `${id}-hint` : "", flagged ? invalidId : ""]
        .filter(Boolean)
        .join(" ") || undefined;
    return (
      <div className="field" key={key}>
        <label htmlFor={id}>
          {label}
          {required && <span className="hint"> ({m.common.required})</span>}
        </label>
        <input
          id={id}
          type={type}
          value={form[key]}
          maxLength={max}
          aria-required={required ? true : undefined}
          aria-invalid={flagged ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => set(key, event.target.value)}
        />
        {hint && (
          <p id={`${id}-hint`} className="hint">
            {hint}
          </p>
        )}
      </div>
    );
  }

  function longText(key: "process" | "research", heading: string, max: number) {
    const id = `${idBase}-${key}`;
    const showing = preview[key];
    return (
      <div className="field-group">
        <label htmlFor={id} className="group-label">
          {heading}
        </label>
        <p id={`${id}-hint`} className="hint">
          {m.review.markdownHint}
        </p>
        {showing ? (
          <section aria-label={m.review.previewLabel(heading)}>
            <LazyMarkdown text={form[key]} />
          </section>
        ) : (
          <div className="field">
            <textarea
              id={id}
              rows={8}
              value={form[key]}
              maxLength={max}
              aria-describedby={`${id}-hint`}
              onChange={(event) => set(key, event.target.value)}
            />
          </div>
        )}
        <button
          type="button"
          className="secondary"
          onClick={() => setPreview({ ...preview, [key]: !showing })}
        >
          {showing ? m.review.showEditor : m.review.showPreview}
        </button>
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setInvalid(false);
    let next: Lead;
    try {
      next = reviseLead(
        lead,
        draftFromForm(form),
        {
          salutationOverride: form.salutationOverride,
          letterPosition: form.letterPosition,
        },
        nowIso(),
      );
    } catch (cause) {
      if (cause instanceof LeadError) {
        setInvalid(true);
        return;
      }
      throw cause;
    }
    await commit(
      (store) => store.saveLeads([next]),
      (s) => ({
        ...s,
        leads: s.leads.map((l) => (l.id === next.id ? next : l)),
      }),
      m.common.saved,
    );
  }

  const paragraphs = splitParagraphs(form.motivation).length;
  const motivationId = `${idBase}-motivation`;
  const channelId = `${idBase}-channel`;
  const salutationId = `${idBase}-contactSalutation`;
  const suggestion = suggestedSalutation(
    draftFromForm(form),
    letterFormatter(m),
  );
  // What `{Stelle}` becomes while the lead's own field is empty (FR-049).
  const { letterPosition: _own, ...withoutOwn } = lead;
  const inherited = letterPosition(
    { ...withoutOwn, ...draftFromForm(form) },
    project,
  );

  return (
    <>
      <h1>{m.review.heading}</h1>
      {locked && <p className="warning">{m.lead.lockedNotice}</p>}
      <form
        className="card"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <fieldset disabled={locked}>
          <fieldset>
            <legend>{m.review.positionHeading}</legend>
            {field(
              "positionTitle",
              m.review.positionTitle,
              LEAD_LIMITS.positionTitle,
              "text",
              true,
            )}
            {field(
              "referenceNumber",
              m.review.referenceNumber,
              LEAD_LIMITS.shortText,
            )}
            {field("location", m.review.location, LEAD_LIMITS.shortText)}
            {field("startDate", m.review.startDate, LEAD_LIMITS.shortText)}
            {field(
              "employmentType",
              m.review.employmentType,
              LEAD_LIMITS.shortText,
            )}
            {field("sourceUrl", m.review.sourceUrl, LEAD_LIMITS.url, "url")}
            {field(
              "letterPosition",
              m.review.letterPosition,
              LEAD_LIMITS.letterPosition,
              "text",
              false,
              m.review.letterPositionHint(inherited),
            )}
          </fieldset>

          <fieldset>
            <legend>{m.review.companyHeading}</legend>
            {field(
              "companyName",
              m.review.companyName,
              LEAD_LIMITS.companyName,
              "text",
              true,
            )}
            {field("companyWebsite", m.review.website, LEAD_LIMITS.url, "url")}
            {field("companyStreet", m.review.street, LEAD_LIMITS.shortText)}
            <div className="field-grid">
              {field(
                "companyPostalCode",
                m.review.postalCode,
                LEAD_LIMITS.shortText,
              )}
              {field("companyCity", m.review.city, LEAD_LIMITS.shortText)}
              {field("companyCountry", m.review.country, LEAD_LIMITS.shortText)}
            </div>
          </fieldset>

          <fieldset>
            <legend>{m.review.contactHeading}</legend>
            <div className="field">
              <label htmlFor={salutationId}>{m.review.salutation}</label>
              <select
                id={salutationId}
                value={form.contactSalutation}
                onChange={(event) =>
                  set(
                    "contactSalutation",
                    event.target.value === "Frau"
                      ? "Frau"
                      : event.target.value === "Herr"
                        ? "Herr"
                        : "",
                  )
                }
              >
                <option value="">{m.review.salutationNone}</option>
                <option value="Frau">{m.review.salutationFemale}</option>
                <option value="Herr">{m.review.salutationMale}</option>
              </select>
            </div>
            {field("contactTitle", m.review.title, LEAD_LIMITS.shortText)}
            {field(
              "contactFirstName",
              m.review.firstName,
              LEAD_LIMITS.shortText,
            )}
            {field("contactLastName", m.review.lastName, LEAD_LIMITS.shortText)}
            {field("contactRole", m.review.role, LEAD_LIMITS.shortText)}
            {field(
              "contactEmail",
              m.review.email,
              LEAD_LIMITS.shortText,
              "email",
            )}
            {field(
              "contactPhone",
              m.review.phone,
              LEAD_LIMITS.shortText,
              "tel",
            )}
          </fieldset>

          <fieldset>
            <legend>{m.review.applicationHeading}</legend>
            <div className="field">
              <label htmlFor={channelId}>{m.review.channel}</label>
              <select
                id={channelId}
                value={form.channel}
                onChange={(event) => {
                  const channel = APPLICATION_CHANNELS.find(
                    (candidate) => candidate === event.target.value,
                  );
                  if (channel) set("channel", channel as ApplicationChannel);
                }}
              >
                {APPLICATION_CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {m.review.channels[channel]}
                  </option>
                ))}
              </select>
            </div>
            {field("portalUrl", m.review.portalUrl, LEAD_LIMITS.url, "url")}
            {field(
              "applicationEmail",
              m.review.applicationEmail,
              LEAD_LIMITS.shortText,
              "email",
            )}
            <fieldset>
              <legend>{m.review.postalHeading}</legend>
              {field("postalStreet", m.review.street, LEAD_LIMITS.shortText)}
              <div className="field-grid">
                {field(
                  "postalPostalCode",
                  m.review.postalCode,
                  LEAD_LIMITS.shortText,
                )}
                {field("postalCity", m.review.city, LEAD_LIMITS.shortText)}
                {field(
                  "postalCountry",
                  m.review.country,
                  LEAD_LIMITS.shortText,
                )}
              </div>
            </fieldset>
            {field("deadline", m.review.deadline, LEAD_LIMITS.shortText)}
            <div className="field">
              <label htmlFor={`${idBase}-notes`}>{m.review.notes}</label>
              <textarea
                id={`${idBase}-notes`}
                rows={3}
                value={form.notes}
                maxLength={LEAD_LIMITS.notes}
                onChange={(event) => set("notes", event.target.value)}
              />
            </div>
          </fieldset>

          {longText("process", m.review.processHeading, LEAD_LIMITS.process)}
          {longText("research", m.review.researchHeading, LEAD_LIMITS.research)}

          <div className="field-group">
            <div className="field">
              <label htmlFor={motivationId} className="group-label">
                {m.review.motivationHeading}
              </label>
              <textarea
                id={motivationId}
                rows={10}
                value={form.motivation}
                maxLength={LEAD_LIMITS.motivation}
                aria-describedby={`${motivationId}-hint`}
                onChange={(event) => set("motivation", event.target.value)}
              />
              <p id={`${motivationId}-hint`} className="hint">
                {m.review.motivationHint}
              </p>
            </div>
            <p aria-live="polite">{m.review.paragraphCount(paragraphs)}</p>
            {exceedsMotivationLimit(form.motivation) && (
              <p className="warning">{m.review.tooManyParagraphs}</p>
            )}
          </div>

          <fieldset>
            <legend>{m.review.salutationHeading}</legend>
            <p>{m.review.salutationSuggestion(suggestion)}</p>
            {field(
              "salutationOverride",
              m.review.salutationOverride,
              LEAD_LIMITS.salutation,
            )}
          </fieldset>
        </fieldset>
        {invalid && (
          <p id={invalidId} role="alert" className="field-error">
            {m.review.invalid}
          </p>
        )}
        {!locked && (
          <div className="actions">
            <button type="submit" disabled={busy}>
              {m.review.saveLead}
            </button>
            {dirty && <span className="hint">{m.common.unsaved}</span>}
          </div>
        )}
      </form>
    </>
  );
}
