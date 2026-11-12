import type { Cabinet, CabinetRef, Progress, Rail } from "./types";

const TIMEOUT_MS = 5000;

/**
 * A failed request. `code` is the server's error code, or NETWORK when no answer came (offline,
 * server down, timeout). The server's message is never shown: screens word errors themselves.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

/** Worth trying again: nothing was decided by the server. */
export const isRetryable = (error: unknown): boolean =>
  error instanceof ApiError && (error.code === "NETWORK" || error.status >= 500);

export const hasCode = (error: unknown, code: string): error is ApiError => error instanceof ApiError && error.code === code;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("NETWORK", 0);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { code?: string; details?: Record<string, unknown> } } | null;
    throw new ApiError(payload?.error?.code ?? "INTERNAL", response.status, payload?.error?.details ?? {});
  }
  return (await response.json()) as T;
}

const rail = (cabinetId: number, railId: number) => `/cabinets/${cabinetId}/rails/${railId}`;

export const api = {
  health: () => request<{ status: "ok" }>("GET", "/health"),
  cabinets: () => request<CabinetRef[]>("GET", "/cabinets"),
  cabinet: (cabinetId: number) => request<Cabinet>("GET", `/cabinets/${cabinetId}`),
  rail: (cabinetId: number, railId: number) => request<Rail>("GET", rail(cabinetId, railId)),
  markCut: (cabinetId: number, railId: number) => request<Progress>("PUT", `${rail(cabinetId, railId)}/cut`),
  step: (cabinetId: number, railId: number, from: number, to: number) =>
    request<Progress>("PUT", `${rail(cabinetId, railId)}/progress`, { from, to }),
};
