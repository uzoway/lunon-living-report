import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {readReportMarkdown} from './content.ts';
import {parseReport, splitSentences, textOf} from './parse.ts';
import {normalizeUrl} from './sources.ts';
import {parseNumber} from './tables.ts';
import type {Block, Citation, Run, Table} from './types.ts';

const markdown = readReportMarkdown();
const report = parseReport(markdown);

// Read straight from the markdown with regular expressions, independent of
// the parser, so the two can check each other.
const rawLinks = [
  ...markdown.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g),
];
const rawTableCount = markdown.match(/^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/gm)?.length;

const blocks = report.sections.flatMap(section => section.blocks);
const tables = blocks.flatMap(b => (b.kind === 'table' ? [b.table] : []));
const citations = blocks
  .flatMap(blockRuns)
  .filter((run): run is Citation => run.kind === 'citation');

function blockRuns(block: Block): Run[] {
  switch (block.kind) {
    case 'paragraph':
      return block.sentences.flatMap(s => s.runs);
    case 'list':
      return block.items.flat().flatMap(s => s.runs);
    case 'table':
      return [
        ...block.table.header.flat(),
        ...block.table.rows.flatMap(row => row.cells.flat()),
      ];
    case 'timeline':
      return [];
  }
}

function blockText(block: Block): string[] {
  if (block.kind === 'table') {
    const {header, rows} = block.table;
    return [...header, ...rows.flatMap(row => row.cells)].map(textOf);
  }
  if (block.kind === 'list') {
    return block.items.map(item => textOf(item.flatMap(s => s.runs)));
  }
  if (block.kind === 'timeline') return [];
  return [textOf(blockRuns(block))];
}

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

describe('counts match the markdown', () => {
  it('has 209 citation links', () => {
    assert.equal(rawLinks.length, 209);
    const parsedLinks = citations.reduce((n, c) => n + c.sourceIds.length, 0);
    assert.equal(parsedLinks, rawLinks.length);
  });

  it('has 61 unique sources', () => {
    const rawSources = new Set(
      rawLinks.map(([, , url]) => normalizeUrl(url ?? ''))
    );
    assert.equal(rawSources.size, 61);
    assert.equal(report.sources.length, rawSources.size);
  });

  it('has 18 tables', () => {
    assert.equal(rawTableCount, 18);
    assert.equal(tables.length, rawTableCount);
  });

  it('collapses adjacent links into 180 markers', () => {
    const rawClusters = markdown.match(
      /(?:\[[^\]]*\]\(https?:\/\/[^)\s]+\))+/g
    );
    assert.equal(citations.length, rawClusters?.length);
    assert.equal(citations.length, 180);
  });
});

describe('sources', () => {
  it('maps every link in the markdown to exactly one source', () => {
    for (const [, label, url = ''] of rawLinks) {
      const matches = report.sources.filter(
        s => normalizeUrl(s.url) === normalizeUrl(url)
      );
      assert.equal(matches.length, 1, url);
      assert.equal(matches[0]?.label, label, 'label kept as written');
    }
  });

  it('cites every source at least once, and counts every link', () => {
    for (const source of report.sources) {
      const cited = citations
        .flatMap(c => c.sourceIds)
        .filter(id => id === source.id);
      assert.ok(source.citationCount >= 1, source.id);
      assert.equal(source.citationCount, cited.length, source.id);
    }
  });

  it('numbers sources by first appearance and keeps the exact URL', () => {
    const firstSeen = [...new Set(rawLinks.map(([, , url = '']) => url))];
    assert.deepEqual(
      report.sources.map(s => s.url),
      firstSeen
    );
    report.sources.forEach((source, i) => {
      assert.equal(source.number, i + 1);
      assert.equal(source.id, `s${i + 1}`);
    });
  });
});

describe('text', () => {
  it('keeps every word of the report, in order, with citations removed', () => {
    const fromMarkdown = words(
      markdown
        // The timeline block is checked on its own below.
        .replace(/```mermaid[\s\S]*?```/, '')
        .replace(/\[[^\]]*\]\(https?:\/\/[^)\s]+\)/g, '')
        .split('\n')
        .filter(line => !/^\|?(?:\s*:?-{3,}:?\s*\|?)+$/.test(line))
        .map(line => line.replace(/^(?:#+|\d+\.|[-*])\s/, ''))
        .join('\n')
        .replaceAll('**', '')
        .replaceAll('*', '')
        .replaceAll('|', ' ')
    );
    const fromReport = words(
      [
        report.title,
        ...report.sections.flatMap(s => [
          s.title,
          ...s.blocks.flatMap(blockText),
        ]),
      ].join(' ')
    );
    assert.deepEqual(fromReport, fromMarkdown);
  });

  it('drops only rules that sit right before a top-level heading', () => {
    const rules = [...markdown.matchAll(/^---\n+(.*)$/gm)];
    assert.equal(rules.length, 13);
    for (const [, next] of rules) assert.match(next ?? '', /^## /);
  });

  it('reads the mermaid timeline line by line', () => {
    const block = blocks.find(b => b.kind === 'timeline');
    assert.ok(block?.kind === 'timeline');
    const {title, periods} = block.timeline;
    assert.equal(title, 'Cohort-Aging Waves and Opportunity Timing');
    assert.deepEqual(
      periods.map(p => p.period),
      ['2025', '2030', '2035', '2040', '2050']
    );
    for (const {period, events} of periods) {
      assert.ok(markdown.includes(` ${period} : ${events.join(' : ')}\n`));
    }
  });
});

describe('sections', () => {
  it('keeps every heading at its level', () => {
    const rawHeadings = [...markdown.matchAll(/^(#{2,3}) (.+)$/gm)];
    assert.deepEqual(
      report.sections.map(s => [s.depth, s.title]),
      rawHeadings.map(([, hashes = '', title]) => [hashes.length, title])
    );
  });

  it('gives numbered sections short anchors', () => {
    const ids = report.sections.map(s => s.id);
    assert.ok(ids.includes('s-10-2'));
    assert.ok(ids.includes('s-executive-summary'));
    assert.ok(ids.includes('s-references'));
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe('claims', () => {
  it('has unique ids and only known sources', () => {
    const ids = new Set(report.claims.map(c => c.id));
    assert.equal(ids.size, report.claims.length);
    const sourceIds = new Set(report.sources.map(s => s.id));
    for (const claim of report.claims) {
      for (const id of claim.sourceIds) assert.ok(sourceIds.has(id));
    }
  });

  it('makes each table row one claim, citations included', () => {
    const rows = tables.flatMap(t => t.rows);
    assert.equal(rows.length, 86);
    const cited = rows.filter(r => r.claim.sourceIds.length > 0);
    assert.ok(cited.length > 0, 'some table rows cite sources');
  });
});

describe('splitSentences', () => {
  const text = (value: string): Run => ({
    kind: 'text',
    text: value,
    strong: false,
    emphasis: false,
  });
  const cite = (...sourceIds: string[]): Run => ({kind: 'citation', sourceIds});

  it('attaches a citation after a full stop to the sentence before it', () => {
    const sentences = splitSentences([
      text('Spend fell in 2024.'),
      cite('s2'),
      text(' Retirees dissave slowly.'),
      cite('s3'),
    ]);
    assert.deepEqual(sentences, [
      [text('Spend fell in 2024.'), cite('s2'), text(' ')],
      [text('Retirees dissave slowly.'), cite('s3')],
    ]);
  });

  it('does not end a sentence at "vs." before a number', () => {
    const sentences = splitSentences([
      text('Life expectancy (91.35 vs. 84.95 years) differs. Next.'),
    ]);
    assert.equal(sentences.length, 2);
  });
});

describe('charts', () => {
  /** A cell of `table` as a number, found by its row and column labels. */
  function cell(table: Table, rowLabel: string, columnLabel: string) {
    const column = table.header.findIndex(
      c => textOf(c).trim() === columnLabel
    );
    const row = table.rows.find(
      r => textOf(r.cells[0] ?? []).trim() === rowLabel
    );
    return parseNumber(textOf(row?.cells[column] ?? []).trim());
  }

  const charted = tables.filter(
    (t): t is Table & {chart: NonNullable<Table['chart']>} => !!t.chart
  );

  it('charts the four numeric series tables and nothing else', () => {
    const sectionOf = (table: Table) =>
      report.sections.find(s =>
        s.blocks.some(b => b.kind === 'table' && b.table === table)
      )?.id;
    assert.deepEqual(
      charted.map(t => [sectionOf(t), t.chart.kind]),
      [
        ['s-2-1', 'lines'],
        ['s-10-1', 'parts'],
        ['s-10-2', 'lines'],
        ['s-10-3', 'range'],
      ]
    );
  });

  it("matches every chart value to its table's cell", () => {
    for (const table of charted) {
      const {chart} = table;
      if (chart.kind === 'range') {
        for (const {label, value} of chart.points) {
          assert.equal(cell(table, label, chart.label), value);
        }
        continue;
      }
      const series =
        chart.kind === 'parts'
          ? [...chart.series, chart.total]
          : [...chart.series, ...chart.notes];
      for (const {label, values} of series) {
        chart.years.forEach((year, i) => {
          // Years run across the header (10.1) or down the first column.
          const yearsAcross = table.header.some(
            c => textOf(c).trim() === `${year}`
          );
          const expected = yearsAcross
            ? cell(table, label, `${year}`)
            : cell(table, `${year}`, label);
          assert.equal(values[i], expected, `${label} ${year}`);
        });
      }
    }
  });

  it("treats 10.1's categories as parts because they add up to its total", () => {
    const chart = charted.find(t => t.chart.kind === 'parts')?.chart;
    assert.ok(chart?.kind === 'parts');
    chart.years.forEach((year, i) => {
      const sum = chart.series.reduce((n, s) => n + (s.values[i] ?? 0), 0);
      assert.equal(sum, chart.total.values[i], `${year}`);
    });
  });

  it("keeps 10.2's Divergence column as notes, not a line", () => {
    const chart = charted.find(t =>
      t.header.some(c => textOf(c).trim() === 'Divergence')
    )?.chart;
    assert.ok(chart?.kind === 'lines');
    assert.deepEqual(
      chart.series.map(s => s.label),
      ['Bottom-up (¥tn)', 'Top-down (¥tn)']
    );
    assert.deepEqual(
      chart.notes.map(s => s.label),
      ['Divergence']
    );
  });
});
