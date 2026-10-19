import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AppSnapshot, KandiduStore } from "../storage/port";
import { errorCode, errorMessage, useMessages } from "./i18n";
import type { ErrorCode } from "./i18n/messages";
import { navigate } from "./router";

// App state: the validated snapshot from the store. Every change is written
// first and applied to the snapshot only after the write succeeded (FR-040).

/** Write failures worth retrying as they are; others need a reload or a fix. */
const RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  "save-failed",
  "quota-exceeded",
  "delete-failed",
]);

export type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly snapshot: AppSnapshot }
  | { readonly kind: "failed"; readonly cause: unknown };

export interface Notice {
  readonly kind: "status" | "error";
  readonly text: string;
  readonly id: number;
}

/**
 * A failed write (FR-040). The form keeps its input; `retry` repeats the
 * person's own action (button or form) so it runs on the current state,
 * never on the state the failed write was built from.
 */
export interface WriteFailure {
  readonly text: string;
  readonly id: number;
  readonly retry: (() => void) | undefined;
  dismiss(): void;
  /** Puts focus back on the control that started the write if it was lost. */
  keepFocus(): void;
}

export interface CommitOptions {
  /** An autosave: it retries itself on the next change, so no retry button. */
  readonly background?: boolean;
}

/** How to repeat the action that started a write, if it can be repeated. */
function repeatAction(trigger: Element | null): (() => void) | undefined {
  if (trigger instanceof HTMLButtonElement) {
    return () => {
      trigger.focus();
      trigger.click();
    };
  }
  if (
    trigger instanceof HTMLInputElement &&
    trigger.form &&
    !["file", "checkbox", "radio"].includes(trigger.type)
  ) {
    const form = trigger.form;
    return () => {
      trigger.focus();
      form.requestSubmit();
    };
  }
  return undefined;
}

function refocus(trigger: Element | null): void {
  if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
  else document.getElementById("main")?.focus();
}

interface AppContextValue {
  readonly state: LoadState;
  readonly store: KandiduStore;
  readonly busy: boolean;
  readonly stale: boolean;
  readonly notice: Notice | undefined;
  readonly failure: WriteFailure | undefined;
  reload(): Promise<void>;
  reset(): Promise<void>;
  /** Replaces everything with a backup; throws the store error on failure. */
  restore(zip: Uint8Array): Promise<void>;
  /**
   * Runs `write` against the store and, only if it succeeds, applies `update`
   * to the snapshot and announces `success`. Returns whether it succeeded;
   * failures are announced and leave the snapshot (and form input) untouched.
   * A retryable failure opens a `WriteFailure`; the queue goes on, so the
   * person can free space or export a backup before retrying.
   */
  commit(
    /** `snapshot` is the state after all earlier writes, when this one runs. */
    write: (
      store: KandiduStore,
      snapshot: AppSnapshot | undefined,
    ) => Promise<void>,
    update: (snapshot: AppSnapshot) => AppSnapshot,
    success?: string,
    options?: CommitOptions,
  ): Promise<boolean>;
  announce(text: string): void;
  fail(cause: unknown): void;
  clearNotice(): void;
  /** Closes an open write failure, e.g. when its view is left. */
  clearFailure(): void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({
  store,
  children,
}: {
  store: KandiduStore;
  children: ReactNode;
}) {
  const m = useMessages();
  const [state, setLoadState] = useState<LoadState>({ kind: "loading" });
  // The state after the last finished write, ahead of React's render, so a
  // queued write can build on it (an autosave must not undo an import).
  const latestState = useRef<LoadState>(state);
  const setState = useCallback((next: LoadState) => {
    latestState.current = next;
    setLoadState(next);
  }, []);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [notice, setNotice] = useState<Notice>();
  const [failure, setFailure] = useState<WriteFailure>();
  const locked = useRef(false);
  const counter = useRef(0);

  const show = useCallback((kind: Notice["kind"], text: string) => {
    counter.current += 1;
    setNotice({ kind, text, id: counter.current });
  }, []);

  const announce = useCallback((text: string) => show("status", text), [show]);
  const fail = useCallback(
    (cause: unknown) => show("error", errorMessage(cause, m)),
    [show, m],
  );

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const snapshot = await store.load();
      setState({ kind: "ready", snapshot });
      setStale(false);
    } catch (cause) {
      setState({ kind: "failed", cause });
    }
  }, [store, setState]);

  // Writes run one after another: a write requested while another is running
  // waits instead of being dropped (an autosave must never vanish silently).
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const settleBusy = useCallback(
    () => setBusy(pending.current > 0 || locked.current),
    [],
  );

  const reset = useCallback(async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await store.resetAll();
      const snapshot = await store.load();
      setState({ kind: "ready", snapshot });
      setStale(false);
      // The current route may point at data that no longer exists.
      navigate({ name: "home" });
      show("status", m.recovery.resetDone);
    } catch (cause) {
      show("error", errorMessage(cause, m));
    } finally {
      locked.current = false;
      settleBusy();
    }
  }, [store, show, m, settleBusy, setState]);

  const restore = useCallback(
    async (zip: Uint8Array) => {
      if (locked.current) return;
      locked.current = true;
      setBusy(true);
      try {
        // The adapter validates the whole backup before it writes (FR-043).
        const snapshot = await store.importBackup(zip);
        setState({ kind: "ready", snapshot });
        setStale(false);
        setFailure(undefined);
        // The current route may point at data the backup does not have.
        navigate({ name: "home" });
        show("status", m.backup.imported);
      } finally {
        locked.current = false;
        settleBusy();
      }
    },
    [store, show, m, settleBusy, setState],
  );

  const commit = useCallback<AppContextValue["commit"]>(
    (write, update, success, options = {}) => {
      // Commits start synchronously from the handler of the person's action.
      const trigger = options.background ? null : document.activeElement;
      pending.current += 1;
      setBusy(true);
      const run = async (): Promise<boolean> => {
        try {
          const before = latestState.current;
          await write(
            store,
            before.kind === "ready" ? before.snapshot : undefined,
          );
        } catch (cause) {
          const code = errorCode(cause);
          // Another tab wrote first: only a reload helps (FR-044).
          if (code === "conflict") setStale(true);
          if (!RETRYABLE.has(code)) {
            show("error", errorMessage(cause, m));
            return false;
          }
          // Nothing may look saved while the failure is open.
          setNotice(undefined);
          counter.current += 1;
          const repeat = repeatAction(trigger);
          let settled = false;
          const opened: WriteFailure = {
            text: errorMessage(cause, m),
            id: counter.current,
            retry: repeat
              ? () => {
                  if (settled) return;
                  settled = true;
                  setFailure(undefined);
                  repeat();
                }
              : undefined,
            dismiss: () => {
              settled = true;
              setFailure(undefined);
              refocus(trigger);
            },
            // A button disabled during the write loses focus to <body>.
            keepFocus: () => {
              const active = document.activeElement;
              if (active === null || active === document.body) refocus(trigger);
            },
          };
          // A failed autosave never hides the retry of the person's action.
          setFailure((open) =>
            options.background && open?.retry ? open : opened,
          );
          return false;
        } finally {
          pending.current -= 1;
          settleBusy();
        }
        const after = latestState.current;
        if (after.kind === "ready") {
          setState({ kind: "ready", snapshot: update(after.snapshot) });
        }
        if (!options.background) setFailure(undefined);
        if (success) show("status", success);
        return true;
      };
      const result = queue.current.then(run, run);
      queue.current = result;
      return result;
    },
    [store, show, m, settleBusy, setState],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => store.onExternalChange(() => setStale(true)), [store]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      store,
      busy,
      stale,
      notice,
      failure,
      reload,
      reset,
      restore,
      commit,
      announce,
      fail,
      clearNotice: () => setNotice(undefined),
      clearFailure: () => setFailure(undefined),
    }),
    [
      state,
      store,
      busy,
      stale,
      notice,
      failure,
      reload,
      reset,
      restore,
      commit,
      announce,
      fail,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp outside AppProvider");
  return value;
}

/** The loaded snapshot; only call below the ready state (see App). */
export function useSnapshot(): AppSnapshot {
  const { state } = useApp();
  if (state.kind !== "ready") throw new Error("snapshot not ready");
  return state.snapshot;
}

/** Runs async work with busy-state and error reporting (for reads/downloads). */
export function useTask() {
  const { fail } = useApp();
  const [running, setRunning] = useState(false);
  const run = useCallback(
    async <T,>(work: () => Promise<T>): Promise<T | undefined> => {
      setRunning(true);
      try {
        return await work();
      } catch (cause) {
        fail(cause);
        return undefined;
      } finally {
        setRunning(false);
      }
    },
    [fail],
  );
  return { running, run };
}
