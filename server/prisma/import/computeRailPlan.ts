import { gapsBefore } from "../../src/domain/gaps";
import { MARKER_CARRIER_CATEGORY, mountOrder, type MountStep } from "../../src/domain/mountOrder";
import { planWarnings, type PlanWarning } from "../../src/domain/planWarnings";
import type { PartMeasurer } from "./measureBoxes";
import { articleKey, type CatalogEntry, type PlanRail } from "./planFiles";

export interface PlannedStep extends MountStep {
  gapBeforeMm: number;
  planWarning: PlanWarning | null;
}

export interface RailPlan {
  bmk: string;
  steps: PlannedStep[];
}

/** Measures one rail's parts and works out their mounting order, gaps and plan warnings. */
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

  const order = mountOrder(measured).map((step) => ({ ...step, onRail: sitsOnRail(step) }));
  const gaps = gapsBefore(order);
  const warnings = planWarnings(order, rail.cutLengthMm);
  const steps = order.map(({ onRail: _, ...step }, index) => ({
    ...step,
    gapBeforeMm: gaps[index],
    planWarning: warnings[index],
  }));
  return { bmk: rail.bmk, steps };
}

export const sitsOnRail = (step: MountStep): boolean =>
  step.mountsOnBmk === null && step.category !== MARKER_CARRIER_CATEGORY;
