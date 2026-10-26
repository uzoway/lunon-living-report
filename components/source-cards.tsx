'use client';

import * as Popover from '@radix-ui/react-popover';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react';

import {shortName} from '@/lib/report/sources.ts';
import type {Source} from '@/lib/report/types.ts';

import {CloseIcon} from './close-icon.tsx';
import {JaText} from './ja-text.tsx';
import {Sheet} from './sheet.tsx';

/** Where the card opens: beside the text, under the marker, or from below. */
type Mode = 'rail' | 'popover' | 'sheet';

const RAIL = '(min-width: 70rem)';
const POPOVER = '(min-width: 48rem)';
const TITLE_ID = 'source-card-title';

function subscribe(onChange: () => void) {
  const queries = [RAIL, POPOVER].map(query => matchMedia(query));
  queries.forEach(query => query.addEventListener('change', onChange));
  return () =>
    queries.forEach(query => query.removeEventListener('change', onChange));
}

function currentMode(): Mode {
  if (matchMedia(RAIL).matches) return 'rail';
  return matchMedia(POPOVER).matches ? 'popover' : 'sheet';
}

interface Measurable {
  getBoundingClientRect(): DOMRect;
}

/**
 * The card on screen, kept after closing so the exit animation still shows
 * its sources and focus can go back to its marker.
 */
interface Card {
  marker: HTMLButtonElement;
  sourceIds: string[];
  open: boolean;
  /** Bumped on every open, so moving to another marker replays the entry. */
  key: number;
}

/**
 * Opens a source card for whichever marker is clicked. One listener on the
 * page instead of a component per marker keeps the report static: opening a
 * card re-renders this, not the text.
 */
export function SourceCards({sources}: {sources: Source[]}) {
  const byId = useMemo(() => new Map(sources.map(s => [s.id, s])), [sources]);
  const mode = useSyncExternalStore(subscribe, currentMode, (): Mode => 'rail');
  const [card, setCard] = useState<Card | null>(null);
  // Closing by clicking elsewhere leaves focus where the reader clicked.
  const dismissedOutside = useRef(false);
  // Exit animations call returnFocus with props from before the close, so it
  // reads the live card from here.
  const latest = useRef(card);
  useEffect(() => {
    latest.current = card;
  }, [card]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const marker =
        event.target instanceof Element
          ? event.target.closest('button[data-sources]')
          : null;
      if (!(marker instanceof HTMLButtonElement)) return;
      const sourceIds = (marker.dataset.sources ?? '').split(' ');
      setCard(current =>
        current?.open && current.marker === marker
          ? {...current, open: false}
          : {marker, sourceIds, open: true, key: (current?.key ?? 0) + 1}
      );
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // The markers are server-rendered, so their state is set here directly.
  useEffect(() => {
    if (!card?.open) return;
    const {marker} = card;
    marker.setAttribute('aria-expanded', 'true');
    return () => marker.setAttribute('aria-expanded', 'false');
  }, [card]);

  // In the rail the card lines up with the marker's line, at the rail's edge.
  const anchor = useMemo((): RefObject<Measurable> | null => {
    if (!card) return null;
    const {marker} = card;
    if (mode !== 'rail') return {current: marker};
    return {
      current: {
        getBoundingClientRect() {
          const line = marker.getBoundingClientRect();
          const rail = document.getElementById('rail')?.getBoundingClientRect();
          return new DOMRect(
            rail?.left ?? line.right,
            line.top,
            0,
            line.height
          );
        },
      },
    };
  }, [card, mode]);

  const cited = card?.sourceIds.flatMap(id => byId.get(id) ?? []) ?? [];
  const title =
    cited.length === 1 && cited[0]
      ? shortName(cited[0])
      : `${cited.length} sources`;
  const open = card?.open ?? false;

  function onOpenChange(next: boolean) {
    if (!next) setCard(current => current && {...current, open: false});
  }

  function focusCard(event: Event) {
    // Focus the card itself, so a screen reader starts at its title.
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.focus();
    }
  }

  function returnFocus(event: Event) {
    event.preventDefault();
    const current = latest.current;
    // Still open means the reader moved to another marker's card.
    if (!current || current.open) return;
    if (!dismissedOutside.current) current.marker.focus();
    dismissedOutside.current = false;
  }

  if (mode === 'sheet') {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        onOpenAutoFocus={focusCard}
        onCloseAutoFocus={returnFocus}
      >
        <SourceList sources={cited} />
      </Sheet>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {anchor && <Popover.Anchor virtualRef={anchor} />}
      <Popover.Portal>
        <Popover.Content
          key={card?.key}
          className="card"
          data-mode={mode}
          aria-labelledby={TITLE_ID}
          side={mode === 'rail' ? 'right' : 'bottom'}
          align={mode === 'rail' ? 'start' : 'center'}
          sideOffset={mode === 'rail' ? 0 : 8}
          collisionPadding={{top: 64, bottom: 16, left: 16, right: 16}}
          tabIndex={-1}
          onOpenAutoFocus={focusCard}
          onCloseAutoFocus={returnFocus}
          onInteractOutside={event => {
            // Another marker switches the card instead of closing it.
            const target = event.target;
            if (
              target instanceof Element &&
              target.closest('button[data-sources]')
            ) {
              event.preventDefault();
            } else {
              dismissedOutside.current = true;
            }
          }}
        >
          <div className="card-header">
            <h2 id={TITLE_ID} className="card-title">
              {title}
            </h2>
            <Popover.Close className="icon-button" aria-label="Close">
              <CloseIcon />
            </Popover.Close>
          </div>
          <SourceList sources={cited} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SourceList({sources}: {sources: Source[]}) {
  const single = sources.length === 1;
  return (
    <ul className="card-body">
      {sources.map(source => (
        <li key={source.id} className="source">
          {!single && <p className="source-name">{shortName(source)}</p>}
          <p className="source-label">
            <JaText text={source.label} />
          </p>
          <p className="source-meta">
            {source.year && `${source.year} · `}
            {source.citationCount === 1
              ? 'Cited once in this report'
              : `Cited ${source.citationCount} times in this report`}
          </p>
          <a
            className="source-open"
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open source
            <span className="sr-only">
              {` ${shortName(source)}, opens in a new tab`}
            </span>
            <ExternalIcon />
          </a>
        </li>
      ))}
    </ul>
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
