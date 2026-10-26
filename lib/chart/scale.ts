/** Maps a value in `domain` linearly onto `range`. Shared by every chart. */
export function scaleLinear(
  [d0, d1]: [number, number],
  [r0, r1]: [number, number]
): (value: number) => number {
  const span = d1 - d0 || 1;
  return value => r0 + ((value - d0) / span) * (r1 - r0);
}
