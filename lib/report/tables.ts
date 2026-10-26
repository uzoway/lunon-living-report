import type {Chart, Series} from './types.ts';

/** A table as plain cell text, which is all chart detection needs. */
export interface PlainTable {
  header: string[];
  rows: PlainRow[];
}

export interface PlainRow {
  cells: string[];
  /** The report sets total rows entirely in bold. */
  bold: boolean;
}

interface Column extends Series {
  cells: string[];
}

/**
 * Reads a cell as a number once `~`, `¥`, `tn`, `%` and `+` are stripped.
 * Ranges such as `~12–13` are not numbers, so their column stays a table.
 */
export function parseNumber(cell: string): number | undefined {
  const value = cell.replace(/[~¥%+\s]|tn/g, '');
  return /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : undefined;
}

/**
 * Picks a chart for a numeric series table, or none. Years across the header
 * (10.1) make each row a series; years down the first column (10.2) make each
 * numeric column a series; a scenarios table (10.3) becomes a range bar.
 */
export function chartFor(table: PlainTable): Chart | undefined {
  return yearsAcross(table) ?? yearsDown(table) ?? scenarioRange(table);
}

function yearsAcross({header, rows}: PlainTable): Chart | undefined {
  const yearCells = header.slice(1);
  if (yearCells.length < 2 || !yearCells.every(isYear)) return undefined;
  const series: Series[] = [];
  let total: Series | undefined;
  for (const {cells, bold} of rows) {
    const values = numbers(cells.slice(1));
    if (!values) continue;
    const row = {label: cells[0] ?? '', values};
    if (bold) {
      total = row;
    } else {
      series.push(row);
    }
  }
  if (series.length === 0) return undefined;
  const years = yearCells.map(Number);
  // A total row only makes sense on top of a stack; without one, draw lines.
  return total
    ? {kind: 'stacked-bars', years, series, total}
    : {kind: 'lines', years, series};
}

function yearsDown(table: PlainTable): Chart | undefined {
  const firstCells = table.rows.map(row => row.cells[0] ?? '');
  if (firstCells.length < 2 || !firstCells.every(isYear)) return undefined;
  const columns = numericColumns(table);
  // Percentages can't share an axis with amounts (10.2's Divergence column),
  // so they're charted only when nothing else is.
  const amounts = columns.filter(
    c => !c.cells.every(cell => cell.includes('%'))
  );
  const charted = amounts.length > 0 ? amounts : columns;
  if (charted.length === 0) return undefined;
  return {
    kind: 'lines',
    years: firstCells.map(Number),
    series: charted.map(({label, values}) => ({label, values})),
  };
}

function scenarioRange(table: PlainTable): Chart | undefined {
  if (table.header[0] !== 'Scenario') return undefined;
  const [column, ...others] = numericColumns(table);
  if (!column || others.length > 0) return undefined;
  return {
    kind: 'range',
    label: column.label,
    points: table.rows.map(({cells}, i) => ({
      label: cells[0] ?? '',
      value: column.values[i] ?? 0,
    })),
  };
}

/** Columns after the first whose every cell reads as a number. */
function numericColumns({header, rows}: PlainTable): Column[] {
  return header.slice(1).flatMap((label, i) => {
    const cells = rows.map(row => row.cells[i + 1] ?? '');
    const values = numbers(cells);
    return values ? [{label, values, cells}] : [];
  });
}

function numbers(cells: string[]): number[] | undefined {
  const values = cells.map(parseNumber);
  return values.every(value => value !== undefined) ? values : undefined;
}

function isYear(cell: string): boolean {
  return /^\d{4}$/.test(cell);
}
