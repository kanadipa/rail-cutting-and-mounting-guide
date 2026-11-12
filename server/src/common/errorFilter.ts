import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";
import { AppError } from "./appError";
import { logEvent } from "./logger";
import type { RequestWithId } from "./requestId";

/**
 * The one place errors become responses. Every error leaves in the same shape:
 * `{ error: { code, message, details } }`. Unexpected errors keep their stack in the server log
 * and tell the client nothing.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const error = toAppError(exception);

    const fields = { requestId: request.requestId, method: request.method, path: request.originalUrl, code: error.code };
    if (error.status >= 500) {
      logEvent("error", "request.failed", { ...fields, stack: exception instanceof Error ? exception.stack : String(exception) });
    } else {
      logEvent(error.status === 409 ? "warn" : "info", "request.rejected", { ...fields, details: error.details });
    }

    http
      .getResponse<Response>()
      .status(error.status)
      .json({ error: { code: error.code, message: error.message, details: error.details } });
  }
}

function toAppError(exception: unknown): AppError {
  if (exception instanceof AppError) return exception;
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    if (status === 404) return new AppError("NOT_FOUND", "No such route");
    if (status >= 400 && status < 500) {
      const body = exception.getResponse();
      const problems = typeof body === "object" && body !== null && "message" in body ? body.message : exception.message;
      return new AppError("VALIDATION_FAILED", "The request is not valid", { problems });
    }
  }
  return new AppError("INTERNAL", "Something went wrong on the server");
}
