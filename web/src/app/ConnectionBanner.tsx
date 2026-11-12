import { useI18n } from "../i18n/I18nProvider";
import { useConnection } from "../save/ConnectionProvider";
import styles from "./Shell.module.css";

/**
 * Stays on screen for as long as the server cannot be reached. It says what was saved last, so
 * the operator knows which part the system still expects on the rail.
 */
export function ConnectionBanner() {
  const { t } = useI18n();
  const { lost, lastSaved } = useConnection();
  if (!lost) return null;
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.bannerMark} aria-hidden="true">
        !
      </span>
      <span>
        {t.connection.lost}
        {lastSaved && ` ${t.connection.lastSaved(lastSaved)} ${t.connection.keepRail}`}
      </span>
    </div>
  );
}
