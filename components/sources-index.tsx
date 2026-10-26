import {groupByDomain} from '@/lib/report/sources.ts';
import type {Source} from '@/lib/report/types.ts';

import {SourceItem} from './source-item.tsx';

/**
 * Every source the report cites, grouped by domain, most cited first. It
 * follows the report's own References heading, which the report left empty.
 */
export function SourcesIndex({sources}: {sources: Source[]}) {
  const links = sources.reduce((n, s) => n + s.citationCount, 0);
  return (
    <section
      id="sources-index"
      aria-labelledby="sources-index-title"
      className="sources-index"
    >
      <h3 id="sources-index-title">Sources index</h3>
      <p className="sources-index-note">
        Built by this page from the report&rsquo;s {links} citation links:{' '}
        {sources.length} sources, grouped by domain, most cited first.
      </p>
      <ul className="domains">
        {groupByDomain(sources).map(group => (
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
