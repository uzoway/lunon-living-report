'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from 'motion/react';
import type {ReactNode} from 'react';

import {CloseIcon} from './close-icon.tsx';

/** iOS's sheet curve. Exit is a touch quicker than entry. */
const ENTER = {duration: 0.3, ease: [0.32, 0.72, 0, 1]} as const;
const EXIT = {duration: 0.22, ease: [0.32, 0.72, 0, 1]} as const;

/** A flick dismisses even when it's short; px/s, from Motion's pan info. */
const FLICK_VELOCITY = 400;
const DISMISS_DISTANCE = 120;

/**
 * A bottom sheet for phones: a Radix dialog (focus trap, Escape, scroll lock)
 * that can be dragged down by its header to dismiss.
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
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const instant = {duration: 0};

  function onDragEnd(_event: PointerEvent, info: PanInfo) {
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > FLICK_VELOCITY) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="sheet-overlay"
                initial={{opacity: 0}}
                animate={{
                  opacity: 1,
                  transition: reduceMotion ? instant : ENTER,
                }}
                exit={{opacity: 0, transition: reduceMotion ? instant : EXIT}}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              onOpenAutoFocus={onOpenAutoFocus}
              onCloseAutoFocus={onCloseAutoFocus}
            >
              <motion.div
                className="sheet"
                tabIndex={-1}
                initial={{y: '100%'}}
                animate={{y: 0, transition: reduceMotion ? instant : ENTER}}
                exit={{y: '100%', transition: reduceMotion ? instant : EXIT}}
                drag="y"
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{top: 0, bottom: 0}}
                dragElastic={{top: 0.04, bottom: 1}}
                onDragEnd={onDragEnd}
              >
                <div
                  className="sheet-grip"
                  onPointerDown={event => dragControls.start(event)}
                >
                  <Dialog.Title className="card-title">{title}</Dialog.Title>
                  <Dialog.Close className="icon-button" aria-label="Close">
                    <CloseIcon />
                  </Dialog.Close>
                </div>
                <div className="sheet-body">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
