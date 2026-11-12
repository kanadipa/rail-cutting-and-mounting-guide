import { barUsage, KERF_MM } from "../domain/cuttingPlan";
import { groupRuns, type GroupPosition } from "../domain/grouping";
import { MARKER_CARRIER_CATEGORY } from "../domain/mountOrder";
import type { PlanWarning } from "../domain/planWarnings";
import { railStatus, type RailStatus } from "../domain/railStatus";
import { whereHints, type WhereHint } from "../domain/whereHint";
import type { RailRow, RailWithParts } from "./plan.repository";

/** What the API returns. The operator screen's types mirror these. */

export interface RailSummary {
  id: number;
  bmk: string;
  cutLengthMm: number;
  cutOrder: number;
  barIndex: number;
  barOffsetMm: number;
  profile: string | null;
  barLengthMm: number;
  glbUrl: string;
  status: RailStatus;
  cutAt: string | null;
  mountedCount: number;
  partCount: number;
}

export interface BarView {
  /** Bars are numbered per rail article. */
  articleId: number;
  barIndex: number;
  barLengthMm: number;
  /** The 3D model of the raw bar: the article all its pieces are cut from. */
  glbUrl: string;
  usedMm: number;
  remnantMm: number;
  pieces: { railId: number; bmk: string; offsetMm: number; lengthMm: number }[];
}

export interface CabinetView {
  id: number;
  name: string;
  rails: RailSummary[];
  bars: BarView[];
}

export interface PartView {
  id: number;
  bmk: string;
  mountSeq: number;
  pose: unknown;
  xStartMm: number;
  xEndMm: number;
  manufacturer: string;
  articleNumber: string;
  displayName: string;
  glbUrl: string;
  imageUrl: string | null;
  where: WhereHint;
  group: GroupPosition | null;
  planWarning: PlanWarning | null;
}

export interface RailView extends RailSummary {
  parts: PartView[];
}

const assetUrl = (path: string): string => `/${path}`;

export function toRailSummary(rail: RailRow | RailWithParts): RailSummary {
  const partCount = rail.partCount;
  const cutAt = rail.progress?.cutAt ?? null;
  const mountedCount = rail.progress?.mountedCount ?? 0;
  return {
    id: rail.id,
    bmk: rail.bmk,
    cutLengthMm: rail.cutLengthMm,
    cutOrder: rail.cutOrder,
    barIndex: rail.barIndex,
    barOffsetMm: rail.barOffsetMm,
    profile: rail.article.profileWxH,
    // The import refuses a rail whose article has no bar length.
    barLengthMm: rail.article.barLengthMm ?? rail.cutLengthMm,
    glbUrl: assetUrl(rail.article.glbPath),
    status: railStatus(cutAt, mountedCount, partCount),
    cutAt: cutAt?.toISOString() ?? null,
    mountedCount,
    partCount,
  };
}

export function toBars(rails: RailRow[]): BarView[] {
  const bars = new Map<string, BarView>();
  for (const rail of rails) {
    const key = `${rail.articleId}/${rail.barIndex}`;
    const bar = bars.get(key) ?? {
      articleId: rail.articleId,
      barIndex: rail.barIndex,
      barLengthMm: rail.article.barLengthMm ?? rail.cutLengthMm,
      glbUrl: assetUrl(rail.article.glbPath),
      usedMm: 0,
      remnantMm: 0,
      pieces: [],
    };
    bar.pieces.push({ railId: rail.id, bmk: rail.bmk, offsetMm: rail.barOffsetMm, lengthMm: rail.cutLengthMm });
    bars.set(key, bar);
  }
  return [...bars.values()].map((bar) => {
    const cuts = bar.pieces.map((piece) => ({ barIndex: bar.barIndex, barOffsetMm: piece.offsetMm, cutLengthMm: piece.lengthMm }));
    const [usage] = barUsage(cuts, bar.barLengthMm, KERF_MM);
    return { ...bar, usedMm: usage.usedMm, remnantMm: usage.remnantMm };
  });
}

export function toRailView(rail: RailWithParts): RailView {
  const items = rail.placedItems;
  const steps = items.map((item) => ({
    bmk: item.bmk,
    category: item.article.category,
    articleId: item.articleId,
    xStartMm: item.xStartMm,
    gapBeforeMm: item.gapBeforeMm,
    mountsOnBmk: item.mountsOn?.bmk ?? null,
    labelsFirstSeq: item.labelsFirstSeq,
    labelsLastSeq: item.labelsLastSeq,
    onRail: item.mountsOnItemId === null && item.article.category !== MARKER_CARRIER_CATEGORY,
  }));
  const hints = whereHints(steps);
  const groups = groupRuns(steps);

  return {
    ...toRailSummary(rail),
    parts: items.map((item, index) => ({
      id: item.id,
      bmk: item.bmk,
      mountSeq: item.mountSeq,
      pose: item.pose,
      xStartMm: item.xStartMm,
      xEndMm: item.xEndMm,
      manufacturer: item.article.manufacturer,
      articleNumber: item.article.articleNumber,
      displayName: item.article.displayName,
      glbUrl: assetUrl(item.article.glbPath),
      imageUrl: item.article.imagePath ? assetUrl(item.article.imagePath) : null,
      where: hints[index],
      group: groups[index],
      planWarning: item.planWarning ? { code: item.planWarning, otherBmk: item.planWarningItem?.bmk ?? null } : null,
    })),
  };
}
