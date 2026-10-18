import { type FormEvent, useId, useState } from "react";
import {
  createProfile,
  PROFILE_FIELDS,
  type ProfileField,
  type ProfileInput,
  type ProfileIssue,
  profileToInput,
  REQUIRED_PROFILE_FIELDS,
  validateProfile,
} from "../../domain/profile";
import { useMessages } from "../i18n";
import { Link } from "../router";
import { useApp, useSnapshot } from "../state";
import { nowIso, todayIso } from "../time";
import { useUnsavedGuard } from "../unsaved";

const INPUT_TYPES: Readonly<Partial<Record<ProfileField, string>>> = {
  birthDate: "date",
  email: "email",
  phone: "tel",
  website: "url",
};

// Lets browsers and password managers fill the form (WCAG 1.3.5).
const AUTOCOMPLETE: Readonly<Record<ProfileField, string>> = {
  firstName: "given-name",
  lastName: "family-name",
  street: "street-address",
  postalCode: "postal-code",
  city: "address-level2",
  phone: "tel",
  email: "email",
  birthDate: "bday",
  birthPlace: "off",
  nationality: "off",
  website: "url",
};

const GRID_FIELDS: ReadonlySet<ProfileField> = new Set([
  "street",
  "postalCode",
  "city",
  "phone",
  "email",
]);

export function ProfileStep() {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy } = useApp();
  const idBase = useId();
  const [input, setInput] = useState<ProfileInput>(() =>
    profileToInput(snapshot.profile),
  );
  const [issues, setIssues] = useState<readonly ProfileIssue[]>([]);
  const dirty =
    JSON.stringify(input) !== JSON.stringify(profileToInput(snapshot.profile));
  useUnsavedGuard(dirty, m.common.unsavedConfirm);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateProfile(input, todayIso());
    setIssues(found);
    if (found.length > 0) {
      const first = found[0];
      if (first) document.getElementById(`${idBase}-${first.field}`)?.focus();
      return;
    }
    const profile = createProfile(input, todayIso(), nowIso());
    await commit(
      (store) => store.saveProfile(profile),
      (s) => ({ ...s, profile }),
      m.common.saved,
    );
  }

  function renderField(field: ProfileField) {
    const id = `${idBase}-${field}`;
    const issue = issues.find((candidate) => candidate.field === field);
    const required = REQUIRED_PROFILE_FIELDS.has(field);
    const hint = m.profile.issueHints[field];
    return (
      <div className="field" key={field}>
        <label htmlFor={id}>
          {m.profile.fields[field]}
          {required && <span className="hint"> ({m.common.required})</span>}
        </label>
        <input
          id={id}
          type={INPUT_TYPES[field] ?? "text"}
          autoComplete={AUTOCOMPLETE[field]}
          value={input[field]}
          aria-required={required ? true : undefined}
          aria-invalid={issue ? true : undefined}
          aria-describedby={issue ? `${id}-error` : undefined}
          onChange={(event) =>
            setInput({ ...input, [field]: event.target.value })
          }
        />
        {issue && (
          <p id={`${id}-error`} className="field-error">
            {m.profile.issues[issue.code]}
            {hint ? ` ${hint}` : ""}
          </p>
        )}
      </div>
    );
  }

  const plain = PROFILE_FIELDS.filter((field) => !GRID_FIELDS.has(field));
  const grid = PROFILE_FIELDS.filter((field) => GRID_FIELDS.has(field));

  return (
    <>
      <h1>{m.profile.heading}</h1>
      <p>{m.profile.intro}</p>
      <form
        className="card"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        {issues.length > 0 && (
          <p role="alert" className="field-error">
            {m.profile.fixErrors(issues.length)}
          </p>
        )}
        {plain.slice(0, 2).map(renderField)}
        <div className="field-grid">{grid.map(renderField)}</div>
        {plain.slice(2).map(renderField)}
        <div className="actions">
          <button type="submit" disabled={busy}>
            {m.common.save}
          </button>
          {dirty && <span className="hint">{m.common.unsaved}</span>}
        </div>
      </form>
      <p>
        <Link to={{ name: "setup", step: "vorlagen" }} className="button">
          {m.common.next}
        </Link>
      </p>
    </>
  );
}
