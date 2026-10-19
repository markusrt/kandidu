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

/** A failed write waiting for the person to retry it or give up (FR-040). */
export interface WriteFailure {
  readonly text: string;
  readonly id: number;
  retry(): void;
  dismiss(): void;
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
   * A retryable failure keeps the promise (and the write queue) open until
   * the person retries, which resolves with the retry's outcome, or cancels.
   */
  commit(
    write: (store: KandiduStore) => Promise<void>,
    update: (snapshot: AppSnapshot) => AppSnapshot,
    success?: string,
  ): Promise<boolean>;
  announce(text: string): void;
  fail(cause: unknown): void;
  clearNotice(): void;
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
  const [state, setState] = useState<LoadState>({ kind: "loading" });
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
  }, [store]);

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
      setBusy(false);
    }
  }, [store, show, m]);

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
        show("status", m.backup.imported);
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    [store, show, m],
  );

  // Writes run one after another: a write requested while another is running
  // waits instead of being dropped (an autosave must never vanish silently).
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);

  const commit = useCallback<AppContextValue["commit"]>(
    (write, update, success) => {
      pending.current += 1;
      setBusy(true);
      const attempt = async (): Promise<boolean> => {
        try {
          await write(store);
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
          return new Promise<boolean>((resolve) => {
            counter.current += 1;
            setFailure({
              text: errorMessage(cause, m),
              id: counter.current,
              retry: () => {
                setFailure(undefined);
                resolve(attempt());
              },
              dismiss: () => {
                setFailure(undefined);
                resolve(false);
              },
            });
          });
        }
        setState((current) =>
          current.kind === "ready"
            ? { kind: "ready", snapshot: update(current.snapshot) }
            : current,
        );
        if (success) show("status", success);
        return true;
      };
      const run = async () => {
        try {
          return await attempt();
        } finally {
          pending.current -= 1;
          if (pending.current === 0) setBusy(false);
        }
      };
      const result = queue.current.then(run, run);
      queue.current = result;
      return result;
    },
    [store, show, m],
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
