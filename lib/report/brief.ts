import {countEvidence, type Evidence} from './provenance.ts';
import type {Block, Chart, Report, Section, Sentence, Table} from './types.ts';

export type RangeChart = Extract<Chart, {kind: 'range'}>;

/** The top of the page, pulled from the parsed report rather than retyped. */
export interface Brief {
  /** The report's first sentence: the answer, in its own words. */
  headline: Sentence;
  /** The paragraph that opens "The verdict:". */
  verdict: Sentence[];
  verdictTable: Table;
  range: RangeChart;
  rangeSectionId: string;
  /** The first sentence of each falsifier in 11.5. */
  falsifiers: Sentence[];
  falsifiersSectionId: string;
  sourceCount: number;
  evidence: Evidence;
}

/**
 * Finds the Brief's pieces by where they sit in the report. Throws if the
 * report's shape changes, so the Brief can't quietly go missing.
 */
export function selectBrief(report: Report): Brief {
  const summary = section(report, 's-executive-summary');
  const paragraphs = summary.blocks.flatMap(b =>
    b.kind === 'paragraph' ? [b.sentences] : []
  );
  const headline = paragraphs[0]?.[0];
  const verdict = paragraphs.find(p =>
    p[0]?.claim.text.startsWith('The verdict:')
  );
  const verdictTable = summary.blocks.find(b => b.kind === 'table')?.table;

  const scenarios = section(report, 's-10-3');
  const range = rangeIn(scenarios.blocks);

  const falsifiersSection = section(report, 's-11-5');
  const falsifiers = falsifiersSection.blocks
    .find(b => b.kind === 'list')
    ?.items.flatMap(item => item.slice(0, 1));

  if (!headline || !verdict || !verdictTable || !range) {
    throw new Error('Report 51 no longer has the shape the Brief expects');
  }
  if (falsifiers?.length !== 3) {
    throw new Error('Expected three falsifiers in section 11.5');
  }
  return {
    headline,
    verdict,
    verdictTable,
    range,
    rangeSectionId: scenarios.id,
    falsifiers,
    falsifiersSectionId: falsifiersSection.id,
    sourceCount: report.sources.length,
    evidence: countEvidence(report.claims),
  };
}

function section(report: Report, id: string): Section {
  const found = report.sections.find(s => s.id === id);
  if (!found) throw new Error(`Missing section ${id}`);
  return found;
}

function rangeIn(blocks: Block[]): RangeChart | undefined {
  for (const block of blocks) {
    if (block.kind === 'table' && block.table.chart?.kind === 'range') {
      return block.table.chart;
    }
  }
  return undefined;
}
