import { NavLink } from "react-router-dom";
import type { Cabinet } from "../api/types";
import { type Language, useI18n } from "../i18n/I18nProvider";
import { paths } from "./landing";
import styles from "./Shell.module.css";

const LANGUAGES: Language[] = ["en", "de"];

/** Cabinet name, the two work steps with their counts, and the language toggle. */
export function Header({ cabinet }: { cabinet: Cabinet }) {
  const { t, language, setLanguage } = useI18n();
  const total = cabinet.rails.length;
  const cut = cabinet.rails.filter((rail) => rail.status !== "TO_CUT").length;
  // Parts, not rails: a rail counts nothing until its last part is on, which hides real progress.
  const mounted = cabinet.rails.reduce((sum, rail) => sum + rail.mountedCount, 0);
  const parts = cabinet.rails.reduce((sum, rail) => sum + rail.partCount, 0);
  const tab = ({ isActive }: { isActive: boolean }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`;

  return (
    <header className={styles.header}>
      <span className={styles.cabinet}>{cabinet.name}</span>
      <nav className={styles.tabs}>
        <NavLink to={paths.cut(cabinet.id)} className={tab} draggable={false} title={t.tabCutTitle(cut, total)}>
          {t.tabCut}
          <span className={styles.tabCount}>{t.tabCount(cut, total)}</span>
        </NavLink>
        {cut > 0 ? (
          <NavLink to={paths.rails(cabinet.id)} className={tab} draggable={false} title={t.tabMountTitle(mounted, parts)}>
            {t.tabMount}
            <span className={styles.tabCount}>{t.tabCount(mounted, parts)}</span>
          </NavLink>
        ) : (
          <span className={`${styles.tab} ${styles.tabDisabled}`} aria-disabled="true">
            {t.tabMount}
            <span className={styles.tabCount}>{t.tabCount(mounted, parts)}</span>
          </span>
        )}
      </nav>
      <div className={styles.language} role="group" aria-label={t.language}>
        {LANGUAGES.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.languageOption}
            aria-pressed={language === option}
            onClick={() => setLanguage(option)}
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}
