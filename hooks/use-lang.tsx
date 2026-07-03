'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, type Lang, type TranslationKey } from '@/lib/i18n';

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
};

const LangContext = createContext<LangContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => translations.fr[key] as string,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    const saved = localStorage.getItem('maestro_lang') as Lang | null;
    if (saved === 'fr' || saved === 'en') setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('maestro_lang', l);
  };

  const t = (key: TranslationKey): string => {
    const val = translations[lang][key];
    return Array.isArray(val) ? val.join(', ') : (val as string);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
