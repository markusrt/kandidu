import { useEffect, useRef, useState } from "react";
import {
  createItem,
  type DemoItem,
  deleteItem,
  TITLE_MAX,
  toggleItem,
} from "../domain/items";
import type { DemoStore } from "../storage/port";
import { errorMessage, useMessages } from "./i18n";

export function App({ store }: { store: DemoStore }) {
  const m = useMessages();
  const [items, setItems] = useState<DemoItem[]>([]);
  const [title, setTitle] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const locked = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  async function load() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setReady(false);
    setError("");
    setNotice("");
    try {
      setItems(await store.load());
      setReady(true);
      setNotice(m.loaded);
    } catch (cause) {
      setError(errorMessage(cause, m));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  // The injected store is stable for the lifetime of the application.
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial load only
  useEffect(() => {
    void load();
  }, []);

  async function save(next: () => DemoItem[], after?: () => void) {
    if (locked.current || !ready) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = next();
      await store.save(updated);
      setItems(updated);
      setNotice(m.saved);
      after?.();
    } catch (cause) {
      setError(errorMessage(cause, m));
    } finally {
      locked.current = false;
      setBusy(false);
      input.current?.focus();
    }
  }

  async function reset() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await store.reset();
      setItems([]);
      setTitle("");
      setReady(true);
      setConfirmReset(false);
      setNotice(m.resetDone);
    } catch (cause) {
      setError(errorMessage(cause, m));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">{m.eyebrow}</p>
        <h1>{m.heading}</h1>
        <p>{m.intro}</p>
      </header>
      <section aria-labelledby="demo-heading" aria-busy={busy}>
        <h2 id="demo-heading">{m.listHeading}</h2>
        <p>{m.listNote}</p>
        <p role="status">{busy ? m.working : notice}</p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!ready && !busy && (
          <button type="button" onClick={() => void load()}>
            {m.retryLoading}
          </button>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(
              () => createItem(items, title, crypto.randomUUID()),
              () => setTitle(""),
            );
          }}
        >
          <label htmlFor="title">{m.newItemLabel}</label>
          <div className="entry">
            <input
              ref={input}
              id="title"
              value={title}
              maxLength={TITLE_MAX}
              required
              disabled={!ready || busy}
              onChange={(event) => setTitle(event.target.value)}
            />
            <button disabled={!ready || busy || !title.trim()} type="submit">
              {m.addItem}
            </button>
          </div>
        </form>
        {ready && items.length === 0 && <p>{m.empty}</p>}
        {ready && (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <label className="item">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={busy}
                    onChange={() => void save(() => toggleItem(items, item.id))}
                  />
                  <span className={item.completed ? "completed" : ""}>
                    {item.title}
                  </span>
                </label>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={m.deleteItemLabel(item.title)}
                  onClick={() => void save(() => deleteItem(items, item.id))}
                >
                  {m.deleteItem}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer>
        {confirmReset ? (
          <div>
            <p>{m.resetPrompt}</p>
            <button type="button" disabled={busy} onClick={() => void reset()}>
              {m.confirmReset}
            </button>{" "}
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmReset(false)}
            >
              {m.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmReset(true)}
          >
            {m.resetData}
          </button>
        )}
        <p>{m.footerNote}</p>
      </footer>
    </main>
  );
}
