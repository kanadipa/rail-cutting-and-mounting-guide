import { Prisma, type PrismaClient } from "@prisma/client";
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

  // One transaction, and a fixed number of statements however big the plan is.
  const cabinetId = await prisma.$transaction(
    async (tx) => {
      const articleIds = await upsertArticles(tx, catalog);
      const cabinet = existing ?? (await tx.cabinet.create({ data: { name: cabinetName } }));
      if (existing) await deleteCabinetWork(tx, existing.id);
      await writeRails(tx, cabinet.id, rails, planned, articleIds);
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

/** Rows per statement; Postgres takes at most 65 535 parameters in one. */
const CHUNK = 4000;

function chunks<T>(rows: T[], size = CHUNK): T[][] {
  const result: T[][] = [];
  for (let from = 0; from < rows.length; from += size) result.push(rows.slice(from, from + size));
  return result;
}

/** The whole catalog in one INSERT ... ON CONFLICT, answering with the id of every article. */
async function upsertArticles(tx: Prisma.TransactionClient, catalog: CatalogEntry[]): Promise<Map<string, number>> {
  const entries = [...new Map(catalog.map((entry) => [articleKey(entry), entry])).values()];
  const ids = new Map<string, number>();
  for (const part of chunks(entries)) {
    const values = part.map(
      (entry) =>
        Prisma.sql`(${entry.manufacturer}, ${entry.articleNumber}, ${entry.displayName}, ${entry.category}, ${entry.profileWxH ?? null}, ${entry.barLengthMm ?? null}::double precision, ${entry.glb}, ${entry.image ?? null})`,
    );
    const rows = await tx.$queryRaw<{ id: number; manufacturer: string; article_number: string }[]>`
      INSERT INTO articles (manufacturer, article_number, display_name, category, profile_wxh, bar_length_mm, glb_path, image_path)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (manufacturer, article_number) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        category = EXCLUDED.category,
        profile_wxh = EXCLUDED.profile_wxh,
        bar_length_mm = EXCLUDED.bar_length_mm,
        glb_path = EXCLUDED.glb_path,
        image_path = EXCLUDED.image_path
      RETURNING id, manufacturer, article_number`;
    for (const row of rows) ids.set(articleKey({ manufacturer: row.manufacturer, articleNumber: row.article_number }), row.id);
  }
  return ids;
}

/** History first: events point at rails and parts. Parts and progress go with their rail. */
async function deleteCabinetWork(tx: Prisma.TransactionClient, cabinetId: number): Promise<void> {
  await tx.workEvent.deleteMany({ where: { cabinetId } });
  await tx.rail.deleteMany({ where: { cabinetId } });
}

/** All rails, their progress rows and all parts, each in one statement; then the links between parts. */
async function writeRails(
  tx: Prisma.TransactionClient,
  cabinetId: number,
  rails: PlanRail[],
  planned: ImportedRail[],
  articleIds: Map<string, number>,
): Promise<void> {
  const sources = new Map(rails.map((rail) => [rail.bmk, rail]));
  const createdRails = await tx.rail.createManyAndReturn({
    select: { id: true, bmk: true },
    data: planned.map((rail) => ({
      cabinetId,
      bmk: rail.bmk,
      articleId: articleIds.get(articleKey(sources.get(rail.bmk)!))!,
      cutLengthMm: rail.cutLengthMm,
      cutOrder: rail.cutOrder,
      barIndex: rail.barIndex,
      barOffsetMm: rail.barOffsetMm,
      partCount: rail.steps.length,
    })),
  });
  const railIds = new Map(createdRails.map((rail) => [rail.bmk, rail.id]));
  await tx.railProgress.createMany({ data: createdRails.map((rail) => ({ railId: rail.id })) });

  const items = planned.flatMap((rail) => {
    const sourceItems = new Map(sources.get(rail.bmk)!.placedItems.map((item) => [item.bmk, item]));
    return rail.steps.map((step) => ({ railBmk: rail.bmk, step, item: sourceItems.get(step.bmk)! }));
  });
  const created: { id: number; railId: number; bmk: string }[] = [];
  for (const part of chunks(items, 2000)) {
    created.push(
      ...(await tx.placedItem.createManyAndReturn({
        select: { id: true, railId: true, bmk: true },
        data: part.map(({ railBmk, step, item }) => ({
          railId: railIds.get(railBmk)!,
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
          planWarning: step.planWarning?.code ?? null,
        })),
      })),
    );
  }

  // The links between parts are only known by id once all parts exist: the part a stacked part
  // clips onto, and the part a plan warning is about. BMKs are unique per rail only.
  const idOf = new Map(created.map((part) => [`${part.railId}/${part.bmk}`, part.id]));
  const links = items
    .map(({ railBmk, step }) => {
      const railId = railIds.get(railBmk)!;
      const lookup = (bmk: string | null | undefined) => (bmk ? idOf.get(`${railId}/${bmk}`)! : null);
      return { id: lookup(step.bmk)!, mountsOn: lookup(step.mountsOnBmk), warnedAbout: lookup(step.planWarning?.otherBmk) };
    })
    .filter((link) => link.mountsOn !== null || link.warnedAbout !== null);
  for (const part of chunks(links)) {
    const values = part.map((link) => Prisma.sql`(${link.id}::integer, ${link.mountsOn}::integer, ${link.warnedAbout}::integer)`);
    await tx.$executeRaw`
      UPDATE placed_items p
      SET mounts_on_item_id = v.mounts_on, plan_warning_item_id = v.warned_about
      FROM (VALUES ${Prisma.join(values)}) AS v(id, mounts_on, warned_about)
      WHERE p.id = v.id`;
  }
}
