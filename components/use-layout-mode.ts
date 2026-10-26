'use client';

import {useSyncExternalStore} from 'react';

/**
 * How overlays open at this width: beside the text in the margin rail,
 * as a popover, or as a bottom sheet on phones.
 */
export type LayoutMode = 'rail' | 'popover' | 'sheet';

const RAIL = '(min-width: 70rem)';
const POPOVER = '(min-width: 48rem)';

function subscribe(onChange: () => void) {
  const queries = [RAIL, POPOVER].map(query => matchMedia(query));
  queries.forEach(query => query.addEventListener('change', onChange));
  return () =>
    queries.forEach(query => query.removeEventListener('change', onChange));
}

function currentMode(): LayoutMode {
  if (matchMedia(RAIL).matches) return 'rail';
  return matchMedia(POPOVER).matches ? 'popover' : 'sheet';
}

export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribe, currentMode, (): LayoutMode => 'rail');
}
