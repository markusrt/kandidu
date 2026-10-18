import { useEffect } from "react";

/**
 * Asks before leaving a form with unsaved edits: on in-app link clicks (hash
 * routes) and when the tab is closed or reloaded.
 */
export function useUnsavedGuard(dirty: boolean, question: string): void {
  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest?.("a[href^='#']");
      if (!link || link.getAttribute("href") === window.location.hash) return;
      if (!window.confirm(question)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, question]);
}
