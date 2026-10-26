import type {ReactNode} from 'react';

import {shortName} from '@/lib/report/sources.ts';
import type {Citation, Run, Source, TextRun} from '@/lib/report/types.ts';

import {JaText} from './ja-text.tsx';

export type SourceLookup = ReadonlyMap<string, Source>;

const GLUE_LIMIT = 12;

/**
 * Inline report text. A citation is drawn as one marker, glued to the word
 * before it so a line never starts with a marker. `after` (a provenance
 * label) is glued to the end the same way.
 */
export function Runs({
  runs,
  sources,
  after,
}: {
  runs: Run[];
  sources: SourceLookup;
  after?: ReactNode;
}) {
  const nodes: ReactNode[] = [];
  runs.forEach((run, i) => {
    if (run.kind === 'citation') {
      // Only a citation that opens a block isn't drawn with the text before it.
      if (i === 0) {
        nodes.push(<Marker key={i} citation={run} sources={sources} />);
      }
      return;
    }
    const next = runs[i + 1];
    const marker = next?.kind === 'citation' ? next : undefined;
    const isEnd = i + (marker ? 1 : 0) === runs.length - 1;
    const tail = isEnd ? after : undefined;
    if (!marker && !tail) {
      nodes.push(<Text key={i} run={run} />);
      return;
    }
    // Glue the last word, but at most its last few characters: Japanese has
    // no spaces, and gluing a whole Japanese phrase would stop it wrapping.
    // A Latin word split here still can't break, since spans aren't spaces.
    const lastWord = run.text.search(/\S+\s*$/);
    const split = Math.max(
      lastWord === -1 ? run.text.length : lastWord,
      run.text.length - GLUE_LIMIT
    );
    nodes.push(
      <Text key={i} run={{...run, text: run.text.slice(0, split)}} />,
      <span key={`${i}-glue`} className="glue">
        <Text run={{...run, text: run.text.slice(split)}} />
        {marker && <Marker citation={marker} sources={sources} />}
        {tail}
      </span>
    );
  });
  return nodes;
}

function Text({run}: {run: TextRun}) {
  if (!run.text) return null;
  let node: ReactNode = <JaText text={run.text} />;
  if (run.emphasis) node = <em>{node}</em>;
  if (run.strong) node = <strong>{node}</strong>;
  return node;
}

/**
 * A plain button: SourceCards opens the card by listening for clicks on the
 * page, so the 180 markers ship no JavaScript of their own.
 */
function Marker({
  citation,
  sources,
}: {
  citation: Citation;
  sources: SourceLookup;
}) {
  const ids = [...new Set(citation.sourceIds)];
  const cited = ids.flatMap(id => sources.get(id) ?? []);
  const [first] = cited;
  if (!first) throw new Error(`Unknown source in ${ids.join(', ')}`);
  const label =
    cited.length === 1
      ? `Source: ${shortName(first)}`
      : `${cited.length} sources: ${shortName(first)} and ${cited.length - 1} more`;
  return (
    <button
      type="button"
      className="marker"
      data-sources={ids.join(' ')}
      data-cluster={cited.length > 1 ? '' : undefined}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded="false"
    >
      {cited.length === 1 ? first.number : cited.length}
    </button>
  );
}
