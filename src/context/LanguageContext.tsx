import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  type Language,
  getInitialLanguage,
  saveLanguage,
  translate,
  translateAspect,
  translateSentiment,
} from '../utils/i18n';

export type { Language };

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string) => string;
  tAspect: (aspect: string, format?: 'short' | 'full') => string;
  tSentiment: (sentiment: string) => string;
  isVietnamese: boolean;
  isEnglish: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    saveLanguage(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: Language = prev === 'vi' ? 'en' : 'vi';
      saveLanguage(next);
      return next;
    });
  }, []);

  // Update <html lang="..."> attribute on change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback(
    (key: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string): string => {
      return translate(language, key, paramsOrFallback, fallback);
    },
    [language]
  );

  const tAspect = useCallback(
    (aspect: string, format?: 'short' | 'full'): string => {
      return translateAspect(aspect, language, format);
    },
    [language]
  );

  const tSentiment = useCallback(
    (sentiment: string): string => {
      return translateSentiment(sentiment, language);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      tAspect,
      tSentiment,
      isVietnamese: language === 'vi',
      isEnglish: language === 'en',
    }),
    [language, setLanguage, toggleLanguage, t, tAspect, tSentiment]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// oxlint-disable-next-line react/only-export-components
export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
