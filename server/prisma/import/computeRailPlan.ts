import { GAP_WARNING_MM, gapsBefore } from "../../src/domain/gaps";
import { MARKER_CARRIER_CATEGORY, mountOrder, type MountStep } from "../../src/domain/mountOrder";
import type { PartMeasurer } from "./measureBoxes";
import { articleKey, type CatalogEntry, type PlanRail } from "./planFiles";

/** A part may reach past the rail's ends by this much before it is reported. */
const OVERHANG_TOLERANCE_MM = 1;

export interface PlannedStep extends MountStep {
  gapBeforeMm: number;
}

export interface RailPlan {
  bmk: string;
  steps: PlannedStep[];
  /** Things a planner should look at. They do not stop the import. */
  warnings: string[];
}

/** Measures one rail's parts and works out their mounting order, gaps and warnings. */
export async function computeRailPlan(
  rail: PlanRail,
  articles: Map<string, CatalogEntry>,
  measurer: PartMeasurer,
): Promise<RailPlan> {
  const measured = [];
  for (const item of rail.placedItems) {
    const article = articles.get(articleKey(item))!;
    measured.push({ bmk: item.bmk, category: article.category, box: await measurer.boxAt(article.glb, item.pose) });
  }

  const order = mountOrder(measured);
  const gaps = gapsBefore(order.map((step) => ({ ...step, onRail: sitsOnRail(step) })));
  const steps = order.map((step, index) => ({ ...step, gapBeforeMm: gaps[index] }));
  return { bmk: rail.bmk, steps, warnings: findWarnings(rail, steps) };
}

export const sitsOnRail = (step: MountStep): boolean =>
  step.mountsOnBmk === null && step.category !== MARKER_CARRIER_CATEGORY;

function findWarnings(rail: PlanRail, steps: PlannedStep[]): string[] {
  const warnings: string[] = [];
  for (const step of steps) {
    const before = -step.xStartMm;
    const after = step.xEndMm - rail.cutLengthMm;
    if (before > OVERHANG_TOLERANCE_MM) warnings.push(`${step.bmk} starts ${mm(before)} before the rail's left end`);
    if (after > OVERHANG_TOLERANCE_MM) warnings.push(`${step.bmk} reaches ${mm(after)} past the rail's right end`);
  }

  // Two parts cannot both sit on the same stretch of rail; the plan most likely misplaces one.
  const onRail = steps.filter(sitsOnRail);
  onRail.forEach((step, index) => {
    const clash = onRail
      .slice(0, index)
      .map((earlier) => ({ earlier, overlap: overlapMm(earlier, step) }))
      .filter(({ earlier, overlap }) => overlap > GAP_WARNING_MM && overlap >= Math.min(widthMm(earlier), widthMm(step)) / 2)
      .sort((a, b) => b.overlap - a.overlap)[0];
    if (clash) warnings.push(`${step.bmk} sits on the same stretch of rail as ${clash.earlier.bmk}`);
  });
  return warnings;
}

const widthMm = (step: PlannedStep): number => step.xEndMm - step.xStartMm;

const overlapMm = (a: PlannedStep, b: PlannedStep): number =>
  Math.min(a.xEndMm, b.xEndMm) - Math.max(a.xStartMm, b.xStartMm);

const mm = (value: number): string => `${value.toFixed(1)} mm`;
