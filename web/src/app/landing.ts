import type { Cabinet, RailSummary } from "../api/types";

export const paths = {
  cut: (cabinetId: number) => `/cabinets/${cabinetId}/cut`,
  rails: (cabinetId: number) => `/cabinets/${cabinetId}/rails`,
  mount: (cabinetId: number, railId: number) => `/cabinets/${cabinetId}/rails/${railId}/mount`,
  railDone: (cabinetId: number, railId: number) => `/cabinets/${cabinetId}/rails/${railId}/done`,
  jobDone: (cabinetId: number) => `/cabinets/${cabinetId}/done`,
};

/** The rail to mount next: the one already started, else the first that is cut and waiting. */
export function suggestedRail(rails: RailSummary[]): RailSummary | null {
  return rails.find((rail) => rail.status === "IN_PROGRESS") ?? rails.find((rail) => rail.status === "READY") ?? null;
}

/**
 * Where opening the app without a page lands: back at the rail in progress, else at the cutting
 * still to do, else at the rails waiting to be mounted, else at the finished job.
 * Only "/" uses this; a reload of any other page stays on that page.
 */
export function landingPath(cabinet: Cabinet): string {
  const inProgress = cabinet.rails.find((rail) => rail.status === "IN_PROGRESS");
  if (inProgress) return paths.mount(cabinet.id, inProgress.id);
  if (cabinet.rails.some((rail) => rail.status === "TO_CUT")) return paths.cut(cabinet.id);
  if (cabinet.rails.some((rail) => rail.status !== "DONE")) return paths.rails(cabinet.id);
  return paths.jobDone(cabinet.id);
}
