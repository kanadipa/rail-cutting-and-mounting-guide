import type { Part } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";
import styles from "./Mount.module.css";
import { whereLine } from "./whereLine";

/** The part to take now: what it is called, what it looks like and where it goes. */
export function PartCard({ part }: { part: Part }) {
  const { t, mm } = useI18n();
  const where = whereLine(part.where, t, mm);

  return (
    <section className={styles.card}>
      {part.group && <span className={styles.take}>{t.mount.take(part.group.size, part.group.index)}</span>}
      <h1 className={`bmk ${styles.partBmk}`}>{part.bmk}</h1>
      <p className={styles.name}>{part.displayName}</p>
      <p className={styles.article}>
        {part.manufacturer} · {part.articleNumber}
      </p>
      <div className={styles.photo}>{part.imageUrl && <img src={part.imageUrl} alt="" draggable={false} />}</div>
      <p className={`${styles.where} ${where.warning ? styles.amber : ""}`}>{where.text}</p>
      {part.planWarning && (
        <p className={`${styles.planCheck} ${styles.amber}`}>
          {part.planWarning.code === "OVERLAPS_PART" && part.planWarning.otherBmk
            ? t.mount.warnOverlap(part.planWarning.otherBmk)
            : t.mount.warnPastEnd}
        </p>
      )}
    </section>
  );
}
