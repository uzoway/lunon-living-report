import type {
  Link,
  List,
  PhrasingContent,
  RootContent,
  Table as MarkdownTable,
} from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import {unified} from 'unified';

import {classify} from './provenance.ts';
import {domainOf, normalizeUrl, yearOf} from './sources.ts';
import {chartFor} from './tables.ts';
import type {
  Block,
  Claim,
  Report,
  Run,
  Section,
  Sentence,
  Source,
  Table,
  Timeline,
} from './types.ts';

const segmenter = new Intl.Segmenter('en', {granularity: 'sentence'});

/**
 * The segmenter ends a sentence at "vs." when a number follows ("91.35 vs.
 * 84.95 years"). It's the only abbreviation in the report that trips it.
 */
const ENDS_WITH_VS = /\bvs\.\s*$/;

/**
 * Turns the report's markdown into the typed model. Throws on any markdown it
 * doesn't handle, so nothing can be dropped silently.
 */
export function parseReport(markdown: string): Report {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const parser = new ReportParser();
  let title = '';
  const sections: Section[] = [];

  tree.children.forEach((node, i) => {
    if (node.type === 'heading') {
      const text = plainText(node.children);
      if (node.depth === 1) {
        title = text;
        return;
      }
      if (node.depth !== 2 && node.depth !== 3) {
        throw new Error(`Unexpected heading depth ${node.depth}: ${text}`);
      }
      const section: Section = {
        id: sectionId(text),
        depth: node.depth,
        title: text,
        blocks: [],
      };
      if (sections.some(({id}) => id === section.id)) {
        throw new Error(`Duplicate section id: ${section.id}`);
      }
      sections.push(section);
      parser.sectionId = section.id;
      return;
    }
    // Every rule in the report sits right before a top-level heading, which
    // already separates the text.
    if (node.type === 'thematicBreak') return;
    const section = sections.at(-1);
    if (!section) {
      throw new Error(`Content before the first section: ${node.type}`);
    }
    section.blocks.push(
      parser.block(node, tree.children[i - 1], tree.children[i + 1])
    );
  });

  return {
    title,
    sections,
    sources: [...parser.sources.values()],
    claims: parser.claims,
  };
}

/** Holds what accumulates across the walk: sources, claims and table ids. */
class ReportParser {
  /** Keyed by normalized URL. */
  readonly sources = new Map<string, Source>();
  readonly claims: Claim[] = [];
  sectionId = '';
  private tableCount = 0;

  block(node: RootContent, before?: RootContent, after?: RootContent): Block {
    switch (node.type) {
      case 'paragraph':
        return {kind: 'paragraph', sentences: this.sentences(node.children)};
      case 'list':
        return this.list(node);
      case 'table':
        // Markdown has no captions, so the paragraphs on either side stand in.
        return {kind: 'table', table: this.table(node, [before, after])};
      case 'code':
        if (node.lang !== 'mermaid') break;
        return {kind: 'timeline', timeline: parseTimeline(node.value)};
      default:
        break;
    }
    throw new Error(`Unsupported markdown block: ${node.type}`);
  }

  private list(node: List): Block {
    const items = node.children.map(item => {
      const [paragraph, ...rest] = item.children;
      if (paragraph?.type !== 'paragraph' || rest.length > 0) {
        throw new Error('Unsupported list item: expected one paragraph');
      }
      return this.sentences(paragraph.children);
    });
    return {
      kind: 'list',
      ordered: node.ordered ?? false,
      start: node.start ?? 1,
      items,
    };
  }

  private table(
    node: MarkdownTable,
    neighbors: Array<RootContent | undefined>
  ): Table {
    const [headerRow, ...bodyRows] = node.children.map(row =>
      row.children.map(cell => this.runs(cell.children))
    );
    const header = headerRow ?? [];
    const captions = neighbors.flatMap(n =>
      n?.type === 'paragraph' ? [plainText(n.children)] : []
    );
    const context = [...header.map(textOf), ...captions].join(' ');

    const rows = bodyRows.map(cells => ({
      claim: this.claim(
        cells.map(cell => textOf(cell).trim()).join(' | '),
        cells.flat(),
        context
      ),
      cells,
    }));
    const chart = chartFor({
      header: header.map(cell => textOf(cell).trim()),
      rows: rows.map(({cells}) => ({
        cells: cells.map(cell => textOf(cell).trim()),
        bold: cells.flat().every(run => run.kind === 'citation' || run.strong),
      })),
    });
    this.tableCount++;
    return {id: `t${this.tableCount}`, header, rows, chart};
  }

  private sentences(nodes: PhrasingContent[]): Sentence[] {
    return splitSentences(this.runs(nodes)).map(runs => ({
      claim: this.claim(textOf(runs).trim(), runs),
      runs,
    }));
  }

  private claim(text: string, runs: Run[], context = ''): Claim {
    const sourceIds = [
      ...new Set(
        runs.flatMap(run => (run.kind === 'citation' ? run.sourceIds : []))
      ),
    ];
    const claim: Claim = {
      id: `c${this.claims.length + 1}`,
      sectionId: this.sectionId,
      text,
      sourceIds,
      provenance: classify(text, sourceIds.length, context),
    };
    this.claims.push(claim);
    return claim;
  }

  /** Flattens inline markdown, merging adjacent links into one citation. */
  private runs(
    nodes: PhrasingContent[],
    strong = false,
    emphasis = false
  ): Run[] {
    const runs: Run[] = [];
    for (const node of nodes) {
      switch (node.type) {
        case 'text':
          runs.push({kind: 'text', text: node.value, strong, emphasis});
          break;
        case 'strong':
          runs.push(...this.runs(node.children, true, emphasis));
          break;
        case 'emphasis':
          runs.push(...this.runs(node.children, strong, true));
          break;
        case 'link': {
          const sourceId = this.cite(node);
          const previous = runs.at(-1);
          if (previous?.kind === 'citation') {
            previous.sourceIds.push(sourceId);
          } else {
            runs.push({kind: 'citation', sourceIds: [sourceId]});
          }
          break;
        }
        default:
          throw new Error(`Unsupported inline markdown: ${node.type}`);
      }
    }
    return runs;
  }

  /** Records one citation link and returns its source id. */
  private cite(link: Link): string {
    if (!/^https?:\/\//i.test(link.url)) {
      throw new Error(`Link is not an http(s) citation: ${link.url}`);
    }
    const key = normalizeUrl(link.url);
    let source = this.sources.get(key);
    if (!source) {
      const number = this.sources.size + 1;
      const label = plainText(link.children);
      source = {
        id: `s${number}`,
        number,
        url: link.url,
        label,
        domain: domainOf(link.url),
        year: yearOf(label),
        citationCount: 0,
      };
      this.sources.set(key, source);
    }
    source.citationCount++;
    return source.id;
  }
}

/**
 * Splits runs into sentences with `Intl.Segmenter`, measured on the text with
 * citations removed. A citation belongs to the sentence it follows.
 */
export function splitSentences(runs: Run[]): Run[][] {
  const text = textOf(runs);
  const ends = Array.from(
    segmenter.segment(text),
    ({index, segment}) => index + segment.length
  ).filter(end => !ENDS_WITH_VS.test(text.slice(0, end)));
  let current: Run[] = [];
  const sentences = [current];
  let offset = 0;

  for (const run of runs) {
    if (run.kind === 'citation') {
      current.push(run);
      continue;
    }
    let rest = run.text;
    while (rest) {
      const end = ends[sentences.length - 1] ?? text.length;
      if (offset === end) {
        current = [];
        sentences.push(current);
        continue;
      }
      const piece = rest.slice(0, end - offset);
      current.push({...run, text: piece});
      offset += piece.length;
      rest = rest.slice(piece.length);
    }
  }
  return sentences;
}

/** Reads the report's mermaid `timeline` block into periods and events. */
export function parseTimeline(code: string): Timeline {
  const [kind, ...lines] = code
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  if (kind !== 'timeline') {
    throw new Error(`Unsupported mermaid diagram: ${kind}`);
  }
  let title = '';
  const periods: Timeline['periods'] = [];
  for (const line of lines) {
    if (line.startsWith('title ')) {
      title = line.slice('title '.length).trim();
      continue;
    }
    const [period, ...events] = line.split(':').map(part => part.trim());
    if (!period || events.length === 0) {
      throw new Error(`Unsupported timeline line: ${line}`);
    }
    periods.push({period, events});
  }
  return {title, periods};
}

/** `s-10-2` for "10.2 Top-down cross-check", `s-references` for "References". */
function sectionId(title: string): string {
  const number = /^(\d+(?:\.\d+)*)\.?\s/.exec(title)?.[1];
  const slug = number
    ? number.replaceAll('.', '-')
    : title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
  return `s-${slug}`;
}

/** The text of a run list, with citations removed. */
export function textOf(runs: Run[]): string {
  return runs.map(run => (run.kind === 'text' ? run.text : '')).join('');
}

/** Inline markdown as plain text. Citation links are not part of the text. */
function plainText(nodes: PhrasingContent[]): string {
  return nodes
    .map(node => {
      if (node.type === 'text') return node.value;
      if (node.type === 'link') return '';
      if (node.type === 'strong' || node.type === 'emphasis') {
        return plainText(node.children);
      }
      throw new Error(`Unsupported markdown in plain text: ${node.type}`);
    })
    .join('');
}
