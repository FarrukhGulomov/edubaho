'use client'

import Link from 'next/link'
import { useLang } from '@/contexts/LangContext'

// Saytning barcha sahifalarida bo'lishi shart bo'lgan umumiy footer
// (loyiha qoidasi: har bir sahifada Telegram havolasi ko'rinishi kerak).
export default function Footer() {
  const { lang } = useLang()
  const uz = lang === 'uz'

  return (
    <footer className="border-t border-gray-200 bg-gray-900 px-4 py-8 text-sm text-gray-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <span>© {new Date().getFullYear()} BilimOn — {uz ? "O'zbekiston ta'lim platformasi" : "Платформа образования Узбекистана"}</span>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/search"  className="shrink-0 whitespace-nowrap transition-colors hover:text-white">{uz ? "Qidiruv" : "Поиск"}</Link>
          <Link href="/compare" className="shrink-0 whitespace-nowrap transition-colors hover:text-white">{uz ? "Solishtirish" : "Сравнение"}</Link>
          <Link href="/auth"    className="shrink-0 whitespace-nowrap transition-colors hover:text-white">{uz ? "Kirish" : "Войти"}</Link>
          <Link href="/terms"   className="shrink-0 whitespace-nowrap transition-colors hover:text-white">{uz ? "Shartlar" : "Условия"}</Link>
          <a href="https://t.me/TrustboxInc" target="_blank" rel="noopener noreferrer"
            className="shrink-0 whitespace-nowrap font-bold text-[#7DD3F8] transition-colors hover:text-white">
            @TrustboxInc
          </a>
        </div>
      </div>
    </footer>
  )
}
