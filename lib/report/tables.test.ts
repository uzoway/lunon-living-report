import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {chartFor, parseNumber} from './tables.ts';

describe('parseNumber', () => {
  it('strips ~, ¥, tn, % and +', () => {
    assert.equal(parseNumber('~99'), 99);
    assert.equal(parseNumber('~¥8.5tn'), 8.5);
    assert.equal(parseNumber('+3.0%'), 3);
    assert.equal(parseNumber('~30+'), 30);
  });

  it('rejects ranges, words and dashes', () => {
    assert.equal(parseNumber('~12–13'), undefined);
    assert.equal(parseNumber('~¥8tn (band ¥7–9tn)'), undefined);
    assert.equal(parseNumber('—'), undefined);
    assert.equal(parseNumber('Medium-variant'), undefined);
  });
});

describe('chartFor', () => {
  const row = (cells: string[], bold = false) => ({cells, bold});

  it('treats rows as parts when years run across and a bold total row exists', () => {
    const chart = chartFor({
      header: ['Category', '2020', '2050'],
      rows: [
        row(['Food', '28', '31']),
        row(['Care', '11', '28']),
        row(['Total', '~39', '~59'], true),
      ],
    });
    assert.deepEqual(chart, {
      kind: 'parts',
      years: [2020, 2050],
      series: [
        {label: 'Food', values: [28, 31]},
        {label: 'Care', values: [11, 28]},
      ],
      total: {label: 'Total', values: [39, 59]},
    });
  });

  it('draws lines when years run down, with % columns as notes', () => {
    const chart = chartFor({
      header: [
        'Year',
        'Bottom-up (¥tn)',
        'Top-down (¥tn)',
        'Divergence',
        'Note',
      ],
      rows: [
        row(['2020', '99', '102', '+3.0%', 'actual']),
        row(['2050', '140', '141', '+0.7%', 'model']),
      ],
    });
    assert.deepEqual(chart, {
      kind: 'lines',
      years: [2020, 2050],
      series: [
        {label: 'Bottom-up (¥tn)', values: [99, 140]},
        {label: 'Top-down (¥tn)', values: [102, 141]},
      ],
      notes: [{label: 'Divergence', values: [3, 0.7]}],
    });
  });

  it('turns a scenarios table with one numeric column into a range', () => {
    const chart = chartFor({
      header: ['Scenario', 'Key assumptions', '2050 total (¥tn)', 'vs base'],
      rows: [
        row(['Conservative', 'No reform', '125', '−11%']),
        row(['Base', 'IPSS medium', '140', '—']),
        row(['Optimistic', 'Reform', '155', '+11%']),
      ],
    });
    assert.deepEqual(chart, {
      kind: 'range',
      label: '2050 total (¥tn)',
      points: [
        {label: 'Conservative', value: 125},
        {label: 'Base', value: 140},
        {label: 'Optimistic', value: 155},
      ],
    });
  });

  it('leaves a scenarios table with ranges as a table', () => {
    const chart = chartFor({
      header: ['Scenario', '2050 (¥tn)', 'Nominal CAGR'],
      rows: [row(['Low', '~12', '~0%']), row(['Base', '~13–15', '~0.5–1%'])],
    });
    assert.equal(chart, undefined);
  });
});
