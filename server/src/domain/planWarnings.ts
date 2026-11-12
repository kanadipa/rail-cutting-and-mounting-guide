/** A part may reach past the rail's ends by this much before it is reported. */
const OVERHANG_TOLERANCE_MM = 1;
/**
 * Housings reach over their neighbours (a CPU covers half of the narrow module next to it), so
 * two parts clash only when the narrower one lies almost entirely within the other.
 */
const CLASH_RATIO = 0.75;

export type PlanWarningCode = "OVERLAPS_PART" | "PAST_RAIL_END";

export interface PlanWarning {
  code: PlanWarningCode;
  /** OVERLAPS_PART: the part it shares the rail with. */
  otherBmk: string | null;
}

export interface WarningInput {
  bmk: string;
  xStartMm: number;
  xEndMm: number;
  /** True for parts that sit on the rail itself. */
  onRail: boolean;
}

/**
 * Things in a plan that cannot be built as drawn, per part (null when the part is fine):
 * two parts on the same stretch of rail, or a part reaching past the cut piece. They do not stop
 * the import; the mount screen shows them on the step so the operator asks before mounting.
 * A part with both problems reports the overlap.
 */
export function planWarnings(steps: WarningInput[], cutLengthMm: number): (PlanWarning | null)[] {
  return steps.map((step) => {
    const clash = step.onRail ? largestClash(step, steps) : null;
    if (clash) return { code: "OVERLAPS_PART", otherBmk: clash.bmk };
    const pastEnd = step.xEndMm - cutLengthMm > OVERHANG_TOLERANCE_MM || -step.xStartMm > OVERHANG_TOLERANCE_MM;
    return pastEnd ? { code: "PAST_RAIL_END", otherBmk: null } : null;
  });
}

const widthMm = (step: WarningInput): number => step.xEndMm - step.xStartMm;

const overlapMm = (a: WarningInput, b: WarningInput): number =>
  Math.min(a.xEndMm, b.xEndMm) - Math.max(a.xStartMm, b.xStartMm);

function largestClash(step: WarningInput, steps: WarningInput[]): WarningInput | null {
  const clashes = steps.filter((other) => {
    if (other === step || !other.onRail) return false;
    const narrower = Math.min(widthMm(step), widthMm(other));
    return narrower > 0 && overlapMm(step, other) >= narrower * CLASH_RATIO;
  });
  return clashes.sort((a, b) => overlapMm(b, step) - overlapMm(a, step))[0] ?? null;
}
