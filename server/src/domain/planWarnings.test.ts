import { describe, expect, it } from "vitest";
import { planWarnings } from "./planWarnings";

const onRail = (bmk: string, xStartMm: number, xEndMm: number) => ({ bmk, xStartMm, xEndMm, onRail: true });

describe("planWarnings", () => {
  it("finds nothing wrong with parts side by side", () => {
    expect(planWarnings([onRail("A", 0, 10), onRail("B", 10, 20)], 100)).toEqual([null, null]);
  });

  it("flags both parts when two share a stretch of rail", () => {
    expect(planWarnings([onRail("A", 0, 20), onRail("B", 5, 15)], 100)).toEqual([
      { code: "OVERLAPS_PART", otherBmk: "B" },
      { code: "OVERLAPS_PART", otherBmk: "A" },
    ]);
  });

  it("accepts a housing that reaches over half of a narrow neighbour", () => {
    expect(planWarnings([onRail("A", 0, 20), onRail("B", 15, 35)], 100)).toEqual([null, null]);
    expect(planWarnings([onRail("cpu", 0, 100), onRail("narrow", 94, 106)], 200)).toEqual([null, null]);
  });

  it("does not flag a part clipped onto another", () => {
    const stacked = { bmk: "module", xStartMm: 2, xEndMm: 18, onRail: false };
    expect(planWarnings([onRail("base", 0, 20), stacked], 100)).toEqual([null, null]);
  });

  it("names the part it overlaps most", () => {
    const warnings = planWarnings([onRail("wide", 0, 100), onRail("base", 94, 120), onRail("server", 94, 106)], 200);
    expect(warnings[2]).toEqual({ code: "OVERLAPS_PART", otherBmk: "base" });
  });

  it("flags a part reaching past either end of the rail, beyond 1 mm", () => {
    expect(planWarnings([onRail("A", -1.5, 10), onRail("B", 90, 101.8)], 100)).toEqual([
      { code: "PAST_RAIL_END", otherBmk: null },
      { code: "PAST_RAIL_END", otherBmk: null },
    ]);
    expect(planWarnings([onRail("A", -0.5, 10), onRail("B", 90, 100.9)], 100)).toEqual([null, null]);
  });
});
