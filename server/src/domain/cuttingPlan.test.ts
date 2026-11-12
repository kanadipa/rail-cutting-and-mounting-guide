import { describe, expect, it } from "vitest";
import { cuttingPlan, PieceLongerThanBarError } from "./cuttingPlan";

const rail = (bmk: string, cutLengthMm: number) => ({ bmk, cutLengthMm });

describe("cuttingPlan", () => {
  it("cuts both rails of the real job from one bar and leaves 1401 mm", () => {
    const plan = cuttingPlan([rail("-U2", 293), rail("-U1", 306)], 2000, 0);
    expect(plan.cuts).toEqual([
      { bmk: "-U1", cutLengthMm: 306, cutOrder: 1, barIndex: 0, barOffsetMm: 0 },
      { bmk: "-U2", cutLengthMm: 293, cutOrder: 2, barIndex: 0, barOffsetMm: 306 },
    ]);
    expect(plan.bars).toEqual([{ barIndex: 0, usedMm: 599, remnantMm: 1401 }]);
  });

  it("packs first-fit decreasing: a later small piece fills the first bar's remainder", () => {
    const plan = cuttingPlan([rail("A", 400), rail("B", 1200), rail("C", 900), rail("D", 700)], 2000, 0);
    const barOf = Object.fromEntries(plan.cuts.map((cut) => [cut.bmk, cut.barIndex]));
    expect(barOf).toEqual({ B: 0, D: 0, C: 1, A: 1 });
    expect(plan.bars.map((bar) => bar.remnantMm)).toEqual([100, 700]);
  });

  it("numbers the cuts bar by bar, each bar from its start", () => {
    const plan = cuttingPlan([rail("A", 400), rail("B", 1200), rail("C", 900), rail("D", 700)], 2000, 0);
    expect(plan.cuts.map((cut) => [cut.cutOrder, cut.bmk, cut.barOffsetMm])).toEqual([
      [1, "B", 0],
      [2, "D", 1200],
      [3, "C", 0],
      [4, "A", 900],
    ]);
  });

  it("loses the kerf after every piece", () => {
    const plan = cuttingPlan([rail("A", 500), rail("B", 500)], 2000, 3);
    expect(plan.cuts.map((cut) => cut.barOffsetMm)).toEqual([0, 503]);
    expect(plan.bars).toEqual([{ barIndex: 0, usedMm: 1006, remnantMm: 994 }]);
  });

  it("lets the kerf push a piece onto the next bar", () => {
    const withoutKerf = cuttingPlan([rail("A", 1000), rail("B", 1000)], 2000, 0);
    const withKerf = cuttingPlan([rail("A", 1000), rail("B", 1000)], 2000, 3);
    expect(withoutKerf.bars).toHaveLength(1);
    expect(withKerf.bars).toHaveLength(2);
  });

  it("allows a piece exactly as long as the bar", () => {
    expect(cuttingPlan([rail("A", 2000)], 2000, 3).bars).toEqual([{ barIndex: 0, usedMm: 2003, remnantMm: 0 }]);
  });

  it("refuses a piece longer than the bar and names the rail", () => {
    expect(() => cuttingPlan([rail("A", 300), rail("-U9", 2000.5)], 2000, 0)).toThrow(PieceLongerThanBarError);
    expect(() => cuttingPlan([rail("-U9", 2000.5)], 2000, 0)).toThrow(/-U9.*2000\.5 mm.*2000 mm bar/);
  });

  it("plans nothing for no rails", () => {
    expect(cuttingPlan([], 2000, 0)).toEqual({ cuts: [], bars: [] });
  });
});
