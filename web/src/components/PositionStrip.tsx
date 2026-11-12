import { Fragment } from "react";
import type { Part } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";
import styles from "./PositionStrip.module.css";

/** Around the current part, this many mounted and coming parts are named; the rest are ticks. */
const NAMED_BEFORE = 2;
const NAMED_AFTER = 3;

/**
 * Where the operator is in the sequence. A rail holds dozens of parts a few millimetres wide, so
 * only the neighbourhood of the current part is named; everything else is a tick. Empty rail to
 * leave free shows as a gap in the row.
 */
export function PositionStrip({ parts, mountedCount }: { parts: Part[]; mountedCount: number }) {
  const { mm } = useI18n();
  const namedFrom = Math.max(0, mountedCount - NAMED_BEFORE);
  const namedTo = Math.min(parts.length, mountedCount + 1 + NAMED_AFTER);
  const gapBefore = (part: Part) => (part.where.kind === "AFTER_GAP" ? part.where.gapMm : null);

  const ticks = (slice: Part[], done: boolean) =>
    slice.map((part) => (
      <Fragment key={part.id}>
        {gapBefore(part) !== null && <span className={styles.gapTick} />}
        <span className={`${styles.tick} ${done ? styles.tickDone : ""}`} />
      </Fragment>
    ));

  return (
    <div className={styles.strip} aria-hidden="true">
      <div className={`${styles.ticks} ${styles.ticksBefore}`}>{ticks(parts.slice(0, namedFrom), true)}</div>
      {parts.slice(namedFrom, namedTo).map((part, offset) => {
        const index = namedFrom + offset;
        const state = index < mountedCount ? styles.done : index === mountedCount ? styles.current : "";
        const gap = gapBefore(part);
        return (
          <Fragment key={part.id}>
            {gap !== null && <span className={styles.gap}>{mm(gap)}</span>}
            <span className={`${styles.cell} ${state}`}>{part.bmk}</span>
          </Fragment>
        );
      })}
      <div className={styles.ticks}>{ticks(parts.slice(namedTo), false)}</div>
    </div>
  );
}
