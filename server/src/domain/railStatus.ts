export type RailStatus = "TO_CUT" | "READY" | "IN_PROGRESS" | "DONE";

/** A rail's status follows from its progress and is never stored. */
export function railStatus(cutAt: Date | null, mountedCount: number, partCount: number): RailStatus {
  if (cutAt === null) return "TO_CUT";
  if (mountedCount >= partCount) return "DONE";
  return mountedCount === 0 ? "READY" : "IN_PROGRESS";
}
