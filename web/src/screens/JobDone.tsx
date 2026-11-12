import { Navigate } from "react-router-dom";
import { useCabinetContext } from "../app/CabinetLayout";
import { landingPath, paths } from "../app/landing";
import { LinkButton } from "../components/Button";
import { useI18n } from "../i18n/I18nProvider";
import styles from "./Done.module.css";

/** Every rail is cut and mounted. */
export function JobDone() {
  const { t, mm } = useI18n();
  const cabinet = useCabinetContext();
  if (cabinet.rails.some((rail) => rail.status !== "DONE")) return <Navigate to={landingPath(cabinet)} replace />;

  const parts = cabinet.rails.reduce((sum, rail) => sum + rail.partCount, 0);
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{t.jobDone.title}</h1>
      <p className={styles.summary}>{t.jobDone.summary(cabinet.rails.length, parts)}</p>
      <ul className={styles.list}>
        {cabinet.rails.map((rail) => (
          <li key={rail.id}>
            <span className="bmk">{rail.bmk}</span> · {mm(rail.cutLengthMm)} · {t.picker.parts(rail.mountedCount, rail.partCount)}
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <LinkButton to={paths.rails(cabinet.id)} tone="secondary">
          {t.jobDone.overview}
        </LinkButton>
      </div>
    </div>
  );
}
