import { GAP_WARNING_MM } from "./gaps";

export interface GroupInput {
  articleId: number;
  /** True for parts that sit on the rail itself. */
  onRail: boolean;
  gapBeforeMm: number;
}

export interface GroupPosition {
  /** How many identical parts are mounted in a row. */
  size: number;
  /** This part's place in the run, from 1. */
  index: number;
}

/**
 * Finds runs of identical parts mounted one after the other, so the operator can take them from
 * the shelf in one trip: same article, all on the rail, no empty rail between them. Parts that
 * are not in a run of two or more get null.
 */
export function groupRuns(steps: GroupInput[]): (GroupPosition | null)[] {
  const positions: (GroupPosition | null)[] = steps.map(() => null);
  let start = 0;
  while (start < steps.length) {
    let end = start + 1;
    while (end < steps.length && continuesRun(steps[start], steps[end])) end += 1;
    const size = end - start;
    if (size > 1) for (let i = start; i < end; i += 1) positions[i] = { size, index: i - start + 1 };
    start = end;
  }
  return positions;
}

const continuesRun = (first: GroupInput, next: GroupInput): boolean =>
  first.onRail && next.onRail && next.articleId === first.articleId && next.gapBeforeMm <= GAP_WARNING_MM;
