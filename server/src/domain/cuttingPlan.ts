/**
 * Width of the saw cut, lost after every piece. Zero until Vetaion's saw is known; the plan and
 * the remnant shown to the operator follow from this one number.
 */
export const KERF_MM = 0;

export interface RailToCut {
  bmk: string;
  cutLengthMm: number;
}

export interface PlannedCut extends RailToCut {
  /** 1..n in the order the operator cuts: bar by bar, each bar from its start. */
  cutOrder: number;
  /** Which raw bar the piece comes from (0-based). */
  barIndex: number;
  /** Where on that bar the piece starts. */
  barOffsetMm: number;
}

export interface BarUsage {
  barIndex: number;
  /** Length taken by pieces and saw cuts. */
  usedMm: number;
  /** What is left of the bar after its last cut. */
  remnantMm: number;
}

export interface CuttingPlan {
  cuts: PlannedCut[];
  bars: BarUsage[];
}

export class PieceLongerThanBarError extends Error {
  constructor(
    readonly bmk: string,
    readonly cutLengthMm: number,
    readonly barLengthMm: number,
  ) {
    super(`Rail ${bmk}: a ${cutLengthMm} mm piece cannot be cut from a ${barLengthMm} mm bar`);
  }
}

/**
 * Plans which raw bar each rail is cut from: first-fit decreasing, for rails of one article
 * (one bar length). Longest pieces first, each into the first bar that still has room.
 */
export function cuttingPlan(rails: RailToCut[], barLengthMm: number, kerfMm: number): CuttingPlan {
  const tooLong = rails.find((rail) => rail.cutLengthMm > barLengthMm);
  if (tooLong) throw new PieceLongerThanBarError(tooLong.bmk, tooLong.cutLengthMm, barLengthMm);

  const longestFirst = [...rails].sort((a, b) => b.cutLengthMm - a.cutLengthMm || a.bmk.localeCompare(b.bmk));
  const usedPerBar: number[] = [];
  const placed = longestFirst.map((rail) => {
    let barIndex = usedPerBar.findIndex((used) => used + rail.cutLengthMm <= barLengthMm);
    if (barIndex === -1) barIndex = usedPerBar.push(0) - 1;
    const barOffsetMm = usedPerBar[barIndex];
    usedPerBar[barIndex] = barOffsetMm + rail.cutLengthMm + kerfMm;
    return { ...rail, barIndex, barOffsetMm };
  });

  const cuts = placed
    .sort((a, b) => a.barIndex - b.barIndex || a.barOffsetMm - b.barOffsetMm)
    .map((cut, index) => ({ ...cut, cutOrder: index + 1 }));
  return { cuts, bars: barUsage(cuts, barLengthMm, kerfMm) };
}

/** How much of each bar the planned pieces take, and what is left. */
export function barUsage(
  cuts: Pick<PlannedCut, "barIndex" | "barOffsetMm" | "cutLengthMm">[],
  barLengthMm: number,
  kerfMm: number,
): BarUsage[] {
  const usedPerBar = new Map<number, number>();
  for (const cut of cuts) {
    const end = cut.barOffsetMm + cut.cutLengthMm + kerfMm;
    usedPerBar.set(cut.barIndex, Math.max(usedPerBar.get(cut.barIndex) ?? 0, end));
  }
  return [...usedPerBar.entries()]
    .sort(([a], [b]) => a - b)
    .map(([barIndex, usedMm]) => ({ barIndex, usedMm, remnantMm: Math.max(0, barLengthMm - usedMm) }));
}
