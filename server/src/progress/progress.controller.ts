import { Body, Controller, Delete, Param, ParseIntPipe, Put, UseInterceptors } from "@nestjs/common";
import { MutationLogInterceptor } from "./mutationLog.interceptor";
import { ResetDto, StepDto } from "./progress.dto";
import { ProgressService } from "./progress.service";

/** Undo may come without a body; then nothing is confirmed. */
@Controller("cabinets/:cid/rails/:rid")
@UseInterceptors(MutationLogInterceptor)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Put("cut")
  markCut(@Param("cid", ParseIntPipe) cabinetId: number, @Param("rid", ParseIntPipe) railId: number) {
    return this.progress.markCut(cabinetId, railId);
  }

  @Delete("cut")
  undoCut(
    @Param("cid", ParseIntPipe) cabinetId: number,
    @Param("rid", ParseIntPipe) railId: number,
    @Body() body: ResetDto | undefined,
  ) {
    return this.progress.undoCut(cabinetId, railId, body?.confirmReset === true);
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
