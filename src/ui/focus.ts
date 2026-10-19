/**
 * Ref callback that focuses an element once, when it appears. Its identity
 * is stable, so React does not call it again on re-renders (an inline arrow
 * would pull focus back on every render). Used where the control that opened
 * a confirmation disappears or gets disabled.
 */
export function focusOnMount(element: HTMLElement | null): void {
  element?.focus();
}
