/**
 * The typed report model. One `Report` drives every surface: the Brief, the
 * Reader, the Sources index, Trace and the Questions panel.
 */

export interface Report {
  title: string;
  sections: Section[];
  /** Every unique source, in order of first citation. */
  sources: Source[];
  /** Every claim, in reading order. */
  claims: Claim[];
}

export interface Section {
  /** Stable anchor, for example `s-10-2` or `s-executive-summary`. */
  id: string;
  depth: 2 | 3;
  /** The heading as written, including its number. */
  title: string;
  blocks: Block[];
}

export type Block =
  | {kind: 'paragraph'; sentences: Sentence[]}
  | {kind: 'list'; ordered: boolean; start: number; items: Sentence[][]}
  | {kind: 'table'; table: Table}
  | {kind: 'timeline'; timeline: Timeline};

/** Inline content: text with its marks, or one marker for a citation run. */
export type Run = TextRun | Citation;

export interface TextRun {
  kind: 'text';
  text: string;
  strong: boolean;
  emphasis: boolean;
}

/** One run of adjacent citation links, shown as a single marker. */
export interface Citation {
  kind: 'citation';
  /** One id per link, in the order the links appear. */
  sourceIds: string[];
}

export interface Source {
  /** `s` plus `number`; used in the URL (`?trace=s1`). */
  id: string;
  /** Display number, by order of first citation. */
  number: number;
  /** The URL exactly as first written in the report. */
  url: string;
  /** The link text exactly as written, even when the engine cut it short. */
  label: string;
  domain: string;
  year?: number;
  /** How many citation links point here. */
  citationCount: number;
}

/** Where a figure points. See provenance.ts for the rule. */
export type Provenance = 'cited' | 'modeled' | 'unattributed';

/** A sentence, or a table row: the unit that Trace and Questions point at. */
export interface Claim {
  id: string;
  sectionId: string;
  /** Plain text with citations removed. */
  text: string;
  /** Unique source ids cited by this claim, in order. */
  sourceIds: string[];
  /** Only set when the claim contains a figure. */
  provenance?: Provenance;
}

export interface Sentence {
  claim: Claim;
  runs: Run[];
}

export interface Table {
  id: string;
  header: Run[][];
  rows: Row[];
  chart?: Chart;
}

export interface Row {
  claim: Claim;
  cells: Run[][];
}

export interface Series {
  label: string;
  values: number[];
}

export type Chart =
  | {kind: 'stacked-bars'; years: number[]; series: Series[]; total: Series}
  | {kind: 'lines'; years: number[]; series: Series[]}
  | {
      kind: 'range';
      label: string;
      points: Array<{label: string; value: number}>;
    };

export interface Timeline {
  title: string;
  periods: Array<{period: string; events: string[]}>;
}
