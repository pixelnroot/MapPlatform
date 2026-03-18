import { useState, useCallback, createContext, useContext } from 'react'
import en from '../i18n/en.json'
import bn from '../i18n/bn.json'

const dictionaries = { en, bn }

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en')

  const switchLang = useCallback((newLang) => {
    setLang(newLang)
    localStorage.setItem('lang', newLang)
  }, [])

  const t = useCallback((key) => {
    return dictionaries[lang]?.[key] || dictionaries.en[key] || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) return { lang: 'en', switchLang: () => {}, t: (k) => k }
  return ctx
}
