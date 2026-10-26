import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {readReportMarkdown} from './content.ts';
import {parseReport} from './parse.ts';
import {classify, countEvidence} from './provenance.ts';
import type {Provenance} from './types.ts';

const report = parseReport(readReportMarkdown());

/** Real sentences from report 51, with the label each must get. */
const examples: Array<{text: string; expected: Provenance | undefined}> = [
  {
    text: 'Real consumption per elderly head fell 1.1% year-on-year in 2024, and Japanese retirees dissave far more slowly than life-cycle theory predicts.',
    expected: 'cited',
  },
  {
    text: 'The 2020 elderly clothing market is an internal model output in the low-single-digit trillions of yen, derived by applying the 2.7%/4.8% shares to the 36,027-thousand headcount under the Chapter 3 consumption level.',
    expected: 'modeled',
  },
  {
    // Modeled wins: the citation is for the IPSS headcount input.
    text: 'The 2020 aggregate (~¥12–13 trillion) is a top-down model output: the firm IPSS headcount of 36.027 million multiplied by a modelled per-capita outlay in the mid-¥300,000s/year.',
    expected: 'modeled',
  },
  {
    text: 'The model projects a ¥28 trillion care line, but if foreign-worker inflows and robotics adoption both run low against the 690,000-worker gap, the realized care market could sit well below its demand envelope despite locked-in demographic need.',
    expected: 'modeled',
  },
  {
    text: 'The ±11% spread is symmetric because the medium-variant headcount is well-pinned — most scenario spread comes from behavioral parameters, not headcount uncertainty.',
    expected: 'unattributed',
  },
  {
    text: 'The estimate rests on three falsifiable claims:',
    expected: undefined,
  },
];

describe('classify', () => {
  for (const {text, expected} of examples) {
    it(`labels "${text.slice(0, 48)}…" as ${expected ?? 'no figure'}`, () => {
      const claim = report.claims.find(c => c.text === text);
      assert.ok(claim, 'the sentence is a claim in report 51');
      assert.equal(claim.provenance, expected);
      assert.equal(
        classify(text, claim.sourceIds.length),
        expected,
        'the rule alone gives the same label'
      );
    });
  }

  it('labels a table row by its header', () => {
    const row = report.claims.find(c =>
      c.text.startsWith('Food (食料) | ~12–13')
    );
    assert.ok(row);
    assert.equal(row.sourceIds.length, 0);
    assert.equal(
      classify(row.text, 0, '2020 elderly spend (model, ¥tn)'),
      'modeled'
    );
    assert.equal(row.provenance, 'modeled');
  });

  it('labels a table row by the note under its table', () => {
    const row = report.claims.find(c =>
      c.text.startsWith('Nursing & LTC (介護) | 11 | 17')
    );
    assert.equal(row?.provenance, 'modeled');
  });
});

describe('countEvidence', () => {
  it('counts every claim with a figure exactly once', () => {
    const evidence = countEvidence(report.claims);
    const withFigure = report.claims.filter(c => c.provenance).length;
    assert.equal(evidence.figures, withFigure);
    assert.equal(
      evidence.cited + evidence.modeled + evidence.unattributed,
      evidence.figures
    );
  });
});
