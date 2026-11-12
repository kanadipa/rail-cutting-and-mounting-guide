import { useState } from "react";
import type { Part } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { PartGlbView } from "../three/PartGlbView";
import styles from "./Mount.module.css";
import { clipTargetBmk, whereLine } from "./whereLine";

/** The part to take now: what it is called, what it looks like and where it goes. */
export function PartCard({
  part,
  railBmk,
  railLengthMm,
  position,
  total,
}: {
  part: Part;
  railBmk: string;
  railLengthMm: string;
  position: number;
  total: number;
}) {
  const { t, mm } = useI18n();
  const where = whereLine(part.where, t, mm);
  // A part that clips onto another part gets its own colour: the rail is not where it goes.
  const onPart = clipTargetBmk(part.where) !== null;
  const [view, setView] = useState<"photo" | "model">("photo");
  const bannerTone = onPart ? styles.bannerTeal : where.warning ? styles.bannerAmber : styles.bannerNavy;

  return (
    <section className={styles.card}>
      <div className={styles.badges}>
        <span className={styles.railChip}>
          {railBmk} ({railLengthMm})
        </span>
        <span className={styles.partProgress}>{t.mount.partOf(position, total)}</span>
      </div>
      {part.group && <span className={styles.take}>{t.mount.take(part.group.size, part.group.index)}</span>}
      <h1 className={`bmk ${styles.partBmk}`}>{part.bmk}</h1>
      <p className={styles.name}>{part.displayName}</p>
      <p className={styles.article}>
        {part.manufacturer} · {part.articleNumber}
      </p>

      <div className={styles.photoBox}>
        <div className={styles.segment} role="group" aria-label={t.mount.photo + " / " + t.mount.model}>
          {(["photo", "model"] as const).map((option) => (
            <button key={option} type="button" className={styles.segmentKey} aria-pressed={view === option} onClick={() => setView(option)}>
              {option === "photo" ? t.mount.photo : t.mount.model}
            </button>
          ))}
        </div>
        {view === "photo" ? (
          part.imageUrl && <img src={part.imageUrl} alt="" draggable={false} />
        ) : (
          <>
            <PartGlbView key={part.glbUrl} glbUrl={part.glbUrl} />
            <span className={styles.dragHint}>{t.mount.dragToTurn}</span>
          </>
        )}
      </div>

      <div className={`${styles.banner} ${bannerTone}`}>
        <span className={styles.bannerMain}>{where.text}</span>
        <span className={styles.bannerSub}>{onPart ? t.mount.onPart : t.mount.onRail}</span>
      </div>
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
