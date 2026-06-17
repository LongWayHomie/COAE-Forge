import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import pl from "./locale/ui.pl.js";
import { EXPLAINERS } from "./locale/explainers.js";

const DICTS = { en: {}, pl };
const I18nContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("coae-lang") || "en");

  useEffect(() => {
    localStorage.setItem("coae-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // t("English string") -> localized string (English fallback).
  const t = useMemo(() => {
    const dict = DICTS[lang] || {};
    return (s) => (lang === "en" ? s : dict[s] ?? s);
  }, [lang]);

  // Format helper for sentences with {placeholders}: tf("Class {n} ...", { n: 7 }).
  const tf = useCallback(
    (template, vars = {}) =>
      Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), t(template)),
    [t]
  );

  // Explainer content for a topic in the current language (English fallback).
  const explain = useMemo(() => {
    return (topic) => (EXPLAINERS[lang] && EXPLAINERS[lang][topic]) || EXPLAINERS.en[topic] || null;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, tf, explain }), [lang, t, tf, explain]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
