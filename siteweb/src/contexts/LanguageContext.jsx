import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '@/lib/translations';

const LanguageContext = createContext({
  lang: 'fr',
  isArabic: false,
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('elmokhtar_lang');
    if (saved === 'ar' || saved === 'fr') return saved;
    return 'fr'; // Français par défaut
  });

  const isArabic = lang === 'ar';

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = isArabic ? 'rtl' : 'ltr';
    localStorage.setItem('elmokhtar_lang', lang);
  }, [lang, isArabic]);

  const setLang = (newLang) => {
    if (newLang === 'ar' || newLang === 'fr') {
      setLangState(newLang);
    }
  };

  const toggleLang = () => {
    setLangState(prev => (prev === 'fr' ? 'ar' : 'fr'));
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['fr']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, isArabic, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
