import {niceTicks, scaleLinear} from '@/lib/chart/scale.ts';
import {formatValue} from '@/lib/chart/summary.ts';
import type {Chart, Series} from '@/lib/report/types.ts';

import {JaText} from '../ja-text.tsx';

type PartsData = Extract<Chart, {kind: 'parts'}>;

/**
 * The parts of a total as small multiples on one shared scale: seven long
 * category names can't be labelled directly on a stacked bar at phone width.
 * The two parts that grow most carry the accent; that's where the total's
 * growth is.
 */
export function PartsChart({chart}: {chart: PartsData}) {
  const {years, series, total} = chart;
  const ticks = niceTicks(0, Math.max(...series.flatMap(s => s.values)));
  const height = scaleLinear([0, ticks.at(-1) ?? 1], [0, 100]);
  const growth = (s: Series) => (s.values.at(-1) ?? 0) - (s.values[0] ?? 0);
  const leaders = new Set(
    [...series]
      .sort((a, b) => growth(b) - growth(a))
      .slice(0, 2)
      .map(s => s.label)
  );
  const last = years.length - 1;
  const at = (s: Series, i: number) => formatValue(s.values[i] ?? 0, s.values);

  return (
    <div className="parts" aria-hidden>
      <p className="parts-total">
        {total.label}: <strong>{at(total, 0)}</strong> in {years[0]},{' '}
        <strong>{at(total, last)}</strong> in {years[last]}
      </p>
      <ul className="parts-grid">
        {series.map(s => (
          <li
            key={s.label}
            className="part"
            data-tone={leaders.has(s.label) ? 'accent' : 'muted'}
          >
            <p className="part-name">
              <JaText text={s.label} />
            </p>
            <div className="part-bars">
              {s.values.map((value, i) => (
                <div key={years[i]} className="part-bar">
                  <span
                    className="part-fill"
                    style={{height: `${height(value)}%`}}
                  >
                    {(i === 0 || i === last) && (
                      <span className="part-value">{at(s, i)}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="part-years">
              <span>{years[0]}</span>
              <span>{years[last]}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
