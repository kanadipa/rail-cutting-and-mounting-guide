import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PROJECT_ROOT, realCatalog, realRails } from "../../test/realPlan";
import { CabinetExistsError, importPlan, type ImportOptions } from "./importPlan";
import { PlanValidationError } from "./validatePlan";

const CABINET = "Import test cabinet";
const prisma = new PrismaClient();

const options = (overrides: Partial<ImportOptions> = {}): ImportOptions => ({
  cabinetName: CABINET,
  rails: realRails(),
  catalog: realCatalog(),
  projectRoot: PROJECT_ROOT,
  reset: false,
  ...overrides,
});

async function removeCabinet(): Promise<void> {
  const cabinet = await prisma.cabinet.findUnique({ where: { name: CABINET } });
  if (!cabinet) return;
  await prisma.workEvent.deleteMany({ where: { cabinetId: cabinet.id } });
  await prisma.cabinet.delete({ where: { id: cabinet.id } });
}

const loadRails = () =>
  prisma.rail.findMany({
    where: { cabinet: { name: CABINET } },
    orderBy: { cutOrder: "asc" },
    include: { progress: true, placedItems: { orderBy: { mountSeq: "asc" }, include: { mountsOn: true } } },
  });

/** Marks the first rail cut with three parts mounted, as an operator would leave it. */
async function workOnFirstRail(): Promise<number> {
  const [rail] = await loadRails();
  await prisma.railProgress.update({ where: { railId: rail.id }, data: { cutAt: new Date(), mountedCount: 3 } });
  await prisma.workEvent.create({ data: { cabinetId: rail.cabinetId, railId: rail.id, type: "CUT" } });
  return rail.id;
}

beforeAll(removeCabinet);
afterAll(async () => {
  await removeCabinet();
  await prisma.$disconnect();
});

describe("importPlan", () => {
  it("writes nothing when the plan is invalid", async () => {
    const rails = realRails();
    rails[1].placedItems[0].articleNumber = "does-not-exist";
    await expect(importPlan(prisma, options({ rails }))).rejects.toThrow(PlanValidationError);
    expect(await prisma.cabinet.findUnique({ where: { name: CABINET } })).toBeNull();
  });

  it("imports both rails with their cutting plan, parts and empty progress", async () => {
    await importPlan(prisma, options());
    const rails = await loadRails();

    expect(rails.map((rail) => [rail.bmk, rail.cutOrder, rail.barIndex, rail.barOffsetMm])).toEqual([
      ["-U1", 1, 0, 0],
      ["-U2", 2, 0, 306],
    ]);
    expect(rails.map((rail) => rail.placedItems.length)).toEqual([25, 46]);
    for (const rail of rails) {
      expect(rail.placedItems.map((item) => item.mountSeq)).toEqual(rail.placedItems.map((_, index) => index + 1));
      expect(rail.progress).toMatchObject({ cutAt: null, mountedCount: 0 });
    }
  });

  it("links a stacked part to the part it clips onto", async () => {
    const [u1] = await loadRails();
    const module = u1.placedItems.find((item) => item.bmk === "-2K1/1");
    expect(module?.mountsOn?.bmk).toBe("-2K1/2");
  });

  it("refuses to import an existing cabinet again and keeps its progress", async () => {
    const railId = await workOnFirstRail();
    await expect(importPlan(prisma, options())).rejects.toThrow(CabinetExistsError);
    expect(await prisma.railProgress.findUnique({ where: { railId } })).toMatchObject({ mountedCount: 3 });
  });

  it("with reset, restores the cabinet to a fresh plan under the same id", async () => {
    const before = await prisma.cabinet.findUniqueOrThrow({ where: { name: CABINET } });
    const result = await importPlan(prisma, options({ reset: true }));

    expect(result.cabinetId).toBe(before.id);
    const rails = await loadRails();
    expect(rails.map((rail) => rail.placedItems.length)).toEqual([25, 46]);
    expect(rails.map((rail) => rail.progress?.mountedCount)).toEqual([0, 0]);
    expect(rails.every((rail) => rail.progress?.cutAt === null)).toBe(true);
    expect(await prisma.workEvent.count({ where: { cabinetId: before.id } })).toBe(0);
  });

  it("keeps one row per article however often the catalog is imported", async () => {
    const catalog = realCatalog();
    const keys = catalog.map(({ manufacturer, articleNumber }) => ({ manufacturer, articleNumber }));
    expect(await prisma.article.count({ where: { OR: keys } })).toBe(catalog.length);
  });
});
