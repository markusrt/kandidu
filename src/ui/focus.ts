import { useEffect, useRef } from "react";

/**
 * Ref callback that focuses an element once, when it appears. Its identity
 * is stable, so React does not call it again on re-renders (an inline arrow
 * would pull focus back on every render). Used where the control that opened
 * a confirmation disappears or gets disabled.
 */
export function focusOnMount(element: HTMLElement | null): void {
  element?.focus();
}

/**
 * For an inline confirmation that replaces its opening button: `opener` goes
 * on that button; call `returnFocus()` when cancelling, and focus moves back
 * to the button once it is rendered again (never to `<body>`).
 */
export function useReturnFocus(open: boolean) {
  const opener = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  useEffect(() => {
    if (open || !pending.current) return;
    pending.current = false;
    opener.current?.focus();
  }, [open]);
  return {
    opener,
    returnFocus: () => {
      pending.current = true;
    },
  };
}
