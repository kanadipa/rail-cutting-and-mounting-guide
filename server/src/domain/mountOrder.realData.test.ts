import { beforeAll, describe, expect, it } from "vitest";
import { computeRailPlan, sitsOnRail, type PlannedStep } from "../../prisma/import/computeRailPlan";
import { PartMeasurer } from "../../prisma/import/measureBoxes";
import { articleKey } from "../../prisma/import/planFiles";
import { PROJECT_ROOT, realCatalog, realRails } from "../../test/realPlan";

/** The mounting order of the two real rails, measured from their GLBs exactly as the seed does. */
const stepsOf = new Map<string, PlannedStep[]>();
const rails = realRails();

beforeAll(async () => {
  const articles = new Map(realCatalog().map((entry) => [articleKey(entry), entry]));
  const measurer = new PartMeasurer(PROJECT_ROOT);
  for (const rail of rails) stepsOf.set(rail.bmk, (await computeRailPlan(rail, articles, measurer)).steps);
});

const step = (railBmk: string, bmk: string): PlannedStep => stepsOf.get(railBmk)!.find((s) => s.bmk === bmk)!;

describe("mountOrder on the real rails", () => {
  it.each(rails.map((rail) => [rail.bmk, rail.placedItems.length] as const))(
    "%s: numbers all %i parts 1..n, each exactly once",
    (railBmk, count) => {
      const steps = stepsOf.get(railBmk)!;
      expect(steps.map((s) => s.mountSeq)).toEqual(Array.from({ length: count }, (_, index) => index + 1));
      expect(new Set(steps.map((s) => s.bmk)).size).toBe(count);
    },
  );

  it.each(rails.map((rail) => rail.bmk))("%s: parts on the rail go strictly left to right", (railBmk) => {
    const lefts = stepsOf.get(railBmk)!.filter(sitsOnRail).map((s) => s.xStartMm);
    expect(lefts).toEqual([...lefts].sort((a, b) => a - b));
  });

  it("-U1: every I/O module comes right after the base unit it clips onto", () => {
    const modules = stepsOf.get("-U1")!.filter((s) => ["i_o_interface_module", "modules"].includes(s.category));
    expect(modules).toHaveLength(12);
    for (const module of modules) {
      expect(module.mountsOnBmk, module.bmk).not.toBeNull();
      const base = step("-U1", module.mountsOnBmk!);
      expect(["i_o_base_unit", "cpu"], module.bmk).toContain(base.category);
      expect(module.mountSeq, module.bmk).toBe(base.mountSeq + 1);
    }
  });

  it("-U1: pairs each module with the base unit of its own BMK group", () => {
    for (const group of ["-1K2", "-2K1", "-2K2", "-2K3", "-3K1", "-3K2", "-3K3", "-4K1", "-4K2", "-5K1", "-6K1"]) {
      expect(step("-U1", `${group}/1`).mountsOnBmk).toBe(`${group}/2`);
    }
  });

  it("-U1: orders base unit -1K2/2 by its box, although its origin lies right of its module's", () => {
    const origin = (bmk: string) => rails[0].placedItems.find((item) => item.bmk === bmk)!.pose.positionMm[0];
    // The trap: sorted by pose origin, the module (135.1) would come before its base unit (147.9).
    expect(origin("-1K2/2")).toBeGreaterThan(origin("-1K2/1"));
    expect(step("-U1", "-1K2/2").xStartMm).toBeLessThan(step("-U1", "-1K2/1").xStartMm);
    expect(step("-U1", "-1K2/2").mountSeq).toBe(step("-U1", "-1K2/1").mountSeq - 1);
  });

  it("-U2: nothing is stacked; only the marker carrier sits on another part", () => {
    const offRail = stepsOf.get("-U2")!.filter((s) => !sitsOnRail(s));
    expect(offRail.map((s) => s.bmk)).toEqual(["-XE"]);
  });

  it("-U2: the marker carrier -XE goes on last, after every -XE: part it labels", () => {
    const steps = stepsOf.get("-U2")!;
    const carrier = step("-U2", "-XE");
    const labelled = steps.filter((s) => s.bmk.startsWith("-XE:"));
    expect(labelled).toHaveLength(11);
    for (const part of labelled) expect(part.mountSeq, part.bmk).toBeLessThan(carrier.mountSeq);
    expect(carrier.mountSeq).toBe(46);
    expect([carrier.labelsFirstSeq, carrier.labelsLastSeq]).toEqual([step("-U2", "-XE:1/2").mountSeq, step("-U2", "-XE:7/3").mountSeq]);
  });

  it("-U2: the marker carrier physically clips onto the end bracket under it", () => {
    expect(step("-U2", "-XE").mountsOnBmk).toBe("-XE:1/2");
  });

  it("-U2: finds the one stretch of empty rail, before -XE:1/2", () => {
    const gaps = stepsOf.get("-U2")!.filter((s) => s.mountSeq > 1 && s.gapBeforeMm > 2);
    expect(gaps.map((s) => s.bmk)).toEqual(["-XE:1/2"]);
    expect(gaps[0].gapBeforeMm).toBeCloseTo(49.65, 1);
  });

  it("-U1: flags the server module and the base unit drawn on the same stretch of rail", () => {
    expect(step("-U1", "-1K1/2").planWarning).toEqual({ code: "OVERLAPS_PART", otherBmk: "-1K2/2" });
    expect(step("-U1", "-1K2/2").planWarning).toEqual({ code: "OVERLAPS_PART", otherBmk: "-1K1/2" });
  });

  it("-U1: flags the last base unit, which reaches past the end of the rail", () => {
    expect(step("-U1", "-6K1/2").planWarning).toEqual({ code: "PAST_RAIL_END", otherBmk: null });
  });

  it("flags nothing else on either rail", () => {
    const flagged = [...stepsOf.values()].flat().filter((s) => s.planWarning !== null);
    expect(flagged.map((s) => s.bmk).sort()).toEqual(["-1K1/2", "-1K2/2", "-6K1/2"]);
  });
});
