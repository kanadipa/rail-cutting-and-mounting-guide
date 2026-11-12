import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export interface RequestWithId extends Request {
  requestId: string;
}

/** Gives every request an id (the caller's, if it sent one) and echoes it in the response. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = req.header("x-request-id") ?? randomUUID();
  (req as RequestWithId).requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
