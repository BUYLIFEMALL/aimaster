"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DICTS, LANGS, LANG_NAMES, LANG_STORAGE_KEY, type Dict, type Lang } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && (LANGS as string[]).includes(saved)) setLangState(saved as Lang);
    } catch {
      /* 저장소를 못 쓰면 기본 한국어 */
    }
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      t: DICTS[lang],
      setLang: (next) => {
        setLangState(next);
        try {
          window.localStorage.setItem(LANG_STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
      },
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("LangProvider가 필요합니다.");
  return ctx;
}

export function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-neutral-300 bg-white text-xs font-semibold" role="group" aria-label="Language">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`px-3 py-1.5 transition-colors ${lang === code ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
        >
          {LANG_NAMES[code]}
        </button>
      ))}
    </div>
  );
}
