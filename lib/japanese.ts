// Han ideographs, then the CJK punctuation, kana and full-width blocks by range:
// marks such as ・ and ー belong to no single script.
const CJK = String.raw`[\p{Script=Han}　-ヿ＀-￯]`;

/**
 * A Japanese run: CJK characters, with any digits between them, so "約140兆円"
 * stays one phrase. Digits still render in the Latin face; `lang="ja"` only
 * picks Japanese glyph shapes and line breaking for the CJK characters.
 */
const JAPANESE_RUN = new RegExp(`${CJK}(?:[0-9.,]*${CJK})*`, 'gu');

export interface Segment {
  text: string;
  japanese: boolean;
}

/** Splits text into Latin and Japanese segments, in order. */
export function splitJapanese(text: string): Segment[] {
  const segments: Segment[] = [];
  let index = 0;
  for (const match of text.matchAll(JAPANESE_RUN)) {
    if (match.index > index) {
      segments.push({text: text.slice(index, match.index), japanese: false});
    }
    segments.push({text: match[0], japanese: true});
    index = match.index + match[0].length;
  }
  if (index < text.length) {
    segments.push({text: text.slice(index), japanese: false});
  }
  return segments;
}
