import type {CSSProperties} from 'react';

import {spreadLabels} from '@/lib/chart/labels.ts';
import {niceTicks, scaleLinear} from '@/lib/chart/scale.ts';
import {formatPercent, formatValue} from '@/lib/chart/summary.ts';
import type {Chart} from '@/lib/report/types.ts';

type LinesData = Extract<Chart, {kind: 'lines'}>;

const PLOT_HEIGHT_REM = 13;
/** One label line, as a share of the plot height, for spacing end labels. */
const LABEL_GAP = (1.375 / PLOT_HEIGHT_REM) * 100;

/**
 * Lines over years with direct labels at their ends, no legend. The SVG is
 * stretched to the plot, so its strokes don't scale; text is HTML on top,
 * placed in percentages, so it stays crisp at any width.
 */
export function LinesChart({chart}: {chart: LinesData}) {
  const {years, series, notes} = chart;
  const values = series.flatMap(s => s.values);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const y = scaleLinear([ticks[0] ?? 0, ticks.at(-1) ?? 1], [100, 0]);
  const x = scaleLinear([years[0] ?? 0, years.at(-1) ?? 1], [3, 97]);
  // The last series is the one the table builds up to; the others are context.
  const tone = (i: number) => (i === series.length - 1 ? 'accent' : 'muted');
  const ends = series.map(s => y(s.values.at(-1) ?? 0));
  const keyTops = spreadLabels(ends, LABEL_GAP, [0, 100]);
  const points = (seriesValues: number[]) =>
    seriesValues.map((v, i) => `${x(years[i] ?? 0)},${y(v)}`);
  const [lower, upper] = series;
  // Two series with a percentage note between them: shade the gap it measures.
  const band =
    notes.length > 0 && lower && upper && series.length === 2
      ? [...points(lower.values), ...points(upper.values).reverse()].join(' ')
      : undefined;
  const style = {'--plot-height': `${PLOT_HEIGHT_REM}rem`} as CSSProperties;

  return (
    <div className="lines" style={style} aria-hidden>
      <div className="lines-ticks">
        {ticks.map(tick => (
          <span key={tick} style={{top: `${y(tick)}%`}}>
            {tick}
          </span>
        ))}
      </div>
      <div className="lines-plot">
        {ticks.map(tick => (
          <span
            key={tick}
            className="lines-grid"
            style={{top: `${y(tick)}%`}}
          />
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          {band && <polygon className="lines-band" points={band} />}
          {series.map((s, i) => (
            <polyline
              key={s.label}
              data-tone={tone(i)}
              points={points(s.values).join(' ')}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {series.map((s, i) =>
          s.values.map((value, j) => {
            const left = x(years[j] ?? 0);
            const isEnd = j === 0 || j === s.values.length - 1;
            // Of the values at this year, the highest is labelled above.
            const isTop = series.every(o => (o.values[j] ?? 0) <= value);
            return (
              <span
                key={`${s.label}-${j}`}
                className="lines-dot"
                data-tone={tone(i)}
                style={{left: `${left}%`, top: `${y(value)}%`}}
              >
                {isEnd && (
                  <span
                    className="lines-value"
                    data-place={isTop ? 'above' : 'below'}
                    style={{translate: `${-left}% 0`}}
                  >
                    {formatValue(value, s.values)}
                  </span>
                )}
              </span>
            );
          })
        )}
      </div>
      <div className="lines-keys">
        <svg viewBox="0 0 10 100" preserveAspectRatio="none">
          {series.map((s, i) => (
            <polyline
              key={s.label}
              points={`0,${ends[i]} 10,${keyTops[i]}`}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {series.map((s, i) => (
          <span
            key={s.label}
            className="lines-key"
            data-tone={tone(i)}
            style={{top: `${keyTops[i]}%`}}
          >
            {s.label}
          </span>
        ))}
      </div>
      <div className="lines-axis">
        {years.map(year => (
          <span key={year} style={{left: `${x(year)}%`}}>
            {year}
          </span>
        ))}
      </div>
      {notes.map(note => [
        <div key={note.label} className="lines-axis lines-notes">
          {note.values.map((value, i) => (
            <span key={years[i]} style={{left: `${x(years[i] ?? 0)}%`}}>
              {formatPercent(value)}
            </span>
          ))}
        </div>,
        <span key={`${note.label}-label`} className="lines-note-label">
          {note.label}
        </span>,
      ])}
    </div>
  );
}
