import {JaText} from './ja-text.tsx';

/** Heading text that keeps a year range such as "2020–2050" on one line. */
export function HeadingText({text}: {text: string}) {
  return text.split(/(\d{4}–\d{4})/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      <JaText key={i} text={part} />
    )
  );
}
