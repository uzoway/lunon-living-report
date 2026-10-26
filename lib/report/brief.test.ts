import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {selectBrief} from './brief.ts';
import {readReportMarkdown} from './content.ts';
import {parseReport} from './parse.ts';
import {countEvidence} from './provenance.ts';

const report = parseReport(readReportMarkdown());
const brief = selectBrief(report);

describe('selectBrief', () => {
  it("leads with the report's own answer", () => {
    assert.match(
      brief.headline.claim.text,
      /^Japan's 65-and-over consumption market will expand to 約140兆円 \(range ¥125–155 trillion, 2050, nominal\)/
    );
  });

  it('takes the verdict paragraph and its table', () => {
    assert.match(brief.verdict[0]?.claim.text ?? '', /^The verdict:/);
    assert.equal(brief.verdictTable.rows.length, 7);
  });

  it('takes the 10.3 scenarios as the range', () => {
    assert.equal(brief.rangeSectionId, 's-10-3');
    assert.deepEqual(
      brief.range.points.map(p => p.value),
      [125, 140, 155]
    );
  });

  it('takes the first sentence of each falsifier', () => {
    assert.deepEqual(
      brief.falsifiers.map(s => s.claim.text.slice(0, 30)),
      [
        'Per-capita decline outpaces he',
        'Care labor shortage caps reali',
        'Policy-regime change (severe p',
      ]
    );
  });

  it("uses the parser's totals for the evidence line", () => {
    assert.equal(brief.sourceCount, 61);
    assert.deepEqual(brief.evidence, countEvidence(report.claims));
  });
});
