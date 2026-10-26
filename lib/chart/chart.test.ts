import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {spreadLabels} from './labels.ts';
import {niceTicks, scaleLinear} from './scale.ts';
import {chartSummary, formatValue} from './summary.ts';

describe('scaleLinear', () => {
  it('maps the domain onto the range', () => {
    const x = scaleLinear([125, 155], [0, 100]);
    assert.deepEqual([125, 140, 155].map(x), [0, 50, 100]);
  });
});

describe('niceTicks', () => {
  it('covers the data with round steps', () => {
    assert.deepEqual(niceTicks(99, 141), [80, 100, 120, 140, 160]);
    assert.deepEqual(niceTicks(33.7, 126.1), [0, 50, 100, 150]);
    assert.deepEqual(niceTicks(0, 32), [0, 10, 20, 30, 40]);
  });

  it('avoids float drift on decimal steps', () => {
    assert.deepEqual(niceTicks(0.1, 0.9), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  });
});

describe('spreadLabels', () => {
  it('leaves labels that already fit alone', () => {
    assert.deepEqual(spreadLabels([10, 50, 90], 8, [0, 100]), [10, 50, 90]);
  });

  it('pushes colliding labels apart in their order', () => {
    // 10.2 ends at 140 and 141: two labels on almost the same line.
    assert.deepEqual(spreadLabels([20, 18], 10, [0, 100]), [28, 18]);
  });

  it('keeps labels inside the bounds', () => {
    assert.deepEqual(spreadLabels([96, 98, 99], 10, [0, 100]), [80, 90, 100]);
  });
});

describe('chartSummary', () => {
  it('reads each line from first to last value, then the notes', () => {
    assert.equal(
      chartSummary({
        kind: 'lines',
        years: [2020, 2050],
        series: [{label: 'Bottom-up (¥tn)', values: [99, 140]}],
        notes: [{label: 'Divergence', values: [3, 0.7]}],
      }),
      'Bottom-up (¥tn) 99 in 2020, 140 in 2050. Divergence: 2020 +3.0%, 2050 +0.7%.'
    );
  });

  it('lists a range by scenario', () => {
    assert.equal(
      chartSummary({
        kind: 'range',
        label: '2050 total (¥tn)',
        points: [
          {label: 'Conservative', value: 125},
          {label: 'Base', value: 140},
        ],
      }),
      '2050 total (¥tn) by scenario: Conservative 125, Base 140.'
    );
  });
});

describe('formatValue', () => {
  it("keeps the series' decimals, as the table writes them", () => {
    assert.equal(formatValue(36, [36, 37, 33.7]), '36.0');
    assert.equal(formatValue(140, [99, 117, 140]), '140');
  });
});
