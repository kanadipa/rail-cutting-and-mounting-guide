import type { Pose } from "../../../lib/core/placeComponent";

/** The shapes of data/catalog.json and data/placement.json (see docs/data-model.md). */

export interface ArticleRef {
  manufacturer: string;
  articleNumber: string;
}

export interface CatalogEntry extends ArticleRef {
  displayName: string;
  category: string;
  profileWxH?: string;
  barLengthMm?: number;
  glb: string;
  image: string | null;
}

export interface PlanItem extends ArticleRef {
  bmk: string;
  pose: Pose;
}

export interface PlanRail extends ArticleRef {
  bmk: string;
  cutLengthMm: number;
  placedItems: PlanItem[];
}

/** Two manufacturers can use the same article number, so the key is both fields together. */
export const articleKey = (article: ArticleRef): string => `${article.manufacturer} ${article.articleNumber}`;
