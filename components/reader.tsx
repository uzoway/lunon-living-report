import {textOf} from '@/lib/report/parse.ts';
import {parseNumber} from '@/lib/report/tables.ts';
import type {
  Block,
  Section,
  Sentence,
  Table,
  Timeline,
} from '@/lib/report/types.ts';

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
    case 'table':
      return (
        <TableView table={block.table} section={section} sources={sources} />
      );
    case 'timeline':
      return <TimelineView timeline={block.timeline} />;
  }
}

/** Each sentence is a claim, so it gets an element Trace and Questions can find. */
export function Sentences({
  sentences,
  sources,
}: {
  sentences: Sentence[];
  sources: SourceLookup;
}) {
  return sentences.map(({claim, runs}) => (
    <span key={claim.id} data-claim={claim.id}>
      <Runs runs={runs} sources={sources} />
    </span>
  ));
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
            <tr key={claim.id} data-claim={claim.id}>
              {cells.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    <Runs runs={cell} sources={sources} />
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
