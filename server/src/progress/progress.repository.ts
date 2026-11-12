import { Injectable } from "@nestjs/common";
import type { Prisma, WorkEventType } from "@prisma/client";

export interface LockedRail {
  cabinetId: number;
  railId: number;
  cutAt: Date | null;
  mountedCount: number;
  partCount: number;
}

/** Progress writes. Every method runs inside the caller's transaction. */
@Injectable()
export class ProgressRepository {
  /**
   * Reads a rail's progress and locks its row until the transaction ends, so two screens changing
   * the same rail take turns. Returns null when the rail is not in this cabinet.
   */
  async lockRail(tx: Prisma.TransactionClient, cabinetId: number, railId: number): Promise<LockedRail | null> {
    const rows = await tx.$queryRaw<{ cut_at: Date | null; mounted_count: number }[]>`
      SELECT p.cut_at, p.mounted_count
      FROM rail_progress p
      JOIN rails r ON r.id = p.rail_id
      WHERE p.rail_id = ${railId} AND r.cabinet_id = ${cabinetId}
      FOR UPDATE OF p`;
    if (rows.length === 0) return null;
    const partCount = await tx.placedItem.count({ where: { railId } });
    return { cabinetId, railId, cutAt: rows[0].cut_at, mountedCount: rows[0].mounted_count, partCount };
  }

  cabinetExists(tx: Prisma.TransactionClient, cabinetId: number): Promise<boolean> {
    return tx.cabinet.count({ where: { id: cabinetId } }).then((count) => count > 0);
  }

  async setProgress(tx: Prisma.TransactionClient, railId: number, cutAt: Date | null, mountedCount: number): Promise<void> {
    await tx.railProgress.update({ where: { railId }, data: { cutAt, mountedCount } });
  }

  /** The part mounted as step `mountSeq`. */
  findPartId(tx: Prisma.TransactionClient, railId: number, mountSeq: number): Promise<number> {
    return tx.placedItem
      .findUniqueOrThrow({ where: { railId_mountSeq: { railId, mountSeq } }, select: { id: true } })
      .then((part) => part.id);
  }

  async addEvent(tx: Prisma.TransactionClient, rail: LockedRail, type: WorkEventType, placedItemId?: number): Promise<void> {
    await tx.workEvent.create({ data: { cabinetId: rail.cabinetId, railId: rail.railId, type, placedItemId } });
  }
}
