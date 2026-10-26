import {Fragment} from 'react';

import {splitJapanese} from '@/lib/japanese.ts';

/**
 * Japanese can break between any two characters, which splits short words
 * such as 住居 across lines in narrow columns. Runs up to this length stay
 * whole; longer ones, like source titles, still wrap.
 */
const KEEP_WHOLE = 8;

/** Text with its Japanese runs marked `lang="ja"`. */
export function JaText({text}: {text: string}) {
  return splitJapanese(text).map((segment, i) => (
    <Fragment key={i}>
      {segment.japanese ? (
        <span
          lang="ja"
          className={
            segment.text.length <= KEEP_WHOLE ? 'whitespace-nowrap' : undefined
          }
        >
          {segment.text}
        </span>
      ) : (
        segment.text
      )}
    </Fragment>
  ));
}
