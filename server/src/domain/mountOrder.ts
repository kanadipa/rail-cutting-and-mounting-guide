import type { Box } from "./box";

export const MARKER_CARRIER_CATEGORY = "marker_carrier";

/** Two parts share a stretch of rail when they overlap by at least this share of the narrower one. */
const SHARED_STRETCH_RATIO = 0.5;
/** Parts whose lowest points are closer than this sit at the same level; neither clips onto the other. */
const SAME_LEVEL_TOLERANCE_MM = 1;
/** Neighbouring models touch or overlap by a hair. A carrier sits on a part only beyond that. */
const CARRIER_MIN_OVERLAP_MM = 0.5;

export interface MountInput {
  bmk: string;
  category: string;
  /** The part's bounding box at its pose, in the rail frame. */
  box: Box;
}

export interface MountStep {
  bmk: string;
  category: string;
  /** 1..n, no gaps. */
  mountSeq: number;
  xStartMm: number;
  xEndMm: number;
  zMinMm: number;
  /** The part this one clips onto; null when it sits on the rail itself. */
  mountsOnBmk: string | null;
  /** Marker carriers only: the mount steps of the first and last part it labels. */
  labelsFirstSeq: number | null;
  labelsLastSeq: number | null;
}

interface Part {
  bmk: string;
  category: string;
  xStart: number;
  xEnd: number;
  zMin: number;
}

/**
 * Works out the order in which the parts of one rail are mounted.
 *
 * It reads each part's bounding box, never its pose position: model origins differ per article
 * (one base unit has its origin 15 mm right of its left edge, its neighbours 5 mm), so sorting by
 * origin puts a module before the base unit it clips onto.
 *
 * - Parts on the rail go left to right by their left edge.
 * - A part that shares a stretch of rail with a part nearer the rail clips onto that part and
 *   comes right after it.
 * - A marker carrier labels the parts of its BMK group (`-XE` labels every `-XE:…`) and goes on
 *   after the last of them, although it physically clips onto only the part under it.
 */
export function mountOrder(items: MountInput[]): MountStep[] {
  const parts = items.map(toPart);
  const carriers = parts.filter(isCarrier).sort(leftToRight);
  const others = parts.filter((part) => !isCarrier(part));

  const supportOf = new Map<Part, Part | null>(others.map((part) => [part, findSupport(part, others)]));

  const ordered: Part[] = [];
  const place = (part: Part): void => {
    ordered.push(part);
    others
      .filter((other) => supportOf.get(other) === part)
      .sort(nearestRailFirst)
      .forEach(place);
  };
  others
    .filter((part) => supportOf.get(part) === null)
    .sort(leftToRight)
    .forEach(place);

  const labelledBy = new Map<Part, Part[]>();
  for (const carrier of carriers) {
    const under = ordered.filter((part) => !isCarrier(part) && overlapMm(part, carrier) > CARRIER_MIN_OVERLAP_MM);
    const inGroup = ordered.filter((part) => !isCarrier(part) && part.bmk.startsWith(`${carrier.bmk}:`));
    const labelled = inGroup.length > 0 ? inGroup : under;
    labelledBy.set(carrier, labelled);
    supportOf.set(carrier, [...under].sort((a, b) => overlapMm(b, carrier) - overlapMm(a, carrier))[0] ?? null);
    ordered.splice(carrierIndex(ordered, carrier, [...labelled, ...under]), 0, carrier);
  }

  const seqOf = new Map<Part, number>(ordered.map((part, index) => [part, index + 1]));
  return ordered.map((part) => {
    const labelledSeqs = (labelledBy.get(part) ?? []).map((labelled) => seqOf.get(labelled)!);
    return {
      bmk: part.bmk,
      category: part.category,
      mountSeq: seqOf.get(part)!,
      xStartMm: part.xStart,
      xEndMm: part.xEnd,
      zMinMm: part.zMin,
      mountsOnBmk: supportOf.get(part)?.bmk ?? null,
      labelsFirstSeq: labelledSeqs.length > 0 ? Math.min(...labelledSeqs) : null,
      labelsLastSeq: labelledSeqs.length > 0 ? Math.max(...labelledSeqs) : null,
    };
  });
}

const toPart = (item: MountInput): Part => ({
  bmk: item.bmk,
  category: item.category,
  xStart: item.box.min.x,
  xEnd: item.box.max.x,
  zMin: item.box.min.z,
});

const isCarrier = (part: Part): boolean => part.category === MARKER_CARRIER_CATEGORY;

const leftToRight = (a: Part, b: Part): number => a.xStart - b.xStart || a.zMin - b.zMin || a.bmk.localeCompare(b.bmk);

const nearestRailFirst = (a: Part, b: Part): number => a.zMin - b.zMin || leftToRight(a, b);

const overlapMm = (a: Part, b: Part): number => Math.min(a.xEnd, b.xEnd) - Math.max(a.xStart, b.xStart);

function sharesStretch(a: Part, b: Part): boolean {
  const narrower = Math.min(a.xEnd - a.xStart, b.xEnd - b.xStart);
  return narrower > 0 && overlapMm(a, b) >= narrower * SHARED_STRETCH_RATIO;
}

/**
 * The part `part` clips onto: of the parts below it on the same stretch, the nearest one. When
 * several sit at that level, the one it overlaps most.
 */
function findSupport(part: Part, others: Part[]): Part | null {
  const below = others.filter(
    (other) => other !== part && sharesStretch(other, part) && other.zMin < part.zMin - SAME_LEVEL_TOLERANCE_MM,
  );
  if (below.length === 0) return null;
  const topLevel = Math.max(...below.map((other) => other.zMin));
  return below
    .filter((other) => other.zMin >= topLevel - SAME_LEVEL_TOLERANCE_MM)
    .sort((a, b) => overlapMm(b, part) - overlapMm(a, part) || leftToRight(a, b))[0];
}

/**
 * Right after the last part the carrier labels or sits on; a carrier over empty rail that labels
 * nothing goes by its left edge.
 */
function carrierIndex(ordered: Part[], carrier: Part, before: Part[]): number {
  if (before.length > 0) return Math.max(...before.map((part) => ordered.indexOf(part))) + 1;
  const next = ordered.findIndex((part) => part.xStart > carrier.xStart);
  return next === -1 ? ordered.length : next;
}
