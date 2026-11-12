import { Body, Controller, Delete, Param, ParseIntPipe, Put, UseInterceptors } from "@nestjs/common";
import { MutationLogInterceptor } from "./mutationLog.interceptor";
import { StepDto } from "./progress.dto";
import { ProgressService } from "./progress.service";

@Controller("cabinets/:cid/rails/:rid")
@UseInterceptors(MutationLogInterceptor)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Put("cut")
  markCut(@Param("cid", ParseIntPipe) cabinetId: number, @Param("rid", ParseIntPipe) railId: number) {
    return this.progress.markCut(cabinetId, railId);
  }

  @Delete("cut")
  undoCut(@Param("cid", ParseIntPipe) cabinetId: number, @Param("rid", ParseIntPipe) railId: number) {
    return this.progress.undoCut(cabinetId, railId);
  }

  @Put("progress")
  step(
    @Param("cid", ParseIntPipe) cabinetId: number,
    @Param("rid", ParseIntPipe) railId: number,
    @Body() body: StepDto,
  ) {
    return this.progress.step(cabinetId, railId, body.from, body.to);
  }
}
