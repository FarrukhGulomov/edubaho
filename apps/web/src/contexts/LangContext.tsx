'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Lang = 'uz' | 'ru'

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangContextValue>({ lang: 'uz', setLang: () => {} })

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('uz')

  useEffect(() => {
    const saved = localStorage.getItem('edu_lang') as Lang | null
    if (saved === 'ru') setLangState('ru')
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('edu_lang', l)
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

/** Ikki tilli matn qaytaruvchi yordamchi funksiya */
export function t(lang: Lang, strings: { uz: string; ru: string }): string {
  return strings[lang]
}
