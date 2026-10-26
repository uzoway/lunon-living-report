import {shortName} from '@/lib/report/sources.ts';
import type {Source} from '@/lib/report/types.ts';

import {JaText} from './ja-text.tsx';

/**
 * One source, as the card and the Sources index both show it. "Show every
 * claim" is a plain button that ReaderProvider picks up by its data-trace.
 */
export function SourceItem({
  source,
  named,
  nearClaim,
}: {
  source: Source;
  /** Show the short name; a card about one source already has it as title. */
  named: boolean;
  /** Start the trace at this claim instead of the first. */
  nearClaim?: string;
}) {
  return (
    <li className="source">
      {named && <p className="source-name">{shortName(source)}</p>}
      <p className="source-label">
        <JaText text={source.label} />
      </p>
      <p className="source-meta">
        {source.year && `${source.year} · `}
        {source.citationCount === 1
          ? 'Cited once in this report'
          : `Cited ${source.citationCount} times in this report`}
      </p>
      <div className="source-actions">
        <a
          className="source-open"
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open source
          <span className="sr-only">{` ${shortName(source)}, opens in a new tab`}</span>
          <ExternalIcon />
        </a>
        <button
          type="button"
          className="source-trace"
          data-trace={source.id}
          data-near={nearClaim}
        >
          Show every claim
          <span className="sr-only">{` that cites ${shortName(source)}`}</span>
        </button>
      </div>
    </li>
  );
}

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
