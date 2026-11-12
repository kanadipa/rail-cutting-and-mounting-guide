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
  const mounted = cabinet.rails.filter((rail) => rail.status === "DONE").length;
  const tab = ({ isActive }: { isActive: boolean }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`;

  return (
    <header className={styles.header}>
      <span className={styles.cabinet}>{cabinet.name}</span>
      <nav className={styles.tabs}>
        <NavLink to={paths.cut(cabinet.id)} className={tab} draggable={false}>
          {t.tabCut(cut, total)}
        </NavLink>
        {cut > 0 ? (
          <NavLink to={paths.rails(cabinet.id)} className={tab} draggable={false}>
            {t.tabMount(mounted, total)}
          </NavLink>
        ) : (
          <span className={`${styles.tab} ${styles.tabDisabled}`} aria-disabled="true">
            {t.tabMount(mounted, total)}
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
