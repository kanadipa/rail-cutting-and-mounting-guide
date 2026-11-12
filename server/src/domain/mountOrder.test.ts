import { describe, expect, it } from "vitest";
import { gapsBefore } from "./gaps";
import { mountOrder, type MountInput } from "./mountOrder";

/** A part from x0 to x1 along the rail whose lowest point is zMin. */
const part = (bmk: string, x0: number, x1: number, zMin = -7, category = "terminal"): MountInput => ({
  bmk,
  category,
  box: { min: { x: x0, y: -20, z: zMin }, max: { x: x1, y: 20, z: zMin + 40 } },
});

const bmks = (items: MountInput[]) => mountOrder(items).map((step) => step.bmk);

describe("mountOrder", () => {
  it("orders parts on the rail left to right, whatever order they are listed in", () => {
    expect(bmks([part("C", 20, 30), part("A", 0, 10), part("B", 10, 20)])).toEqual(["A", "B", "C"]);
  });

  it("numbers the steps 1..n", () => {
    const steps = mountOrder([part("B", 10, 20), part("A", 0, 10), part("C", 20, 30)]);
    expect(steps.map((step) => step.mountSeq)).toEqual([1, 2, 3]);
  });

  it("puts a stacked part right after the part it clips onto", () => {
    const steps = mountOrder([
      part("module-2", 21, 39, 8),
      part("module-1", 1, 19, 8),
      part("base-1", 0, 20),
      part("base-2", 20, 40),
    ]);
    expect(steps.map((step) => step.bmk)).toEqual(["base-1", "module-1", "base-2", "module-2"]);
    expect(steps.map((step) => step.mountsOnBmk)).toEqual([null, "base-1", null, "base-2"]);
  });

  it("clips a part onto the base it overlaps most when it reaches over two", () => {
    const steps = mountOrder([part("base-1", 0, 20), part("base-2", 20, 40), part("module", 17, 37, 8)]);
    expect(steps.find((step) => step.bmk === "module")?.mountsOnBmk).toBe("base-2");
  });

  it("clips onto the nearest part below in a stack of three", () => {
    const steps = mountOrder([part("top", 0, 20, 30), part("middle", 0, 20, 10), part("bottom", 0, 20)]);
    expect(steps.map((step) => [step.bmk, step.mountsOnBmk])).toEqual([
      ["bottom", null],
      ["middle", "bottom"],
      ["top", "middle"],
    ]);
  });

  it("keeps neighbours whose housings overlap a little as separate parts on the rail", () => {
    const steps = mountOrder([part("A", 0, 20), part("B", 15, 35), part("C", 30, 50)]);
    expect(steps.map((step) => step.mountsOnBmk)).toEqual([null, null, null]);
  });

  it("does not stack two parts that sit at the same level", () => {
    const steps = mountOrder([part("wide", 0, 30), part("narrow", 10, 20, -7.05)]);
    expect(steps.map((step) => [step.bmk, step.mountsOnBmk])).toEqual([
      ["wide", null],
      ["narrow", null],
    ]);
  });

  it("puts a marker carrier after the last part of its BMK group and clips it onto the part under it", () => {
    const steps = mountOrder([
      part("-XE", 10, 20, 25, "marker_carrier"),
      part("-XD:9", 0, 10),
      part("-XE:1/2", 10, 20),
      part("-XE:1/1", 20, 30),
      part("-XE:2", 30, 40),
      part("-XF:1", 40, 50),
    ]);
    expect(steps.map((step) => step.bmk)).toEqual(["-XD:9", "-XE:1/2", "-XE:1/1", "-XE:2", "-XE", "-XF:1"]);
    const carrier = steps[4];
    expect(carrier.mountsOnBmk).toBe("-XE:1/2");
    expect([carrier.labelsFirstSeq, carrier.labelsLastSeq]).toEqual([2, 4]);
  });

  it("does not take a longer BMK for part of the carrier's group", () => {
    const steps = mountOrder([part("-XE", 0, 10, 25, "marker_carrier"), part("-XE:1", 0, 10), part("-XE2:1", 10, 20)]);
    expect(steps.map((step) => step.bmk)).toEqual(["-XE:1", "-XE", "-XE2:1"]);
  });

  it("falls back to the parts under a carrier whose BMK names no group", () => {
    const steps = mountOrder([
      part("carrier", 10, 30, 25, "marker_carrier"),
      part("A", 0, 10),
      part("B", 10, 20),
      part("C", 20, 30),
      part("D", 30, 40),
    ]);
    expect(steps.map((step) => step.bmk)).toEqual(["A", "B", "C", "carrier", "D"]);
    expect([steps[3].labelsFirstSeq, steps[3].labelsLastSeq]).toEqual([2, 3]);
    expect(steps[3].mountsOnBmk).toBe("B");
  });

  it("does not let a carrier claim a neighbour it only touches", () => {
    const steps = mountOrder([part("carrier", 0, 10, 25, "marker_carrier"), part("A", 0, 10), part("B", 9.9, 20)]);
    expect(steps.map((step) => step.bmk)).toEqual(["A", "carrier", "B"]);
    expect([steps[1].labelsFirstSeq, steps[1].labelsLastSeq]).toEqual([1, 1]);
  });

  it("never mounts a carrier before the part it sits on, even when that part is outside its group", () => {
    const steps = mountOrder([part("-XE", 20, 30, 25, "marker_carrier"), part("-XE:1", 0, 10), part("bracket", 20, 30)]);
    expect(steps.map((step) => step.bmk)).toEqual(["-XE:1", "bracket", "-XE"]);
  });
});

describe("gapsBefore", () => {
  const onRail = (xStartMm: number, xEndMm: number) => ({ xStartMm, xEndMm, onRail: true });

  it("measures the first part from the rail's left end", () => {
    expect(gapsBefore([onRail(21.6, 31.6)])).toEqual([21.6]);
  });

  it("finds the empty rail between two parts", () => {
    expect(gapsBefore([onRail(0, 10), onRail(10, 20), onRail(70, 80)])).toEqual([0, 0, 50]);
  });

  it("gives stacked parts no gap and does not let them hide one", () => {
    const steps = [onRail(0, 20), { xStartMm: 2, xEndMm: 45, onRail: false }, onRail(40, 60)];
    expect(gapsBefore(steps)).toEqual([0, 0, 20]);
  });

  it("treats overlapping housings as no gap", () => {
    expect(gapsBefore([onRail(0, 20), onRail(15, 35)])).toEqual([0, 0]);
  });

  it("measures from the furthest right edge so far, not from the previous part", () => {
    expect(gapsBefore([onRail(0, 100), onRail(90, 95), onRail(103, 110)])).toEqual([0, 0, 3]);
  });
});
