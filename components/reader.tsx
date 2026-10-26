import {textOf} from '@/lib/report/parse.ts';
import {parseNumber} from '@/lib/report/tables.ts';
import {chartSummary} from '@/lib/chart/summary.ts';
import type {
  Block,
  Chart,
  Claim,
  Provenance,
  Section,
  Sentence,
  Table,
  Timeline,
} from '@/lib/report/types.ts';

import {ChartFrame} from './charts/chart-frame.tsx';
import {LinesChart} from './charts/lines-chart.tsx';
import {PartsChart} from './charts/parts-chart.tsx';
import {RangeBar} from './charts/range-bar.tsx';

import {HeadingText} from './heading-text.tsx';
import {Runs, type SourceLookup} from './runs.tsx';

/** The full report, in section order, with heading levels as written. */
export function Reader({
  sections,
  sources,
}: {
  sections: Section[];
  sources: SourceLookup;
}) {
  return (
    <article id="report" className="report">
      {sections.map(section => {
        const Heading = section.depth === 2 ? 'h2' : 'h3';
        return [
          <Heading key={section.id} id={section.id}>
            <HeadingText text={section.title} />
          </Heading>,
          ...section.blocks.map((block, i) => (
            <BlockView
              key={`${section.id}-${i}`}
              block={block}
              section={section}
              sources={sources}
            />
          )),
        ];
      })}
    </article>
  );
}

function BlockView({
  block,
  section,
  sources,
}: {
  block: Block;
  section: Section;
  sources: SourceLookup;
}) {
  switch (block.kind) {
    case 'paragraph':
      return (
        <p>
          <Sentences sentences={block.sentences} sources={sources} />
        </p>
      );
    case 'list': {
      const items = block.items.map((sentences, i) => (
        <li key={i}>
          <Sentences sentences={sentences} sources={sources} />
        </li>
      ));
      return block.ordered ? (
        <ol start={block.start}>{items}</ol>
      ) : (
        <ul>{items}</ul>
      );
    }
    case 'table': {
      const table = (
        <TableView table={block.table} section={section} sources={sources} />
      );
      const {chart} = block.table;
      if (!chart) return table;
      return (
        <ChartFrame
          label={section.title}
          summary={chartSummary(chart)}
          chart={<ChartView chart={chart} />}
          table={table}
        />
      );
    }
    case 'timeline':
      return <TimelineView timeline={block.timeline} />;
  }
}

/**
 * Each sentence is a claim, so it gets an element that Trace and Questions
 * can find, and a provenance label that stays hidden until it's turned on.
 */
export function Sentences({
  sentences,
  sources,
}: {
  sentences: Sentence[];
  sources: SourceLookup;
}) {
  return sentences.map(({claim, runs}) => (
    <span key={claim.id} {...claimAttributes(claim)}>
      <Runs
        runs={runs}
        sources={sources}
        after={claim.provenance && <ProvenanceLabel kind={claim.provenance} />}
      />
    </span>
  ));
}

function claimAttributes(claim: Claim) {
  return {
    'data-claim': claim.id,
    'data-cites': claim.sourceIds.join(' ') || undefined,
  };
}

const PROVENANCE_LABELS: Record<Provenance, string> = {
  cited: 'Cited',
  modeled: 'Modeled',
  unattributed: 'Not attributed',
};

function ProvenanceLabel({kind}: {kind: Provenance}) {
  return (
    <span className="provenance" data-kind={kind}>
      {PROVENANCE_LABELS[kind]}
    </span>
  );
}

function TableView({
  table,
  section,
  sources,
}: {
  table: Table;
  section: Section;
  sources: SourceLookup;
}) {
  // Focusable so keyboard users can scroll a wide table on small screens.
  return (
    <div
      className="table-wrap"
      role="region"
      aria-label={`Table in ${section.title}`}
      tabIndex={0}
    >
      <table>
        <thead>
          <tr>
            {table.header.map((cell, i) => (
              <th key={i} scope="col">
                <Runs runs={cell} sources={sources} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map(({claim, cells}) => (
            <tr key={claim.id} {...claimAttributes(claim)}>
              {cells.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    <Runs
                      runs={cell}
                      sources={sources}
                      after={
                        claim.provenance && (
                          <ProvenanceLabel kind={claim.provenance} />
                        )
                      }
                    />
                  </th>
                ) : (
                  <td
                    key={i}
                    data-numeric={
                      parseNumber(textOf(cell).trim()) === undefined
                        ? undefined
                        : ''
                    }
                  >
                    <Runs runs={cell} sources={sources} />
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartView({chart}: {chart: Chart}) {
  switch (chart.kind) {
    case 'lines':
      return <LinesChart chart={chart} />;
    case 'parts':
      return <PartsChart chart={chart} />;
    case 'range':
      return <RangeBar range={chart} />;
  }
}

function TimelineView({timeline}: {timeline: Timeline}) {
  return (
    <figure className="timeline">
      <figcaption>{timeline.title}</figcaption>
      <ol>
        {timeline.periods.map(({period, events}) => (
          <li key={period}>
            <span className="timeline-period">{period}</span>
            <ul>
              {events.map(event => (
                <li key={event}>{event}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </figure>
  );
}
