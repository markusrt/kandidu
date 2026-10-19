import { useEffect, useId, useRef, useState } from "react";
import type { DocumentRecord } from "../../domain/documents";
import type { PackageDef, PackageItem } from "../../domain/lead";
import { addItem, itemKey, moveItem, removeItem } from "../../domain/packages";
import { tagsInUse } from "../../domain/tags";
import { type Messages, useMessages } from "../i18n";
import { Link } from "../router";
import { useApp } from "../state";

export function itemLabel(
  item: PackageItem,
  m: Messages,
  documents: readonly DocumentRecord[],
): string {
  if (item.kind === "coverLetter") return m.package.items.coverLetter;
  if (item.kind === "cv") return m.package.items.cv;
  const name =
    documents.find((d) => d.id === item.documentId)?.name ?? item.documentId;
  return m.package.items.document(name);
}

/** Edits one package PDF: file name, items, order, evidence (FR-030). */
export function PackageEditor({
  definition,
  onChange,
  documents,
  disabled,
}: {
  definition: PackageDef;
  onChange: (next: PackageDef) => void;
  documents: readonly DocumentRecord[];
  disabled: boolean;
}) {
  const m = useMessages();
  const { announce } = useApp();
  const nameId = useId();
  const filterId = useId();
  const addId = useId();
  const [tag, setTag] = useState("");
  const [choice, setChoice] = useState("");
  // A removed item's button is gone; focus moves to where it can be added
  // back (or to the add group when the filter hides it).
  const focusAfterRemove = useRef(false);
  const addSelect = useRef<HTMLSelectElement>(null);
  const addGroup = useRef<HTMLFieldSetElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after a removal re-rendered the items
  useEffect(() => {
    if (!focusAfterRemove.current) return;
    focusAfterRemove.current = false;
    (addSelect.current ?? addGroup.current)?.focus();
  }, [definition.items]);

  const evidence = documents.filter((d) => d.role === "evidence");
  const present = new Set(definition.items.map(itemKey));
  const candidates: PackageItem[] = [
    { kind: "coverLetter" } as const,
    { kind: "cv" } as const,
    ...evidence
      .filter((d) => tag === "" || d.tags.includes(tag))
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .map((d) => ({ kind: "document" as const, documentId: d.id })),
  ].filter((item) => !present.has(itemKey(item)));
  const selected =
    candidates.find((item) => itemKey(item) === choice) ?? candidates[0];
  const label = (item: PackageItem) => itemLabel(item, m, documents);
  const isMissing = (item: PackageItem) =>
    item.kind === "document" &&
    !documents.some((d) => d.id === item.documentId);

  function add() {
    if (!selected) return;
    onChange(addItem(definition, selected));
    setChoice("");
    announce(m.package.added(label(selected)));
  }

  return (
    <>
      <div className="field">
        <label htmlFor={nameId}>{m.package.fileNameLabel}</label>
        <input
          id={nameId}
          value={definition.fileName}
          maxLength={200}
          onChange={(event) =>
            onChange({ ...definition, fileName: event.target.value })
          }
        />
      </div>
      <h3>{m.package.itemsLabel}</h3>
      <ol className="item-list package-items">
        {definition.items.map((item, index) => {
          const text = label(item);
          return (
            <li key={itemKey(item)}>
              <span>
                {text}
                {isMissing(item) && (
                  <span className="field-error">
                    {" "}
                    {m.package.documentMissing(text)}
                  </span>
                )}
              </span>
              <span className="actions compact">
                <button
                  type="button"
                  className="secondary small"
                  aria-label={m.package.moveUp(text)}
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveItem(definition, index, -1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="secondary small"
                  aria-label={m.package.moveDown(text)}
                  disabled={disabled || index === definition.items.length - 1}
                  onClick={() => onChange(moveItem(definition, index, 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="secondary small"
                  aria-label={m.package.removeItem(text)}
                  disabled={disabled || definition.items.length <= 1}
                  onClick={() => {
                    focusAfterRemove.current = true;
                    onChange(removeItem(definition, index));
                  }}
                >
                  ✕
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {definition.items.length <= 1 && (
        <p className="hint">{m.package.lastItemHint}</p>
      )}
      <fieldset className="field-group" ref={addGroup} tabIndex={-1}>
        <legend className="group-label">{m.package.addHeading}</legend>
        {evidence.length === 0 ? (
          <p className="hint">
            {m.package.noEvidence}{" "}
            <Link to={{ name: "setup", step: "nachweise" }}>
              {m.package.toEvidence}
            </Link>
          </p>
        ) : (
          <div className="field">
            <label htmlFor={filterId}>{m.package.tagFilter}</label>
            <select
              id={filterId}
              value={tag}
              onChange={(event) => {
                setTag(event.target.value);
                setChoice("");
              }}
            >
              <option value="">{m.package.tagFilterAll}</option>
              {tagsInUse(evidence).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
        {candidates.length === 0 ? (
          <p className="hint">{m.package.nothingToAdd}</p>
        ) : (
          <div className="inline-form">
            <div className="field">
              <label htmlFor={addId}>{m.package.addLabel}</label>
              <select
                id={addId}
                ref={addSelect}
                value={selected ? itemKey(selected) : ""}
                onChange={(event) => setChoice(event.target.value)}
              >
                {candidates.map((item) => (
                  <option key={itemKey(item)} value={itemKey(item)}>
                    {label(item)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="secondary"
              disabled={disabled || !selected}
              onClick={add}
            >
              {m.package.addButton}
            </button>
          </div>
        )}
      </fieldset>
    </>
  );
}
