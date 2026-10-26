import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {domainOf, normalizeUrl, yearOf} from './sources.ts';

describe('normalizeUrl', () => {
  it('lowercases the host and drops the fragment', () => {
    assert.equal(
      normalizeUrl('https://WWW.IPSS.go.jp/Data/T02-07.htm#Sheet1'),
      'https://www.ipss.go.jp/Data/T02-07.htm'
    );
  });

  it('keeps the path and query exactly', () => {
    const url = 'https://www.sje.ac.kr/_PR/view/?aidx=26573&bidx=2259';
    assert.equal(normalizeUrl(url), url);
    assert.notEqual(
      normalizeUrl('https://example.com/Report'),
      normalizeUrl('https://example.com/report')
    );
  });
});

describe('domainOf', () => {
  it('drops a leading www, including numbered ones', () => {
    assert.equal(domainOf('https://www.ipss.go.jp/a'), 'ipss.go.jp');
    assert.equal(domainOf('https://www8.cao.go.jp/a'), 'cao.go.jp');
    assert.equal(
      domainOf('https://pmc.ncbi.nlm.nih.gov/a'),
      'pmc.ncbi.nlm.nih.gov'
    );
  });
});

describe('yearOf', () => {
  it('reads the publication year from real labels', () => {
    assert.equal(
      yearOf(
        '国立社会保障・人口問題研究所, "人口統計資料集2023改訂版, 表２－７," IPSS 2023.'
      ),
      2023
    );
    assert.equal(
      yearOf('Ehrlich, I. & Yin, Y. 2022, NBER Working Paper 29649.'),
      2022
    );
    assert.equal(
      yearOf('Cosmo Lab 2025 Senior Consumption Intent and Reality Report.'),
      2025
    );
  });

  it('skips ranges instead of guessing', () => {
    assert.equal(
      yearOf('将来推計人口の年齢構造に関する指標：1995～2050年.'),
      undefined
    );
    assert.equal(
      yearOf(
        'Hakuhodo Institute of Life and Living, "Japanese Elderly People: 30 Years of Change 1986-2'
      ),
      undefined
    );
  });

  it('skips forecast horizons after the report was written', () => {
    assert.equal(
      yearOf('Grand View Research, Japan Senior Living Market Outlook 2033.'),
      undefined
    );
  });

  it('returns nothing for a label cut off before its year', () => {
    assert.equal(
      yearOf(
        '"Dissaving by the Elderly in Japan: Empirical Evidence from Survey Data," Seoul Journal of'
      ),
      undefined
    );
  });
});
