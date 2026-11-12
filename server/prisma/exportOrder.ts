/**
 * Temporary: writes the imported mounting order to web/dev/order.json for the replay page, so
 * the order can be checked by eye before the operator screens exist.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const rails = await prisma.rail.findMany({
    orderBy: { cutOrder: "asc" },
    include: { article: true, placedItems: { orderBy: { mountSeq: "asc" }, include: { article: true, mountsOn: true } } },
  });
  const order = rails.map((rail) => ({
    bmk: rail.bmk,
    cutLengthMm: rail.cutLengthMm,
    barLengthMm: rail.article.barLengthMm,
    glb: `/${rail.article.glbPath}`,
    items: rail.placedItems.map((item) => ({
      mountSeq: item.mountSeq,
      bmk: item.bmk,
      category: item.article.category,
      displayName: item.article.displayName,
      xStartMm: item.xStartMm,
      gapBeforeMm: item.gapBeforeMm,
      mountsOn: item.mountsOn?.bmk ?? null,
      glb: `/${item.article.glbPath}`,
      pose: item.pose,
    })),
  }));
  const file = path.resolve(__dirname, "../../web/dev/order.json");
  fs.writeFileSync(file, JSON.stringify(order, null, 1));
  console.log(`Wrote ${file}`);
  await prisma.$disconnect();
}

void main();
