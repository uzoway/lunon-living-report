import type {ReactNode} from 'react';

import type {RangeChart} from '@/lib/report/brief.ts';
import {scaleLinear} from '@/lib/chart/scale.ts';

/**
 * The scenarios as points on a number line, the base case marked. Like every
 * chart here it's drawn for the eye; the figure around it carries the text.
 */
export function RangeBar({
  range,
  caption,
}: {
  range: RangeChart;
  caption?: ReactNode;
}) {
  const values = range.points.map(p => p.value);
  const x = scaleLinear([Math.min(...values), Math.max(...values)], [0, 100]);
  return (
    <div className="range">
      <div className="range-track" aria-hidden>
        {range.points.map(point => (
          <div
            key={point.label}
            className="range-point"
            data-base={point.label === 'Base' ? '' : undefined}
            // Shifting by the same share as the position keeps the first
            // label flush left, the middle one centered and the last flush right.
            style={{
              left: `${x(point.value)}%`,
              translate: `${-x(point.value)}%`,
            }}
          >
            <span className="range-value">{point.value}</span>
            <span className="range-tick" />
            <span className="range-name">{point.label}</span>
          </div>
        ))}
      </div>
      <p className="range-caption">
        {range.label}, by scenario.{caption && <> {caption}</>}
      </p>
    </div>
  );
}
