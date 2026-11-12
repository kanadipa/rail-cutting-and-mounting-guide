import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { de } from "./de";
import { en, type Dictionary } from "./en";

export type Language = "en" | "de";

const dictionaries: Record<Language, Dictionary> = { en, de };
const STORAGE_KEY = "rail-guide.language";
const DEFAULT_LANGUAGE: Language = "en";

interface I18n {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Dictionary;
  /** A length in whole millimetres, written the way the language writes numbers. */
  mm: (value: number) => string;
}

const I18nContext = createContext<I18n | null>(null);

function storedLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "de" ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(storedLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The toggle still works for this visit when storage is blocked.
    }
  }, [language]);

  const value = useMemo<I18n>(() => {
    const t = dictionaries[language];
    const wholeNumber = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 0, useGrouping: false });
    return { language, setLanguage, t, mm: (length) => t.mm(wholeNumber.format(length)) };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("useI18n needs an I18nProvider above it");
  return i18n;
}
