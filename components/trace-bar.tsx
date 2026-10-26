'use client';

import type {MouseEvent, Ref} from 'react';

import {shortName} from '@/lib/report/sources.ts';

import {CloseIcon} from './close-icon.tsx';
import {useReader, type Trace} from './reader-state.tsx';

/** "Claim 3 of 29 · [1] ipss.go.jp", with previous, next and close. */
export function TraceBar({
  trace,
  ref,
}: {
  trace: Trace;
  ref: Ref<HTMLDivElement>;
}) {
  const {stepTrace, endTrace} = useReader();
  const {index, claimIds, source} = trace;
  // A click from the keyboard has no pointer detail; those steps jump.
  const step = (delta: number) => (event: MouseEvent) =>
    stepTrace(delta, event.detail === 0);

  return (
    <div ref={ref} className="trace-bar" role="region" aria-label="Trace">
      <button
        type="button"
        className="icon-button"
        aria-label="Previous claim"
        disabled={index === 0}
        onClick={step(-1)}
      >
        <ChevronIcon direction="up" />
      </button>
      <p className="trace-status">
        <span className="tabular-nums">
          Claim {index + 1} of {claimIds.length}
        </span>
        <span aria-hidden> · </span>
        <span className="sr-only">, citing </span>
        <span className="truncate">{shortName(source)}</span>
      </p>
      <button
        type="button"
        className="icon-button"
        aria-label="Next claim"
        data-step="next"
        disabled={index === claimIds.length - 1}
        onClick={step(1)}
      >
        <ChevronIcon direction="down" />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Close trace"
        onClick={endTrace}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function ChevronIcon({direction}: {direction: 'up' | 'down'}) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={direction === 'up' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
