export type ErrorCode =
  | "CABINET_NOT_FOUND"
  | "RAIL_NOT_FOUND"
  | "NOT_FOUND"
  | "INVALID_STEP"
  | "VALIDATION_FAILED"
  | "RAIL_NOT_CUT"
  | "STALE_PROGRESS"
  | "RESET_REQUIRED"
  | "DATABASE_UNAVAILABLE"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  CABINET_NOT_FOUND: 404,
  RAIL_NOT_FOUND: 404,
  NOT_FOUND: 404,
  INVALID_STEP: 400,
  VALIDATION_FAILED: 400,
  RAIL_NOT_CUT: 409,
  STALE_PROGRESS: 409,
  RESET_REQUIRED: 409,
  DATABASE_UNAVAILABLE: 503,
  INTERNAL: 500,
};

/**
 * An error the client is meant to handle. The code is the contract: the operator screen maps it
 * to its own wording, so the message here is for logs and developers only.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.status = STATUS[code];
  }
}
