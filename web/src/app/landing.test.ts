import { describe, expect, it } from "vitest";
import type { Cabinet, RailStatus } from "../api/types";
import { landingPath, suggestedRail } from "./landing";

const cabinet = (...statuses: RailStatus[]): Cabinet => ({
  id: 1,
  name: "Cabinet 1",
  bars: [],
  rails: statuses.map((status, index) => ({
    id: index + 10,
    bmk: `-U${index + 1}`,
    cutLengthMm: 300,
    cutOrder: index + 1,
    barIndex: 0,
    barOffsetMm: index * 300,
    profile: "35X15",
    barLengthMm: 2000,
    glbUrl: "/assets/glb/rail.glb",
    status,
    cutAt: status === "TO_CUT" ? null : "2026-01-01T00:00:00.000Z",
    mountedCount: status === "IN_PROGRESS" ? 3 : status === "DONE" ? 5 : 0,
    partCount: 5,
  })),
});

describe("landingPath", () => {
  it("returns to the rail in progress, even while other rails are still to cut", () => {
    expect(landingPath(cabinet("TO_CUT", "IN_PROGRESS"))).toBe("/cabinets/1/rails/11/mount");
  });

  it("goes to cutting when a rail is to cut and none is in progress", () => {
    expect(landingPath(cabinet("READY", "TO_CUT"))).toBe("/cabinets/1/cut");
    expect(landingPath(cabinet("TO_CUT", "TO_CUT"))).toBe("/cabinets/1/cut");
  });

  it("goes to the rail picker when everything is cut and rails wait to be mounted", () => {
    expect(landingPath(cabinet("DONE", "READY"))).toBe("/cabinets/1/rails");
  });

  it("goes to the finished job when every rail is done", () => {
    expect(landingPath(cabinet("DONE", "DONE"))).toBe("/cabinets/1/done");
  });
});

describe("suggestedRail", () => {
  it("prefers the rail in progress over an earlier ready one", () => {
    expect(suggestedRail(cabinet("READY", "IN_PROGRESS").rails)?.bmk).toBe("-U2");
  });

  it("else takes the first ready rail, never one that is to cut or done", () => {
    expect(suggestedRail(cabinet("TO_CUT", "DONE", "READY").rails)?.bmk).toBe("-U3");
    expect(suggestedRail(cabinet("TO_CUT", "DONE").rails)).toBeNull();
  });
});
