/**
 * Fractional ("midpoint") ordering for cards within a column and columns within a board.
 *
 * Each item carries a numeric `position`. To place an item between two neighbors we take
 * the midpoint of their positions, so a move is a single-row write — no re-indexing of
 * siblings. Positions are seeded `STEP` apart; only when two neighbors drift within
 * `MIN_GAP` of each other (after many inserts in one spot) do we rebalance the lane.
 */

export const STEP = 1024;
export const MIN_GAP = 1e-6;

/**
 * Position for an item inserted between `before` and `after` (either may be null at an end).
 * Precondition for the two-sided case: before < after.
 */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return STEP; // first item in an empty column
  if (after === null) return before! + STEP; // append to the end
  if (before === null) return after / 2; // prepend to the front
  if (!(before < after)) {
    throw new Error(
      `positionBetween: expected before < after, got before=${before}, after=${after}`,
    );
  }
  return (before + after) / 2; // midpoint between two neighbors
}

/** True when the midpoint between two neighbors would collide / lose float precision. */
export function needsRebalance(before: number | null, after: number | null): boolean {
  if (before === null || after === null) return false; // open-ended: always room
  return after - before < MIN_GAP;
}

/** Evenly re-space an ascending list of positions to [STEP, 2*STEP, ...], preserving order. */
export function rebalance(positions: number[]): number[] {
  return positions.map((_, i) => (i + 1) * STEP);
}

/**
 * Given the ascending positions already in the target lane (excluding the card being moved)
 * and the destination slot `toIndex` (0..length), return the new position and whether the
 * lane should be rebalanced afterward.
 */
export function positionForMove(
  orderedPositions: number[],
  toIndex: number,
): { position: number; rebalance: boolean } {
  const before = toIndex > 0 ? orderedPositions[toIndex - 1] ?? null : null;
  const after = toIndex < orderedPositions.length ? orderedPositions[toIndex] ?? null : null;
  return {
    position: positionBetween(before, after),
    rebalance: needsRebalance(before, after),
  };
}
