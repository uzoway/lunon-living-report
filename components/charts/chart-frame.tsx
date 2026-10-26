'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';

import {JaText} from '../ja-text.tsx';

/**
 * A chart with its table one tap away. The table keeps the report's rows (and
 * their claims), so a trace that lands on a row switches to it.
 */
export function ChartFrame({
  label,
  summary,
  chart,
  table,
}: {
  label: string;
  summary: string;
  chart: ReactNode;
  table: ReactNode;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    const showTable = () => setView('table');
    element?.addEventListener('showtable', showTable);
    return () => element?.removeEventListener('showtable', showTable);
  }, []);

  return (
    <div ref={root} className="chart-frame" data-chart-frame>
      <div className="view-toggle" role="group" aria-label={`View ${label} as`}>
        {(['chart', 'table'] as const).map(option => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
          >
            {option === 'chart' ? 'Chart' : 'Table'}
          </button>
        ))}
      </div>
      <figure className="chart" hidden={view !== 'chart'}>
        {chart}
        <figcaption className="sr-only">
          <JaText text={summary} />
        </figcaption>
      </figure>
      <div hidden={view !== 'table'}>{table}</div>
    </div>
  );
}
