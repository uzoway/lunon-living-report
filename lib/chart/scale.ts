/** Maps a value in `domain` linearly onto `range`. Shared by every chart. */
export function scaleLinear(
  [d0, d1]: [number, number],
  [r0, r1]: [number, number]
): (value: number) => number {
  const span = d1 - d0 || 1;
  return value => r0 + ((value - d0) / span) * (r1 - r0);
}

/**
 * Round tick values that cover `min` to `max` in about `count` steps of 1, 2
 * or 5 times a power of ten. The first and last ticks are the axis domain.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const rough = (max - min) / count || 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map(m => m * power).find(s => s >= rough) ?? rough;
  const first = Math.floor(min / step);
  const last = Math.ceil(max / step);
  // Multiplying whole steps avoids float drift such as 0.30000000000000004.
  return Array.from({length: last - first + 1}, (_, i) =>
    Number(((first + i) * step).toPrecision(12))
  );
}
