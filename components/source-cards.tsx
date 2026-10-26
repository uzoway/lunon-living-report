'use client';

import * as Popover from '@radix-ui/react-popover';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';

import {shortName} from '@/lib/report/sources.ts';

import {CloseIcon} from './close-icon.tsx';
import {useReader} from './reader-state.tsx';
import {Sheet} from './sheet.tsx';
import {SourceItem} from './source-item.tsx';
import {useLayoutMode} from './use-layout-mode.ts';

const TITLE_ID = 'source-card-title';

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
export function SourceCards() {
  const {sources} = useReader();
  const mode = useLayoutMode();
  const [card, setCard] = useState<Card | null>(null);
  // Focus stays put when the reader clicked elsewhere or moved on to a trace
  // or a question; otherwise closing returns it to the marker.
  const keepFocus = useRef(false);
  // Exit animations call returnFocus with props from before the close, so it
  // reads the live card from here.
  const latest = useRef(card);
  useEffect(() => {
    latest.current = card;
  }, [card]);

  useEffect(() => {
    function onClick(event: globalThis.MouseEvent) {
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

  const cited = card?.sourceIds.flatMap(id => sources.get(id) ?? []) ?? [];
  const title =
    cited.length === 1 && cited[0]
      ? shortName(cited[0])
      : `${cited.length} sources`;
  // Markers in the Brief repeat the report; questions pin to the Reader's.
  const claimId = card?.marker.closest<HTMLElement>('#report [data-claim]')
    ?.dataset.claim;
  const open = card?.open ?? false;

  function close() {
    setCard(current => current && {...current, open: false});
  }

  function onOpenChange(next: boolean) {
    if (!next) close();
  }

  // The card's own trace and question buttons hand the reader on.
  function onAction(event: MouseEvent) {
    if (
      event.target instanceof Element &&
      event.target.closest('[data-trace], [data-ask]')
    ) {
      keepFocus.current = true;
      close();
    }
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
    if (!keepFocus.current) current.marker.focus();
    keepFocus.current = false;
  }

  const body = (
    <div onClick={onAction}>
      <ul className="card-body">
        {cited.map(source => (
          <SourceItem
            key={source.id}
            source={source}
            named={cited.length > 1}
            nearClaim={claimId}
          />
        ))}
      </ul>
      {claimId && (
        <div className="card-footer">
          <button type="button" className="text-button" data-ask={claimId}>
            Ask about this claim
          </button>
        </div>
      )}
    </div>
  );

  if (mode === 'sheet') {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        onOpenAutoFocus={focusCard}
        onCloseAutoFocus={returnFocus}
      >
        {body}
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
              keepFocus.current = true;
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
          {body}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
