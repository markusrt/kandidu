import { useId, useState } from "react";
import {
  normalizeTag,
  normalizeTags,
  suggestTags,
  TAG_MAX,
} from "../../domain/tags";
import { errorMessage, useMessages } from "../i18n";

/**
 * The chosen tags plus text still in the input, so a tag typed without
 * Enter is not lost on save. Throws `TagError` for an invalid text.
 */
export function withPendingTag(
  tags: readonly string[],
  pending: string,
): string[] {
  const tag = normalizeTag(pending);
  return tag === "" ? [...tags] : normalizeTags([...tags, tag]);
}

/** Tag editor: chosen tags, a labeled input and suggestion buttons. */
export function TagInput({
  value,
  inUse,
  onChange,
  onPendingChange,
  disabled,
}: {
  value: readonly string[];
  inUse: readonly string[];
  onChange: (tags: string[]) => void;
  /** The text typed but not yet added; the form adds it on save. */
  onPendingChange?: (text: string) => void;
  disabled?: boolean;
}) {
  const m = useMessages();
  const id = useId();
  const [text, setTextState] = useState("");
  const [error, setError] = useState<string>();
  const suggestions = suggestTags(text, inUse, value);

  function setText(next: string) {
    setTextState(next);
    onPendingChange?.(next);
  }

  function add(raw: string) {
    try {
      const tag = normalizeTag(raw);
      setError(undefined);
      if (tag === "") return;
      onChange(normalizeTags([...value, tag]));
      setText("");
    } catch (cause) {
      setError(errorMessage(cause, m));
    }
  }

  return (
    <div className="field tag-input">
      <p id={`${id}-chosen`} className="group-label">
        {m.evidence.chosenTagsLabel}
      </p>
      {value.length === 0 ? (
        <p className="hint">{m.evidence.noTags}</p>
      ) : (
        <ul className="tag-list" aria-labelledby={`${id}-chosen`}>
          {value.map((tag) => (
            <li key={tag}>
              <span>{tag}</span>{" "}
              <button
                type="button"
                className="secondary"
                disabled={disabled}
                aria-label={m.evidence.removeTag(tag)}
                onClick={() => onChange(value.filter((t) => t !== tag))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <label htmlFor={id}>{m.evidence.tagInputLabel}</label>
      <input
        id={id}
        value={text}
        maxLength={TAG_MAX}
        disabled={disabled}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setError(undefined);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          add(text);
        }}
      />
      <p id={`${id}-hint`} className="hint">
        {m.evidence.tagInputHint}
      </p>
      {onPendingChange && text.trim() !== "" && !error && (
        <p className="hint">{m.evidence.pendingTag}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
      <p className="hint" aria-live="polite">
        {m.evidence.suggestionCount(suggestions.length)}
      </p>
      {suggestions.length > 0 && (
        <ul className="tag-list" aria-label={m.evidence.suggestionsLabel}>
          {suggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                className="secondary"
                disabled={disabled}
                aria-label={m.evidence.addTag(tag)}
                onClick={() => add(tag)}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
