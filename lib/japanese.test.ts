import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {splitJapanese} from './japanese.ts';

describe('splitJapanese', () => {
  it('keeps a Japanese phrase with digits together', () => {
    assert.deepEqual(splitJapanese('expand to 約140兆円 (range ¥125–155)'), [
      {text: 'expand to ', japanese: false},
      {text: '約140兆円', japanese: true},
      {text: ' (range ¥125–155)', japanese: false},
    ]);
  });

  it('includes full-width punctuation in the run', () => {
    assert.deepEqual(
      splitJapanese('約140兆円（区間125〜155兆円、2050年・名目）'),
      [{text: '約140兆円（区間125〜155兆円、2050年・名目）', japanese: true}]
    );
  });

  it('leaves Latin-only text alone', () => {
    assert.deepEqual(splitJapanese('Food (食料)'), [
      {text: 'Food (', japanese: false},
      {text: '食料', japanese: true},
      {text: ')', japanese: false},
    ]);
    assert.deepEqual(splitJapanese('Base 140'), [
      {text: 'Base 140', japanese: false},
    ]);
  });
});
