import type { Bar } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";
import styles from "./BarStrip.module.css";

interface BarStripProps {
  bar: Bar;
  /** The piece being cut now. */
  currentRailId: number | null;
  /** Rails already cut. */
  cutRailIds: Set<number>;
}

/** The raw bar drawn to scale: the planned pieces from its start, then what is left of it. */
export function BarStrip({ bar, currentRailId, cutRailIds }: BarStripProps) {
  const { t, mm } = useI18n();
  const pieceClass = (railId: number) =>
    [styles.piece, railId === currentRailId ? styles.current : cutRailIds.has(railId) ? styles.cut : ""].join(" ");

  return (
    <div className={styles.strip}>
      <div className={styles.bar}>
        {bar.pieces.map((piece) => (
          <div key={piece.railId} className={pieceClass(piece.railId)} style={{ width: `${(piece.lengthMm / bar.barLengthMm) * 100}%` }}>
            {piece.bmk}
          </div>
        ))}
        <div className={styles.remnant}>{t.cut.barLeft(mm(bar.remnantMm))}</div>
      </div>
      <div className={styles.caption}>
        <span>{t.cut.fromBar(bar.barIndex + 1)}</span>
        <span>{mm(bar.barLengthMm)}</span>
      </div>
    </div>
  );
}
