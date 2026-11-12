import { useState } from "react";
import { hasCode } from "../api/client";

export interface PendingReset<Request> {
  request: Request;
  mountedCount: number;
}

/**
 * Undoing or redoing a cut on a rail with parts mounted takes them off again, so the server
 * refuses until the operator confirmed. This keeps the refused request to ask about and resend.
 */
export function useResetConfirmation<Request>() {
  const [pending, setPending] = useState<PendingReset<Request> | null>(null);
  return {
    pending,
    /** Call with a rejected save; returns true when it only needs the operator's confirmation. */
    askIfRequired(error: unknown, request: Request): boolean {
      if (!hasCode(error, "RESET_REQUIRED")) return false;
      setPending({ request, mountedCount: Number(error.details.mountedCount ?? 0) });
      return true;
    },
    clear: () => setPending(null),
  };
}
