import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { PlanService } from "./plan.service";

@Controller("cabinets")
export class PlanController {
  constructor(private readonly plan: PlanService) {}

  @Get()
  listCabinets() {
    return this.plan.listCabinets();
  }

  @Get(":cid")
  getCabinet(@Param("cid", ParseIntPipe) cabinetId: number) {
    return this.plan.getCabinet(cabinetId);
  }

  @Get(":cid/rails/:rid")
  getRail(@Param("cid", ParseIntPipe) cabinetId: number, @Param("rid", ParseIntPipe) railId: number) {
    return this.plan.getRail(cabinetId, railId);
  }
}
