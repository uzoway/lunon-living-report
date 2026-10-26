'use client';

import * as Popover from '@radix-ui/react-popover';
import {useEffect, useRef, useState} from 'react';

import {HeadingText} from './heading-text.tsx';

export interface NavItem {
  id: string;
  title: string;
}

/**
 * The section whose heading last crossed the top third of the viewport.
 * Checked once per frame while scrolling: an IntersectionObserver band misses
 * jumps that skip over it, such as following a deep link.
 */
function useCurrentSection(items: NavItem[]): string | undefined {
  const [current, setCurrent] = useState(items[0]?.id);
  useEffect(() => {
    const headings = items.flatMap(({id}) => document.getElementById(id) ?? []);
    function update() {
      const line = window.innerHeight * 0.3;
      let found = headings[0]?.id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > line) break;
        found = heading.id;
      }
      setCurrent(found);
    }
    let frame = requestAnimationFrame(update);
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [items]);
  return current;
}

function Links({
  items,
  current,
  onNavigate,
}: {
  items: NavItem[];
  current: string | undefined;
  onNavigate?: () => void;
}) {
  return (
    <ul className="toc-list">
      {items.map(({id, title}) => (
        <li key={id}>
          <a
            className="toc-link"
            href={`#${id}`}
            aria-current={id === current ? 'location' : undefined}
            onClick={onNavigate}
          >
            <HeadingText text={title} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The sticky outline beside the text on wide screens. */
export function Outline({items}: {items: NavItem[]}) {
  const current = useCurrentSection(items);
  return (
    <nav className="toc" aria-label="Contents">
      <Links items={items} current={current} />
    </nav>
  );
}

/** The same outline as a menu in the header, below 1120px. */
export function ContentsMenu({items}: {items: NavItem[]}) {
  const current = useCurrentSection(items);
  const [open, setOpen] = useState(false);
  // After following a link, leave focus at the section the reader jumped to.
  const navigated = useRef(false);
  const currentTitle = items.find(({id}) => id === current)?.title;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="contents-trigger">
        <span className="font-semibold">Contents</span>
        {currentTitle && (
          <span
            className="hidden truncate text-muted min-[22.5rem]:block"
            aria-hidden
          >
            <HeadingText text={currentTitle} />
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="card max-h-[min(70dvh,32rem)] p-2"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          onCloseAutoFocus={event => {
            if (navigated.current) event.preventDefault();
            navigated.current = false;
          }}
        >
          <nav aria-label="Contents">
            <Links
              items={items}
              current={current}
              onNavigate={() => {
                navigated.current = true;
                setOpen(false);
              }}
            />
          </nav>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
