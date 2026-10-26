'use client';

import * as Popover from '@radix-ui/react-popover';
import {useEffect, useMemo, useState, type RefObject} from 'react';

import {useReader} from './reader-state.tsx';

interface Measurable {
  getBoundingClientRect(): DOMRect;
}

/**
 * Picking a sentence in the report offers "Ask about this" above its first
 * line. Selecting text to copy doesn't, and nothing appears until a click.
 * Keyboard readers start questions from the panel, which lists every claim.
 */
export function ClaimChip() {
  const {setPanel} = useReader();
  const [claim, setClaim] = useState<HTMLElement | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          'button, a, select, textarea, [data-radix-popper-content-wrapper]'
        )
      ) {
        return;
      }
      const element = target.closest('#report [data-claim]');
      if (
        !(element instanceof HTMLElement) ||
        window.getSelection()?.toString()
      ) {
        setClaim(null);
        return;
      }
      setClaim(current => (current === element ? null : element));
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const anchor = useMemo(
    (): RefObject<Measurable> | null =>
      claim && {
        current: {
          getBoundingClientRect: () =>
            claim.getClientRects()[0] ?? claim.getBoundingClientRect(),
        },
      },
    [claim]
  );
  const claimId = claim?.dataset.claim;

  return (
    <>
      {claimId && (
        <style>{`#report [data-claim="${claimId}"]{background-color:var(--select)}`}</style>
      )}
      <Popover.Root
        open={claim !== null}
        onOpenChange={open => {
          if (!open) setClaim(null);
        }}
      >
        {anchor && <Popover.Anchor virtualRef={anchor} />}
        <Popover.Portal>
          <Popover.Content
            className="chip"
            side="top"
            align="start"
            sideOffset={6}
            collisionPadding={{top: 64, bottom: 16, left: 16, right: 16}}
            // The reader is reading, not navigating: focus stays put.
            onOpenAutoFocus={event => event.preventDefault()}
            onCloseAutoFocus={event => event.preventDefault()}
          >
            <button
              type="button"
              className="chip-button"
              onClick={() => {
                setPanel({open: true, draftClaimId: claimId});
                setClaim(null);
              }}
            >
              Ask about this
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
