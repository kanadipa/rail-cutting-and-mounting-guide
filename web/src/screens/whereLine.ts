import type { WhereHint } from "../api/types";
import type { Dictionary } from "../i18n/en";

export interface WhereLine {
  text: string;
  /** Empty rail to leave free: the line is shown as a warning. */
  warning: boolean;
}

/**
 * Says where a part goes in shop words. Positions are whole millimetres from the rail's left
 * end; the operator measures with a tape, not in model coordinates.
 */
export function whereLine(where: WhereHint, t: Dictionary, mm: (value: number) => string): WhereLine {
  switch (where.kind) {
    case "FIRST":
      return { text: t.mount.first(mm(where.atMm)), warning: false };
    case "NEXT_TO":
      return { text: t.mount.nextTo(where.neighbourBmk, mm(where.atMm)), warning: false };
    case "AFTER_GAP":
      return { text: t.mount.afterGap(mm(where.gapMm), mm(where.atMm)), warning: true };
    case "CLIP_ONTO":
      return { text: t.mount.clipOnto(where.onBmk), warning: false };
    case "CARRIER": {
      const labels = where.labelsFrom && where.labelsTo ? t.mount.carrierLabels(where.labelsFrom, where.labelsTo) : null;
      const on = where.onBmk ? t.mount.carrier(where.onBmk) : null;
      return { text: [on, labels].filter(Boolean).join(" · "), warning: false };
    }
  }
}
