import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AppError } from "../common/appError";
import { railStatus, type RailStatus } from "../domain/railStatus";
import { PrismaService } from "../prisma/prisma.service";
import { type LockedRail, ProgressRepository } from "./progress.repository";

export interface ProgressView {
  railId: number;
  status: RailStatus;
  cutAt: string | null;
  mountedCount: number;
  partCount: number;
  /** False when the request found the rail already in the state it asked for. */
  changed: boolean;
}

/**
 * Changes a rail's progress. Each change locks the rail's progress row, decides, and writes the
 * new state together with its work event in one transaction. Asking for the state the rail is
 * already in changes nothing and writes no event, so a retry after a lost response is safe.
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressRepository,
  ) {}

  markCut(cabinetId: number, railId: number): Promise<ProgressView> {
    return this.change(cabinetId, railId, async (tx, rail) => {
      if (rail.cutAt !== null) return view(rail, false);
      const cutAt = new Date();
      await this.progress.setProgress(tx, railId, cutAt, 0);
      await this.progress.addEvent(tx, rail, "CUT");
      return view({ ...rail, cutAt }, true);
    });
  }

  /**
   * Compare-and-set: moves the mounted count from `from` to `to`, one part forward or back.
   * A screen that shows an outdated count is told so instead of moving the rail.
   */
  step(cabinetId: number, railId: number, from: number, to: number): Promise<ProgressView> {
    return this.change(cabinetId, railId, async (tx, rail) => {
      // The CHECK constraints cannot count a rail's parts, so the upper bound is enforced here.
      if (Math.abs(to - from) !== 1 || to > rail.partCount || from > rail.partCount) {
        throw new AppError("INVALID_STEP", `A step moves one part within 0..${rail.partCount}`, {
          from,
          to,
          partCount: rail.partCount,
        });
      }
      if (rail.cutAt === null) throw new AppError("RAIL_NOT_CUT", "The rail has not been cut", { railId });
      if (rail.mountedCount === to) return view(rail, false);
      if (rail.mountedCount !== from) {
        throw new AppError("STALE_PROGRESS", "The rail's progress has changed", { mountedCount: rail.mountedCount });
      }

      await this.progress.setProgress(tx, railId, rail.cutAt, to);
      const mounting = to > from;
      const partId = await this.progress.findPartId(tx, railId, mounting ? to : from);
      await this.progress.addEvent(tx, rail, mounting ? "MOUNT" : "UNMOUNT", partId);
      return view({ ...rail, mountedCount: to }, true);
    });
  }

  private change(
    cabinetId: number,
    railId: number,
    apply: (tx: Prisma.TransactionClient, rail: LockedRail) => Promise<ProgressView>,
  ): Promise<ProgressView> {
    return this.prisma.$transaction(async (tx) => {
      const rail = await this.progress.lockRail(tx, cabinetId, railId);
      if (rail) return apply(tx, rail);
      if (!(await this.progress.cabinetExists(tx, cabinetId))) {
        throw new AppError("CABINET_NOT_FOUND", `Cabinet ${cabinetId} does not exist`, { cabinetId });
      }
      throw new AppError("RAIL_NOT_FOUND", `Rail ${railId} is not in cabinet ${cabinetId}`, { cabinetId, railId });
    });
  }
}

const view = (rail: LockedRail, changed: boolean): ProgressView => ({
  railId: rail.railId,
  status: railStatus(rail.cutAt, rail.mountedCount, rail.partCount),
  cutAt: rail.cutAt?.toISOString() ?? null,
  mountedCount: rail.mountedCount,
  partCount: rail.partCount,
  changed,
});
