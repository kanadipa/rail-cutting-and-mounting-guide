import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** Read queries for the plan. Every rail query is scoped to its cabinet. */
@Injectable()
export class PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCabinets() {
    return this.prisma.cabinet.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } });
  }

  findCabinet(cabinetId: number) {
    return this.prisma.cabinet.findUnique({ where: { id: cabinetId }, select: { id: true, name: true } });
  }

  /** The cabinet's rails (each knows its part count); the parts themselves are loaded per rail. */
  findRails(cabinetId: number) {
    return this.prisma.rail.findMany({
      where: { cabinetId },
      orderBy: { cutOrder: "asc" },
      include: { article: true, progress: true },
    });
  }

  findRailWithParts(cabinetId: number, railId: number) {
    return this.prisma.rail.findFirst({
      where: { id: railId, cabinetId },
      include: {
        article: true,
        progress: true,
        placedItems: {
          orderBy: { mountSeq: "asc" },
          include: { article: true, mountsOn: { select: { bmk: true } }, planWarningItem: { select: { bmk: true } } },
        },
      },
    });
  }
}

export type RailRow = Awaited<ReturnType<PlanRepository["findRails"]>>[number];
export type RailWithParts = NonNullable<Awaited<ReturnType<PlanRepository["findRailWithParts"]>>>;
