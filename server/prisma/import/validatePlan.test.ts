import { describe, expect, it } from "vitest";
import type { CatalogEntry, PlanRail } from "./planFiles";
import { assertPlanIsValid, findPlanProblems, PlanValidationError } from "./validatePlan";

const catalog = (): CatalogEntry[] => [
  { manufacturer: "Weidmueller", articleNumber: "TS35", displayName: "Rail", category: "rail", barLengthMm: 2000, glb: "rail.glb", image: null },
  { manufacturer: "Wago", articleNumber: "2203", displayName: "Terminal", category: "terminal", glb: "t.glb", image: null },
];

const plan = (): PlanRail[] => [
  {
    bmk: "-U1",
    manufacturer: "Weidmueller",
    articleNumber: "TS35",
    cutLengthMm: 300,
    placedItems: [
      { bmk: "-X1:1", manufacturer: "Wago", articleNumber: "2203", pose: { positionMm: [10, 0, 0], quaternion: [0, 0, 0, 1] } },
      { bmk: "-X1:2", manufacturer: "Wago", articleNumber: "2203", pose: { positionMm: [15, 0, 0], quaternion: [0, 0, 0, 1] } },
    ],
  },
];

/** The problems found after `change` damages an otherwise valid plan. */
const problemsAfter = (change: (rails: PlanRail[], articles: CatalogEntry[]) => void): string[] => {
  const rails = plan();
  const articles = catalog();
  change(rails, articles);
  return findPlanProblems(rails, articles);
};

describe("findPlanProblems", () => {
  it("accepts a valid plan", () => {
    expect(findPlanProblems(plan(), catalog())).toEqual([]);
  });

  it("names the rail, part and article of an unknown part article", () => {
    const problems = problemsAfter((rails) => (rails[0].placedItems[1].articleNumber = "9999"));
    expect(problems).toEqual(["Rail -U1, part -X1:2: article Wago 9999 is not in the catalog"]);
  });

  it("does not accept the right article number from the wrong manufacturer", () => {
    const problems = problemsAfter((rails) => (rails[0].placedItems[0].manufacturer = "Siemens"));
    expect(problems).toEqual(["Rail -U1, part -X1:1: article Siemens 2203 is not in the catalog"]);
  });

  it("reports an unknown rail article", () => {
    const problems = problemsAfter((rails) => (rails[0].articleNumber = "TS15"));
    expect(problems).toEqual(["Rail -U1: article Weidmueller TS15 is not in the catalog"]);
  });

  it("reports a rail article without a bar length", () => {
    const problems = problemsAfter((_, articles) => delete articles[0].barLengthMm);
    expect(problems).toEqual(["Rail -U1: article Weidmueller TS35 has no barLengthMm in the catalog"]);
  });

  it.each([0, -5, Number.NaN])("reports a cut length of %s", (length) => {
    const problems = problemsAfter((rails) => (rails[0].cutLengthMm = length));
    expect(problems).toEqual([`Rail -U1: cutLengthMm must be greater than 0, got ${length}`]);
  });

  it("reports a piece longer than its bar", () => {
    const problems = problemsAfter((rails) => (rails[0].cutLengthMm = 2000.5));
    expect(problems).toEqual(["Rail -U1: a 2000.5 mm piece cannot be cut from a 2000 mm bar of Weidmueller TS35"]);
  });

  it.each([
    ["a missing pose", undefined, "pose is missing"],
    ["a short position", { positionMm: [1, 2], quaternion: [0, 0, 0, 1] }, "pose.positionMm must be three numbers [x, y, z]"],
    ["a text coordinate", { positionMm: [1, "2", 3], quaternion: [0, 0, 0, 1] }, "pose.positionMm must be three numbers [x, y, z]"],
    ["a short quaternion", { positionMm: [1, 2, 3], quaternion: [0, 0, 1] }, "pose.quaternion must be four numbers [x, y, z, w]"],
    ["a zero quaternion", { positionMm: [1, 2, 3], quaternion: [0, 0, 0, 0] }, "pose.quaternion is not a unit quaternion"],
  ])("reports %s", (_, pose, message) => {
    const problems = problemsAfter((rails) => (rails[0].placedItems[0].pose = pose as never));
    expect(problems).toEqual([`Rail -U1, part -X1:1 (Wago 2203): ${message}`]);
  });

  it("reports a BMK used twice on one rail", () => {
    const problems = problemsAfter((rails) => (rails[0].placedItems[1].bmk = "-X1:1"));
    expect(problems).toEqual(["Rail -U1, part -X1:1: BMK -X1:1 is used more than once in this cabinet"]);
  });

  it("reports a BMK used on two rails of the cabinet", () => {
    const problems = problemsAfter((rails) => rails.push({ ...plan()[0], bmk: "-U2" }));
    expect(problems).toEqual([
      "Rail -U2, part -X1:1: BMK -X1:1 is used more than once in this cabinet",
      "Rail -U2, part -X1:2: BMK -X1:2 is used more than once in this cabinet",
    ]);
  });

  it("lists every problem, not only the first", () => {
    const problems = problemsAfter((rails) => {
      rails[0].cutLengthMm = 0;
      rails[0].placedItems[0].articleNumber = "9999";
    });
    expect(problems).toHaveLength(2);
  });
});

describe("assertPlanIsValid", () => {
  it("throws one error that lists the problems", () => {
    const rails = plan();
    rails[0].cutLengthMm = -1;
    expect(() => assertPlanIsValid(rails, catalog())).toThrow(PlanValidationError);
    expect(() => assertPlanIsValid(rails, catalog())).toThrow(/Rail -U1: cutLengthMm must be greater than 0/);
  });
});
