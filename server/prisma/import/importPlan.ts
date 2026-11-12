import type { Prisma, PrismaClient } from "@prisma/client";
import { cuttingPlan, KERF_MM, type PlannedCut } from "../../src/domain/cuttingPlan";
import { computeRailPlan, type RailPlan } from "./computeRailPlan";
import { PartMeasurer } from "./measureBoxes";
import { articleKey, type CatalogEntry, type PlanRail } from "./planFiles";
import { assertPlanIsValid } from "./validatePlan";

export interface ImportOptions {
  cabinetName: string;
  rails: PlanRail[];
  catalog: CatalogEntry[];
  /** The folder the catalog's file paths are relative to. */
  projectRoot: string;
  /** Replace an existing cabinet of this name, deleting its plan, progress and history. */
  reset: boolean;
}

export interface ImportedRail extends RailPlan, PlannedCut {}

export interface ImportResult {
  cabinetId: number;
  rails: ImportedRail[];
}

export class CabinetExistsError extends Error {
  constructor(readonly cabinetName: string) {
    super(`"${cabinetName}" is already imported. Nothing was changed and its progress is kept.`);
  }
}

/**
 * Imports one cabinet's plan: validates it, measures every part, computes the mounting order and
 * the cutting plan, and writes everything in one transaction. An existing cabinet is only
 * replaced when `reset` is set, so progress is never deleted by accident.
 */
export async function importPlan(prisma: PrismaClient, options: ImportOptions): Promise<ImportResult> {
  const { cabinetName, rails, catalog, reset } = options;
  assertPlanIsValid(rails, catalog);

  const existing = await prisma.cabinet.findUnique({ where: { name: cabinetName } });
  if (existing && !reset) throw new CabinetExistsError(cabinetName);

  const articles = new Map(catalog.map((entry) => [articleKey(entry), entry]));
  const measurer = new PartMeasurer(options.projectRoot);
  const planned: ImportedRail[] = [];
  for (const cut of planCuts(rails, articles)) {
    const rail = rails.find((candidate) => candidate.bmk === cut.bmk)!;
    planned.push({ ...(await computeRailPlan(rail, articles, measurer)), ...cut });
  }

  const cabinetId = await prisma.$transaction(
    async (tx) => {
      const articleIds = await upsertArticles(tx, catalog);
      const cabinet = existing ?? (await tx.cabinet.create({ data: { name: cabinetName } }));
      if (existing) await deleteCabinetWork(tx, existing.id);
      for (const plannedRail of planned) {
        const source = rails.find((candidate) => candidate.bmk === plannedRail.bmk)!;
        await writeRail(tx, cabinet.id, source, plannedRail, articleIds);
      }
      return cabinet.id;
    },
    { timeout: 60_000 },
  );
  return { cabinetId, rails: planned };
}

/** One cutting plan per rail article (each has its own bars), numbered as one cut list. */
function planCuts(rails: PlanRail[], articles: Map<string, CatalogEntry>): PlannedCut[] {
  const cuts: PlannedCut[] = [];
  for (const key of new Set(rails.map(articleKey))) {
    const ofArticle = rails.filter((rail) => articleKey(rail) === key);
    const plan = cuttingPlan(ofArticle, articles.get(key)!.barLengthMm!, KERF_MM);
    cuts.push(...plan.cuts.map((cut) => ({ ...cut, cutOrder: cuts.length + cut.cutOrder })));
  }
  return cuts;
}

async function upsertArticles(tx: Prisma.TransactionClient, catalog: CatalogEntry[]): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const entry of catalog) {
    const data = {
      displayName: entry.displayName,
      category: entry.category,
      profileWxH: entry.profileWxH ?? null,
      barLengthMm: entry.barLengthMm ?? null,
      glbPath: entry.glb,
      imagePath: entry.image,
    };
    const key = { manufacturer: entry.manufacturer, articleNumber: entry.articleNumber };
    const article = await tx.article.upsert({
      where: { manufacturer_articleNumber: key },
      create: { ...key, ...data },
      update: data,
    });
    ids.set(articleKey(entry), article.id);
  }
  return ids;
}

/** History first: events point at rails and parts. Parts and progress go with their rail. */
async function deleteCabinetWork(tx: Prisma.TransactionClient, cabinetId: number): Promise<void> {
  await tx.workEvent.deleteMany({ where: { cabinetId } });
  await tx.rail.deleteMany({ where: { cabinetId } });
}

async function writeRail(
  tx: Prisma.TransactionClient,
  cabinetId: number,
  source: PlanRail,
  planned: ImportedRail,
  articleIds: Map<string, number>,
): Promise<void> {
  const rail = await tx.rail.create({
    data: {
      cabinetId,
      bmk: planned.bmk,
      articleId: articleIds.get(articleKey(source))!,
      cutLengthMm: planned.cutLengthMm,
      cutOrder: planned.cutOrder,
      barIndex: planned.barIndex,
      barOffsetMm: planned.barOffsetMm,
      progress: { create: {} },
    },
  });

  const sourceItems = new Map(source.placedItems.map((item) => [item.bmk, item]));
  const created = await tx.placedItem.createManyAndReturn({
    select: { id: true, bmk: true },
    data: planned.steps.map((step) => {
      const item = sourceItems.get(step.bmk)!;
      return {
        railId: rail.id,
        bmk: step.bmk,
        articleId: articleIds.get(articleKey(item))!,
        pose: item.pose as unknown as Prisma.InputJsonValue,
        mountSeq: step.mountSeq,
        xStartMm: step.xStartMm,
        xEndMm: step.xEndMm,
        zMinMm: step.zMinMm,
        gapBeforeMm: step.gapBeforeMm,
        labelsFirstSeq: step.labelsFirstSeq,
        labelsLastSeq: step.labelsLastSeq,
      };
    }),
  });

  // The part a stacked part clips onto is only known by id once all parts exist.
  const idOf = new Map(created.map((item) => [item.bmk, item.id]));
  for (const step of planned.steps) {
    if (step.mountsOnBmk === null) continue;
    await tx.placedItem.update({
      where: { id: idOf.get(step.bmk)! },
      data: { mountsOnItemId: idOf.get(step.mountsOnBmk)! },
    });
  }
}
