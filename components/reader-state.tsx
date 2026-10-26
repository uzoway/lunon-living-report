'use client';

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {shortName} from '@/lib/report/sources.ts';
import type {Claim, Source} from '@/lib/report/types.ts';

import {announce} from './announce.ts';
import {useQuestions} from './questions-store.ts';
import {TraceBar} from './trace-bar.tsx';

/**
 * What the client needs to know about a claim. Its text is already on the
 * page, so it isn't sent again (see claim-text.ts).
 */
export type ClaimRef = Pick<Claim, 'id' | 'sectionId' | 'sourceIds'>;

export interface Trace {
  source: Source;
  /** Every claim that cites the source, in reading order. */
  claimIds: string[];
  index: number;
}

export interface Panel {
  open: boolean;
  /** The claim a new question is about, when one was picked in the text. */
  draftClaimId?: string;
}

interface Reader {
  title: string;
  claims: ClaimRef[];
  sources: ReadonlyMap<string, Source>;
  sectionTitles: ReadonlyMap<string, string>;
  trace: Trace | null;
  startTrace: (sourceId: string, nearClaimId?: string) => void;
  stepTrace: (delta: number, instant: boolean) => void;
  endTrace: () => void;
  panel: Panel;
  setPanel: (panel: Panel) => void;
}

const ReaderContext = createContext<Reader | null>(null);

export function useReader(): Reader {
  const reader = useContext(ReaderContext);
  if (!reader) throw new Error('useReader needs a ReaderProvider');
  return reader;
}

// The trace lives in the URL (?trace=s1&claim=c45) so a traced view can be
// linked and survives a reload.
const URL_CHANGE = 'reader:urlchange';

function subscribeToUrl(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(URL_CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(URL_CHANGE, onChange);
  };
}

function updateSearch(update: (params: URLSearchParams) => void) {
  const url = new URL(window.location.href);
  update(url.searchParams);
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new Event(URL_CHANGE));
}

function claimElement(claimId: string): HTMLElement | null {
  return document.querySelector(`#report [data-claim="${claimId}"]`);
}

/**
 * Interaction state shared by the header, the cards, the trace bar and the
 * questions panel. The report itself is passed through as children, so none
 * of this re-renders it: highlights are CSS rules written into one <style>.
 */
export function ReaderProvider({
  title,
  claims,
  sources,
  sections,
  children,
}: {
  title: string;
  claims: ClaimRef[];
  sources: Source[];
  sections: Array<{id: string; title: string}>;
  children: ReactNode;
}) {
  const sourceMap = useMemo(
    () => new Map(sources.map(s => [s.id, s])),
    [sources]
  );
  const sectionTitles = useMemo(
    () => new Map(sections.map(s => [s.id, s.title])),
    [sections]
  );
  const knownClaims = useMemo(() => new Set(claims.map(c => c.id)), [claims]);
  const claimsBySource = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const claim of claims) {
      for (const id of claim.sourceIds) {
        map.set(id, [...(map.get(id) ?? []), claim.id]);
      }
    }
    return map;
  }, [claims]);

  const search = useSyncExternalStore(
    subscribeToUrl,
    () => window.location.search,
    () => ''
  );
  const trace = useMemo((): Trace | null => {
    const params = new URLSearchParams(search);
    // Only known ids reach the CSS below, so the URL can't inject a rule.
    const source = sourceMap.get(params.get('trace') ?? '');
    const claimIds = source && claimsBySource.get(source.id);
    if (!source || !claimIds) return null;
    const index = Math.max(0, claimIds.indexOf(params.get('claim') ?? ''));
    return {source, claimIds, index};
  }, [search, sourceMap, claimsBySource]);

  const [panel, setPanel] = useState<Panel>({open: false});
  const questions = useQuestions();
  const bar = useRef<HTMLDivElement>(null);
  // Steps from the keyboard and reloads jump; clicked steps scroll smoothly.
  const instant = useRef(true);
  const currentClaim = trace?.claimIds[trace.index];

  useEffect(() => {
    if (!currentClaim) return;
    const element = claimElement(currentClaim);
    if (!element) return;
    // A claim in a table drawn as a chart needs the table view first.
    element
      .closest('[data-chart-frame]')
      ?.dispatchEvent(new Event('showtable'));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = instant.current || reduce ? 'instant' : 'smooth';
    requestAnimationFrame(() =>
      element.scrollIntoView({block: 'center', behavior})
    );
  }, [currentClaim]);

  function goTo(sourceId: string, claimId: string, jump: boolean) {
    instant.current = jump;
    updateSearch(params => {
      params.set('trace', sourceId);
      params.set('claim', claimId);
    });
  }

  function startTrace(sourceId: string, nearClaimId?: string) {
    const source = sourceMap.get(sourceId);
    const claimIds = claimsBySource.get(sourceId);
    if (!source || !claimIds) return;
    // Starting from a marker keeps the reader where they are.
    const index = Math.max(0, claimIds.indexOf(nearClaimId ?? ''));
    goTo(sourceId, claimIds[index] ?? '', false);
    announce(
      `Showing ${claimIds.length} claims that cite ${shortName(source)}. ` +
        `Claim ${index + 1} of ${claimIds.length}.`
    );
    requestAnimationFrame(() =>
      bar.current?.querySelector<HTMLElement>('[data-step="next"]')?.focus()
    );
  }

  function stepTrace(delta: number, jump: boolean) {
    if (!trace) return;
    const index = trace.index + delta;
    const claimId = trace.claimIds[index];
    if (!claimId) return;
    goTo(trace.source.id, claimId, jump);
    announce(`Claim ${index + 1} of ${trace.claimIds.length}`);
  }

  function endTrace() {
    if (!trace) return;
    updateSearch(params => {
      params.delete('trace');
      params.delete('claim');
    });
    announce('Trace closed');
    // Leave focus on the marker in the claim the reader stopped at.
    const marker = claimElement(currentClaim ?? '')?.querySelector<HTMLElement>(
      `button[data-sources~="${trace.source.id}"]`
    );
    marker?.focus({preventScroll: true});
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !trace) return;
    // An open card or panel takes Escape first.
    if (document.querySelector('[data-radix-popper-content-wrapper], .sheet')) {
      return;
    }
    endTrace();
  });
  // "Show every claim" and "Ask about this claim" are plain buttons in the
  // cards and the Sources index; one listener here handles them all.
  const onClick = useEffectEvent((event: MouseEvent) => {
    const button =
      event.target instanceof Element
        ? event.target.closest('button[data-trace], button[data-ask]')
        : null;
    if (!(button instanceof HTMLButtonElement)) return;
    const {trace: sourceId, near, ask} = button.dataset;
    if (sourceId) startTrace(sourceId, near);
    if (ask) setPanel({open: true, draftClaimId: ask});
  });
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => onKeyDown(event);
    const click = (event: MouseEvent) => onClick(event);
    document.addEventListener('keydown', keydown);
    document.addEventListener('click', click);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('click', click);
    };
  }, []);

  // Saved questions come from storage, so only known claim ids become rules.
  const pinned = questions.filter(q => knownClaims.has(q.claimId));
  const rules = [
    trace &&
      `#report [data-cites~="${trace.source.id}"]{background-color:var(--trace)}` +
        `#report [data-claim="${currentClaim}"]{background-color:var(--trace-current);transition:none}`,
    ...pinned.map(
      ({claimId}) =>
        `#report span[data-claim="${claimId}"],#report tr[data-claim="${claimId}"] th{text-decoration:underline dotted var(--accent) 2px;text-underline-offset:.3em}`
    ),
  ]
    .filter(Boolean)
    .join('');

  const reader: Reader = {
    title,
    claims,
    sources: sourceMap,
    sectionTitles,
    trace,
    startTrace,
    stepTrace,
    endTrace,
    panel,
    setPanel,
  };
  return (
    <ReaderContext value={reader}>
      {children}
      <style>{rules}</style>
      {trace && <TraceBar ref={bar} trace={trace} />}
    </ReaderContext>
  );
}
