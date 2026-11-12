import { GAP_WARNING_MM } from "./gaps";
import { MARKER_CARRIER_CATEGORY } from "./mountOrder";

/** Where a part goes, in the terms the operator works in. The screen turns it into one line. */
export type WhereHint =
  | { kind: "FIRST"; atMm: number }
  | { kind: "NEXT_TO"; neighbourBmk: string; atMm: number }
  | { kind: "AFTER_GAP"; gapMm: number; atMm: number }
  | { kind: "CLIP_ONTO"; onBmk: string }
  | { kind: "CARRIER"; onBmk: string | null; labelsFrom: string | null; labelsTo: string | null };

export interface WhereInput {
  bmk: string;
  category: string;
  xStartMm: number;
  gapBeforeMm: number;
  mountsOnBmk: string | null;
  labelsFirstSeq: number | null;
  labelsLastSeq: number | null;
}

/** One hint per part, for parts given in mount order. */
export function whereHints(steps: WhereInput[]): WhereHint[] {
  let previousOnRail: WhereInput | null = null;
  return steps.map((step) => {
    if (step.category === MARKER_CARRIER_CATEGORY) {
      return {
        kind: "CARRIER",
        onBmk: step.mountsOnBmk,
        labelsFrom: terminalAt(steps, step.labelsFirstSeq),
        labelsTo: terminalAt(steps, step.labelsLastSeq),
      };
    }
    if (step.mountsOnBmk !== null) return { kind: "CLIP_ONTO", onBmk: step.mountsOnBmk };

    const neighbour = previousOnRail;
    previousOnRail = step;
    if (neighbour === null) return { kind: "FIRST", atMm: step.xStartMm };
    if (step.gapBeforeMm > GAP_WARNING_MM) return { kind: "AFTER_GAP", gapMm: step.gapBeforeMm, atMm: step.xStartMm };
    return { kind: "NEXT_TO", neighbourBmk: neighbour.bmk, atMm: step.xStartMm };
  });
}

/** A label names the terminal, not its accessories: `-XE:7/3` is labelled as `-XE:7`. */
function terminalAt(steps: WhereInput[], mountSeq: number | null): string | null {
  if (mountSeq === null) return null;
  return steps[mountSeq - 1].bmk.split("/")[0];
}
