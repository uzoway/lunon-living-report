import type {Chart, Series} from '../report/types.ts';

/**
 * Formats a value with as many decimals as its series uses anywhere, so a
 * series written "36.0 … 33.7" shows 36.0, as the table does, not 36.
 */
export function formatValue(value: number, series: number[]): string {
  const decimals = Math.max(
    ...series.map(v => (String(v).split('.')[1] ?? '').length)
  );
  return value.toFixed(decimals);
}

/** A percentage note as the report writes it, such as "+3.0%". */
export function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * The one-paragraph text equivalent of a chart for screen readers: each
 * series from its first value to its last. Built from the data, never
 * written by hand, so it can't say more than the table does.
 */
export function chartSummary(chart: Chart): string {
  if (chart.kind === 'range') {
    const points = chart.points.map(p => `${p.label} ${p.value}`);
    return `${chart.label} by scenario: ${points.join(', ')}.`;
  }
  const first = chart.years[0];
  const last = chart.years.at(-1);
  const span = ({label, values}: Series) =>
    `${label} ${formatValue(values[0] ?? 0, values)} in ${first}, ` +
    `${formatValue(values.at(-1) ?? 0, values)} in ${last}`;
  const series =
    chart.kind === 'parts' ? [...chart.series, chart.total] : chart.series;
  const sentences = [`${series.map(span).join('; ')}.`];
  if (chart.kind === 'lines') {
    for (const note of chart.notes) {
      const values = chart.years.map(
        (year, i) => `${year} ${formatPercent(note.values[i] ?? 0)}`
      );
      sentences.push(`${note.label}: ${values.join(', ')}.`);
    }
  }
  return sentences.join(' ');
}
