import { Injectable } from "@nestjs/common";
import { AppError } from "../common/appError";
import { PlanRepository } from "./plan.repository";
import { toBars, toRailSummary, toRailView, type CabinetView, type RailView } from "./plan.views";

@Injectable()
export class PlanService {
  constructor(private readonly plan: PlanRepository) {}

  listCabinets() {
    return this.plan.listCabinets();
  }

  async getCabinet(cabinetId: number): Promise<CabinetView> {
    const cabinet = await this.requireCabinet(cabinetId);
    const rails = await this.plan.findRails(cabinetId);
    return {
      ...cabinet,
      rails: rails.map((rail) => toRailSummary(rail)),
      bars: toBars(rails),
    };
  }

  /** A rail of another cabinet is not found here, whatever its id. */
  async getRail(cabinetId: number, railId: number): Promise<RailView> {
    const rail = await this.plan.findRailWithParts(cabinetId, railId);
    if (!rail) {
      await this.requireCabinet(cabinetId);
      throw new AppError("RAIL_NOT_FOUND", `Rail ${railId} is not in cabinet ${cabinetId}`, { cabinetId, railId });
    }
    return toRailView(rail);
  }

  private async requireCabinet(cabinetId: number) {
    const cabinet = await this.plan.findCabinet(cabinetId);
    if (!cabinet) throw new AppError("CABINET_NOT_FOUND", `Cabinet ${cabinetId} does not exist`, { cabinetId });
    return cabinet;
  }
}
