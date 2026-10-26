import {chartSummary} from '@/lib/chart/summary.ts';
import type {Brief as BriefData} from '@/lib/report/brief.ts';
import {textOf} from '@/lib/report/parse.ts';

import {RangeBar} from './charts/range-bar.tsx';
import {JaText} from './ja-text.tsx';
import {Sentences} from './reader.tsx';
import type {SourceLookup} from './runs.tsx';

/** The answer, its range, the verdict and what would change it. */
export function Brief({
  brief,
  sources,
}: {
  brief: BriefData;
  sources: SourceLookup;
}) {
  const {evidence} = brief;
  return (
    <section id="brief" aria-labelledby="brief-title" className="brief">
      <h2 id="brief-title" className="sr-only">
        Brief
      </h2>
      <p className="brief-answer">
        <Sentences sentences={[brief.headline]} sources={sources} />
      </p>
      <figure className="mt-7">
        <RangeBar
          range={brief.range}
          caption={<a href={`#${brief.rangeSectionId}`}>Scenarios in 10.3</a>}
        />
        <figcaption className="sr-only">{chartSummary(brief.range)}</figcaption>
      </figure>

      <p className="brief-prose mt-8">
        <Sentences sentences={brief.verdict} sources={sources} />
      </p>
      <VerdictRows brief={brief} />

      <h3 className="brief-heading">What would change this answer</h3>
      <ol className="falsifiers">
        {brief.falsifiers.map(sentence => (
          <li key={sentence.claim.id}>
            <Sentences sentences={[sentence]} sources={sources} />
          </li>
        ))}
      </ol>
      <p className="brief-note mt-3">
        <a className="brief-link" href={`#${brief.falsifiersSectionId}`}>
          Read them in full in 11.5
        </a>
      </p>

      <p className="evidence">
        <strong>{brief.sourceCount}</strong> sources ·{' '}
        <strong>{evidence.cited}</strong> cited figures ·{' '}
        <strong>{evidence.modeled}</strong> modeled ·{' '}
        <strong>{evidence.unattributed}</strong> not attributed
      </p>
      <p className="brief-note mt-1">
        This page&rsquo;s parser counts these from the report&rsquo;s own links
        and wording. They show where a figure points, not whether its source
        supports it.
      </p>
    </section>
  );
}

/** The Executive Summary table as one row per category. */
function VerdictRows({brief}: {brief: BriefData}) {
  const {header, rows} = brief.verdictTable;
  const [, from, to] = header.map(cell => textOf(cell).trim());
  return (
    <>
      <p className="brief-note mt-4">
        {from} <span aria-hidden>→</span>
        <span className="sr-only">to</span> {to}
      </p>
      <ul className="verdicts">
        {rows.map(({claim, cells}) => {
          const [name, start, end, habit, verdict] = cells.map(cell =>
            textOf(cell).trim()
          );
          return (
            <li key={claim.id} className="verdict">
              <span className="verdict-name">
                <JaText text={name ?? ''} />
              </span>
              <span className="verdict-detail">
                <span>
                  {start} <span aria-hidden>→</span>
                  <span className="sr-only">to</span> {end}
                </span>
                <span>{habit}</span>
              </span>
              <span
                className="verdict-chip"
                data-verdict={verdict?.toLowerCase()}
              >
                {verdict}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
