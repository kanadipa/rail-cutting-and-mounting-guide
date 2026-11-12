/** Empty rail longer than this before a part is worth a warning; less is model tolerance. */
export const GAP_WARNING_MM = 2;

export interface GapInput {
  xStartMm: number;
  xEndMm: number;
  /** True for parts that sit on the rail itself, not on another part. */
  onRail: boolean;
}

/**
 * The empty rail to leave before each part, in mount order: the distance from the furthest right
 * edge of the parts already on the rail (or from the rail's left end, for the first part).
 *
 * Parts that clip onto another part have no gap of their own. Housings that reach over their
 * neighbour give a negative distance, which is not a gap either.
 */
export function gapsBefore(steps: GapInput[]): number[] {
  let occupiedUntil = 0;
  return steps.map((step) => {
    if (!step.onRail) return 0;
    const gap = Math.max(0, roundToHundredth(step.xStartMm - occupiedUntil));
    occupiedUntil = Math.max(occupiedUntil, step.xEndMm);
    return gap;
  });
}

const roundToHundredth = (mm: number): number => Math.round(mm * 100) / 100;
