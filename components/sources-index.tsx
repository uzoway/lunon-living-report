'use client';

import {useMemo, useSyncExternalStore} from 'react';

import {groupByDomain} from '@/lib/report/sources.ts';

import {useReader} from './reader-state.tsx';
import {SourceItem} from './source-item.tsx';

const noSubscription = () => () => {};

/**
 * Every source the report cites, grouped by domain, most cited first. It
 * follows the report's own References heading, which the report left empty.
 * It renders from the sources the cards already use, so the page doesn't
 * carry this list twice.
 */
export function SourcesIndex() {
  const {sources} = useReader();
  // Drawn once the page is interactive: its buttons need the page's script
  // anyway, and leaving it out of the first HTML keeps the first load small.
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false
  );
  const all = useMemo(() => [...sources.values()], [sources]);
  const groups = useMemo(() => groupByDomain(all), [all]);
  const links = all.reduce((n, s) => n + s.citationCount, 0);
  if (!hydrated) return null;
  return (
    <section
      id="sources-index"
      aria-labelledby="sources-index-title"
      className="sources-index"
    >
      <h3 id="sources-index-title">Sources index</h3>
      <p className="sources-index-note">
        Built by this page from the report&rsquo;s {links} citation links:{' '}
        {all.length} sources, grouped by domain, most cited first.
      </p>
      <ul className="domains">
        {groups.map(group => (
          <li key={group.domain} className="domain">
            <h4 className="domain-name">
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {group.domain}
              </span>
              <span className="domain-count">
                {group.citationCount === 1
                  ? '1 citation'
                  : `${group.citationCount} citations`}
              </span>
            </h4>
            <ul>
              {group.sources.map(source => (
                <SourceItem key={source.id} source={source} named />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
