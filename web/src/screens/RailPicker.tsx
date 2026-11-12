import { Link } from "react-router-dom";
import type { RailSummary } from "../api/types";
import { useCabinetContext } from "../app/CabinetLayout";
import { paths, suggestedRail } from "../app/landing";
import { ProgressBar } from "../components/ProgressBar";
import { useI18n } from "../i18n/I18nProvider";
import styles from "./Picker.module.css";

/** Step 2 starts here: any cut rail can be mounted, in any order; the suggested one stands out. */
export function RailPicker() {
  const { t, mm } = useI18n();
  const cabinet = useCabinetContext();
  const suggested = suggestedRail(cabinet.rails);

  const body = (rail: RailSummary) => (
    <>
      <div className={styles.top}>
        <span className={`bmk ${styles.bmk}`}>{rail.bmk}</span>
        <span className={styles.length}>{mm(rail.cutLengthMm)}</span>
      </div>
      <div className={styles.status}>
        {rail.status === "TO_CUT" ? t.picker.cutFirst : t.status[rail.status]}
        {rail.id === suggested?.id && <span className={styles.next}>{t.picker.next}</span>}
      </div>
      <div className={styles.progress}>
        <ProgressBar done={rail.mountedCount} total={rail.partCount} />
        {t.picker.parts(rail.mountedCount, rail.partCount)}
      </div>
    </>
  );

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{t.picker.title}</h1>
      <div className={styles.cards}>
        {cabinet.rails.map((rail) =>
          rail.status === "TO_CUT" ? (
            <div key={rail.id} className={`${styles.card} ${styles.locked}`} aria-disabled="true">
              {body(rail)}
            </div>
          ) : (
            <Link
              key={rail.id}
              to={rail.status === "DONE" ? paths.railDone(cabinet.id, rail.id) : paths.mount(cabinet.id, rail.id)}
              className={`${styles.card} ${rail.id === suggested?.id ? styles.suggested : ""}`}
              draggable={false}
            >
              {body(rail)}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
