import { articleKey, type CatalogEntry, type PlanRail } from "./planFiles";

export class PlanValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(`The plan cannot be imported:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
  }
}

/**
 * Checks a plan before anything is measured or written. Returns every problem found, each naming
 * the rail, the part and the article, so a planner can fix the file in one pass.
 */
export function findPlanProblems(rails: PlanRail[], catalog: CatalogEntry[]): string[] {
  const problems: string[] = [];
  const articles = new Map(catalog.map((entry) => [articleKey(entry), entry]));
  const seenBmks = new Set<string>();
  const claimBmk = (bmk: string, where: string): void => {
    if (seenBmks.has(bmk)) problems.push(`${where}: BMK ${bmk} is used more than once in this cabinet`);
    seenBmks.add(bmk);
  };

  for (const rail of rails) {
    const railName = `Rail ${rail.bmk}`;
    claimBmk(rail.bmk, railName);

    const railArticle = articles.get(articleKey(rail));
    if (!railArticle) {
      problems.push(`${railName}: article ${articleKey(rail)} is not in the catalog`);
    } else if (!isPositive(railArticle.barLengthMm)) {
      problems.push(`${railName}: article ${articleKey(rail)} has no barLengthMm in the catalog`);
    }

    if (!isPositive(rail.cutLengthMm)) {
      problems.push(`${railName}: cutLengthMm must be greater than 0, got ${String(rail.cutLengthMm)}`);
    } else if (isPositive(railArticle?.barLengthMm) && rail.cutLengthMm > railArticle.barLengthMm) {
      problems.push(
        `${railName}: a ${rail.cutLengthMm} mm piece cannot be cut from a ${railArticle.barLengthMm} mm bar of ${articleKey(rail)}`,
      );
    }

    for (const item of rail.placedItems) {
      const partName = `${railName}, part ${item.bmk}`;
      claimBmk(item.bmk, partName);
      if (!articles.has(articleKey(item))) problems.push(`${partName}: article ${articleKey(item)} is not in the catalog`);
      const poseProblem = findPoseProblem(item.pose);
      if (poseProblem) problems.push(`${partName} (${articleKey(item)}): ${poseProblem}`);
    }
  }
  return problems;
}

export function assertPlanIsValid(rails: PlanRail[], catalog: CatalogEntry[]): void {
  const problems = findPlanProblems(rails, catalog);
  if (problems.length > 0) throw new PlanValidationError(problems);
}

const isPositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

const isNumbers = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) && value.length === length && value.every((n) => typeof n === "number" && Number.isFinite(n));

/** The pose comes from a file, so it is checked as unknown data rather than trusted as a Pose. */
function findPoseProblem(pose: unknown): string | null {
  if (typeof pose !== "object" || pose === null) return "pose is missing";
  const { positionMm, quaternion } = pose as { positionMm?: unknown; quaternion?: unknown };
  if (!isNumbers(positionMm, 3)) return "pose.positionMm must be three numbers [x, y, z]";
  if (!isNumbers(quaternion, 4)) return "pose.quaternion must be four numbers [x, y, z, w]";
  if (Math.abs(Math.hypot(...quaternion) - 1) > 1e-3) return "pose.quaternion is not a unit quaternion";
  return null;
}
