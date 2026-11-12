import { describe, expect, it } from "vitest";
import { groupRuns } from "./grouping";
import { railStatus } from "./railStatus";
import { whereHints, type WhereInput } from "./whereHint";

describe("railStatus", () => {
  const cutAt = new Date();
  it.each([
    [null, 0, 5, "TO_CUT"],
    [cutAt, 0, 5, "READY"],
    [cutAt, 1, 5, "IN_PROGRESS"],
    [cutAt, 4, 5, "IN_PROGRESS"],
    [cutAt, 5, 5, "DONE"],
  ] as const)("cutAt %s, %i of %i mounted → %s", (cut, mounted, parts, status) => {
    expect(railStatus(cut, mounted, parts)).toBe(status);
  });
});

describe("groupRuns", () => {
  const onRail = (articleId: number, gapBeforeMm = 0) => ({ articleId, onRail: true, gapBeforeMm });

  it("groups identical parts mounted in a row", () => {
    expect(groupRuns([onRail(1), onRail(2), onRail(2), onRail(2), onRail(3)])).toEqual([
      null,
      { size: 3, index: 1 },
      { size: 3, index: 2 },
      { size: 3, index: 3 },
      null,
    ]);
  });

  it("ends a run at empty rail", () => {
    expect(groupRuns([onRail(1), onRail(1), onRail(1, 50), onRail(1)])).toEqual([
      { size: 2, index: 1 },
      { size: 2, index: 2 },
      { size: 2, index: 1 },
      { size: 2, index: 2 },
    ]);
  });

  it("does not group parts that alternate with what clips onto them", () => {
    const module = { articleId: 9, onRail: false, gapBeforeMm: 0 };
    expect(groupRuns([onRail(1), module, onRail(1), module])).toEqual([null, null, null, null]);
  });

  it("lets the first part of a run follow a gap", () => {
    expect(groupRuns([onRail(1, 21), onRail(1)])).toEqual([
      { size: 2, index: 1 },
      { size: 2, index: 2 },
    ]);
  });
});

describe("whereHints", () => {
  const step = (bmk: string, xStartMm: number, more: Partial<WhereInput> = {}): WhereInput => ({
    bmk,
    category: "terminal",
    xStartMm,
    gapBeforeMm: 0,
    mountsOnBmk: null,
    labelsFirstSeq: null,
    labelsLastSeq: null,
    ...more,
  });

  it("measures the first part from the left end, even when rail is left free before it", () => {
    expect(whereHints([step("A", 21.6, { gapBeforeMm: 21.6 })])).toEqual([{ kind: "FIRST", atMm: 21.6 }]);
  });

  it("puts a part next to the part before it on the rail", () => {
    expect(whereHints([step("A", 0), step("B", 10)])[1]).toEqual({ kind: "NEXT_TO", neighbourBmk: "A", atMm: 10 });
  });

  it("names the part a stacked part clips onto, and skips it as a neighbour", () => {
    const hints = whereHints([step("base", 0), step("module", 2, { mountsOnBmk: "base" }), step("next", 20)]);
    expect(hints[1]).toEqual({ kind: "CLIP_ONTO", onBmk: "base" });
    expect(hints[2]).toEqual({ kind: "NEXT_TO", neighbourBmk: "base", atMm: 20 });
  });

  it("warns about empty rail to leave free", () => {
    const hints = whereHints([step("A", 0), step("B", 59.65, { gapBeforeMm: 49.65 })]);
    expect(hints[1]).toEqual({ kind: "AFTER_GAP", gapMm: 49.65, atMm: 59.65 });
  });

  it("ignores gaps within model tolerance", () => {
    expect(whereHints([step("A", 0), step("B", 10.05, { gapBeforeMm: 0.05 })])[1].kind).toBe("NEXT_TO");
  });

  it("tells where a marker carrier clips on and which terminals it labels", () => {
    const hints = whereHints([
      step("-XE:1/2", 0),
      step("-XE:1/1", 10),
      step("-XE:7/3", 20),
      step("-XE", 0, { category: "marker_carrier", mountsOnBmk: "-XE:1/2", labelsFirstSeq: 1, labelsLastSeq: 3 }),
    ]);
    expect(hints[3]).toEqual({ kind: "CARRIER", onBmk: "-XE:1/2", labelsFrom: "-XE:1", labelsTo: "-XE:7" });
  });
});
