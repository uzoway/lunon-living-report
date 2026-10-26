/**
 * Moves label positions apart until neighbors are at least `gap` apart,
 * keeping them inside [min, max] and in their original order. Labels drawn
 * away from their mark get a leader line back to it.
 */
export function spreadLabels(
  positions: number[],
  gap: number,
  [min, max]: [number, number]
): number[] {
  const labels = positions
    .map((position, index) => ({position, index}))
    .sort((a, b) => a.position - b.position);
  // Push each label below the one before it, then pull the stack back up if
  // it ran past the bottom.
  let floor = min;
  for (const label of labels) {
    label.position = Math.max(label.position, floor);
    floor = label.position + gap;
  }
  let ceiling = max;
  for (const label of [...labels].reverse()) {
    label.position = Math.min(label.position, ceiling);
    ceiling = label.position - gap;
  }
  const placed = [...positions];
  for (const {index, position} of labels) placed[index] = position;
  return placed;
}
