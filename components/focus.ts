/**
 * Whether a closing panel may move focus. Panels hand focus back after their
 * exit animation; by then the reader may have opened something else, and
 * taking focus from it would close it.
 */
export function mayReturnFocus(event: Event): boolean {
  const active = document.activeElement;
  const closing = event.target instanceof Element ? event.target : null;
  return (
    !active || active === document.body || Boolean(closing?.contains(active))
  );
}
