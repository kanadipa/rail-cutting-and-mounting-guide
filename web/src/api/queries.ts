import { type QueryClient, useQuery } from "@tanstack/react-query";
import { api, isRetryable } from "./client";
import type { Cabinet, Progress, Rail } from "./types";

export const keys = {
  cabinets: ["cabinets"] as const,
  cabinet: (cabinetId: number) => ["cabinet", cabinetId] as const,
  rail: (cabinetId: number, railId: number) => ["rail", cabinetId, railId] as const,
};

/** Reads keep trying while the server cannot be reached; a 4xx is an answer and is not retried. */
const retry = (_count: number, error: unknown): boolean => isRetryable(error);
const retryDelay = (attempt: number): number => Math.min(1000 * 2 ** attempt, 5000);

export const useCabinets = () => useQuery({ queryKey: keys.cabinets, queryFn: api.cabinets, retry, retryDelay });

export const useCabinet = (cabinetId: number) =>
  useQuery({ queryKey: keys.cabinet(cabinetId), queryFn: () => api.cabinet(cabinetId), retry, retryDelay });

export const useRail = (cabinetId: number, railId: number) =>
  useQuery({ queryKey: keys.rail(cabinetId, railId), queryFn: () => api.rail(cabinetId, railId), retry, retryDelay });

/**
 * Puts a saved progress change on screen. The screens show only what the server confirmed, so
 * this is the one place where a rail's progress changes in the cache.
 */
export function applyProgress(client: QueryClient, cabinetId: number, progress: Progress): void {
  const patch = { status: progress.status, cutAt: progress.cutAt, mountedCount: progress.mountedCount };
  client.setQueryData<Rail>(keys.rail(cabinetId, progress.railId), (rail) => rail && { ...rail, ...patch });
  client.setQueryData<Cabinet>(
    keys.cabinet(cabinetId),
    (cabinet) =>
      cabinet && { ...cabinet, rails: cabinet.rails.map((rail) => (rail.id === progress.railId ? { ...rail, ...patch } : rail)) },
  );
}
