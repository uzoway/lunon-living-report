import type {Claim, Provenance} from './types.ts';

/** Phrases the report uses when a figure is its own model output. */
const MODELED = /model output|internal model|modeled|\(model|the model/i;

/** Any digit, including full-width ones. */
const FIGURE = /\p{Nd}/u;

/**
 * Labels a claim that contains a figure. Modeled wins over cited, because a
 * modeled figure often cites its inputs, and the citation is not the figure's
 * source. `context` is a table's header and caption, which label every row.
 */
export function classify(
  text: string,
  sourceCount: number,
  context = ''
): Provenance | undefined {
  if (!FIGURE.test(text)) return undefined;
  if (MODELED.test(text) || MODELED.test(context)) return 'modeled';
  return sourceCount > 0 ? 'cited' : 'unattributed';
}

export interface Evidence {
  figures: number;
  cited: number;
  modeled: number;
  unattributed: number;
}

/** The totals behind the Brief's evidence line. */
export function countEvidence(claims: Claim[]): Evidence {
  const evidence: Evidence = {
    figures: 0,
    cited: 0,
    modeled: 0,
    unattributed: 0,
  };
  for (const {provenance} of claims) {
    if (!provenance) continue;
    evidence.figures++;
    evidence[provenance]++;
  }
  return evidence;
}
