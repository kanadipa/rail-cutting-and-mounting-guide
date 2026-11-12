import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import { type Observable, tap } from "rxjs";
import { AppError } from "../common/appError";
import { logEvent } from "../common/logger";
import type { RequestWithId } from "../common/requestId";
import type { ProgressView } from "./progress.service";

/** Writes one log line per progress change: who asked for what, and how it ended. */
@Injectable()
export class MutationLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler<ProgressView>): Observable<ProgressView> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const body = (request.body ?? {}) as { from?: number; to?: number; confirmReset?: boolean };
    const fields = {
      requestId: request.requestId,
      action: context.getHandler().name,
      cabinetId: Number(request.params.cid),
      railId: Number(request.params.rid),
      from: body.from,
      to: body.to,
      confirmReset: body.confirmReset,
    };
    return next.handle().pipe(
      tap({
        next: (result) =>
          logEvent("info", "progress.mutation", {
            ...fields,
            result: result.changed ? "APPLIED" : "NO_CHANGE",
            mountedCount: result.mountedCount,
            status: result.status,
          }),
        error: (error: unknown) =>
          logEvent("warn", "progress.mutation", { ...fields, result: error instanceof AppError ? error.code : "INTERNAL" }),
      }),
    );
  }
}
