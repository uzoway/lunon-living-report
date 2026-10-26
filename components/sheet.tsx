'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {useRef, type PointerEvent, type ReactNode} from 'react';

import {CloseIcon} from './close-icon.tsx';

/** Past this many pixels, letting go closes the sheet. */
const DISMISS_DISTANCE = 120;
/** A flick this fast (px/ms) closes it from a shorter drag. */
const FLICK_VELOCITY = 0.5;
/** Velocity is read over this window; a pause this long means none. */
const VELOCITY_WINDOW = 100;

/** Resistance past the resting point: the further, the less it follows. */
function rubberband(overshoot: number, size: number): number {
  const c = 0.55;
  return (overshoot * size * c) / (size + c * overshoot);
}

interface Drag {
  pointerId: number;
  /** Pointer y minus the sheet's offset, so it stays where it was grabbed. */
  origin: number;
  /** Recent pointer positions, for the velocity at release. */
  samples: Array<{y: number; time: number}>;
}

/** Pixels per millisecond over the last moments of the drag. */
function releaseVelocity(samples: Drag['samples'], now: number): number {
  const recent = samples.filter(s => now - s.time <= VELOCITY_WINDOW);
  const first = recent[0];
  const last = recent.at(-1);
  if (!first || !last || last.time === first.time) return 0;
  return (last.y - first.y) / (last.time - first.time);
}

/** Where the sheet is now, in pixels below its resting place. */
function currentOffset(element: HTMLElement): number {
  const rest = window.innerHeight - element.offsetHeight;
  return element.getBoundingClientRect().top - rest;
}

/**
 * A bottom sheet for phones: a Radix dialog (focus trap, Escape, scroll lock)
 * that slides in with CSS and can be dragged down by its header to dismiss.
 * The drag sets the transform directly from pointer events, so it tracks the
 * finger 1:1 and can catch the sheet while it's still sliding in.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  onOpenAutoFocus,
  onCloseAutoFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const element = sheet.current;
    // One finger at a time, and the close button stays a button.
    const onButton =
      event.target instanceof Element && event.target.closest('button');
    if (!element || drag.current || onButton) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    // Catch it mid-flight: stop the slide where it is and hold it there.
    const offset = currentOffset(element);
    element.getAnimations().forEach(animation => animation.cancel());
    element.style.transform = `translateY(${offset}px)`;
    drag.current = {
      pointerId: event.pointerId,
      origin: event.clientY - offset,
      samples: [{y: event.clientY, time: event.timeStamp}],
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const element = sheet.current;
    const current = drag.current;
    if (!element || !current || event.pointerId !== current.pointerId) return;
    const raw = event.clientY - current.origin;
    const offset = raw >= 0 ? raw : -rubberband(-raw, element.offsetHeight);
    element.style.transform = `translateY(${offset}px)`;
    current.samples.push({y: event.clientY, time: event.timeStamp});
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const element = sheet.current;
    const current = drag.current;
    if (!element || !current || event.pointerId !== current.pointerId) return;
    drag.current = null;
    const offset = currentOffset(element);
    const velocity = releaseVelocity(current.samples, event.timeStamp);
    if (
      offset > DISMISS_DISTANCE ||
      (offset > 24 && velocity > FLICK_VELOCITY)
    ) {
      // The exit keyframes start from wherever the finger left it.
      onOpenChange(false);
      return;
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.style.transform = '';
    element.animate(
      [{transform: `translateY(${offset}px)`}, {transform: 'translateY(0)'}],
      {duration: reduce ? 0 : 300, easing: 'cubic-bezier(0.32, 0.72, 0, 1)'}
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content
          ref={sheet}
          className="sheet"
          aria-describedby={undefined}
          tabIndex={-1}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <div
            className="sheet-grip"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <Dialog.Title className="card-title">{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close">
              <CloseIcon />
            </Dialog.Close>
          </div>
          <div className="sheet-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
