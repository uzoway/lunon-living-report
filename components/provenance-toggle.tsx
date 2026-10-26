'use client';

import {useState} from 'react';

import {announce} from './announce.ts';

/**
 * Shows or hides the provenance labels. They're server-rendered and hidden by
 * CSS, so turning them on sets one attribute instead of re-rendering the text.
 */
export function ProvenanceToggle({figures}: {figures: number}) {
  const [shown, setShown] = useState(false);

  function toggle() {
    const next = !shown;
    setShown(next);
    document.documentElement.toggleAttribute('data-provenance', next);
    announce(
      next
        ? `Provenance labels shown on ${figures} figures`
        : 'Provenance labels hidden'
    );
  }

  return (
    <button
      type="button"
      className="header-button"
      aria-pressed={shown}
      onClick={toggle}
    >
      <TagIcon />
      <span className="header-label">Provenance</span>
    </button>
  );
}

function TagIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.2 7.2a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1-.3-.7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    </svg>
  );
}
