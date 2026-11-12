import type { Pose } from "../../../lib/core";

/** The API's responses. They mirror server/src/plan/plan.views.ts. */

export type RailStatus = "TO_CUT" | "READY" | "IN_PROGRESS" | "DONE";

export interface CabinetRef {
  id: number;
  name: string;
}

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

export interface Bar {
  articleId: number;
  barIndex: number;
  barLengthMm: number;
  usedMm: number;
  remnantMm: number;
  pieces: { railId: number; bmk: string; offsetMm: number; lengthMm: number }[];
}

export interface Cabinet extends CabinetRef {
  rails: RailSummary[];
  bars: Bar[];
}

export type WhereHint =
  | { kind: "FIRST"; atMm: number }
  | { kind: "NEXT_TO"; neighbourBmk: string; atMm: number }
  | { kind: "AFTER_GAP"; gapMm: number; atMm: number }
  | { kind: "CLIP_ONTO"; onBmk: string }
  | { kind: "CARRIER"; onBmk: string | null; labelsFrom: string | null; labelsTo: string | null };

export interface PlanWarning {
  code: "OVERLAPS_PART" | "PAST_RAIL_END";
  otherBmk: string | null;
}

export interface Part {
  id: number;
  bmk: string;
  mountSeq: number;
  pose: Pose;
  xStartMm: number;
  xEndMm: number;
  manufacturer: string;
  articleNumber: string;
  displayName: string;
  glbUrl: string;
  imageUrl: string | null;
  where: WhereHint;
  group: { size: number; index: number } | null;
  planWarning: PlanWarning | null;
}

export interface Rail extends RailSummary {
  parts: Part[];
}

/** The answer to every progress change. */
export interface Progress {
  railId: number;
  status: RailStatus;
  cutAt: string | null;
  mountedCount: number;
  partCount: number;
  changed: boolean;
}
