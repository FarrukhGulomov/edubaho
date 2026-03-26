'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useLang, t } from '@/contexts/LangContext'

const NAV_LINKS = [
  { href: '/search',                    uz: "🔍 Qidirish",       ru: '🔍 Поиск' },
  { href: '/search?type=COURSE_CENTER', uz: "✏️ O'quv markazlar", ru: '✏️ Учебные центры' },
  { href: '/search?type=SCHOOL',        uz: '📚 Maktablar',       ru: '📚 Школы' },
]

export default function Header() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, loading, logout } = useAuth()
  const { lang, setLang } = useLang()

  const isActive = (href: string) => {
    const [path, query] = href.split('?')
    if (query) return pathname === path && typeof window !== 'undefined' && window.location.search.includes(query.split('=')[1])
    return pathname === path
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 glass shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-lg shadow-sm transition-transform group-hover:scale-105">
            🎓
          </div>
          <div className="leading-none">
            <div className="font-black text-gray-900 text-base tracking-tight">EduReyting</div>
            <div className="text-[10px] font-semibold text-primary-500 tracking-wide">.uz</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                isActive(link.href)
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {lang === 'uz' ? link.uz : link.ru}
            </Link>
          ))}
          {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
            <Link
              href="/admin"
              className="ml-1 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-100"
            >
              🛡️ Admin
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm transition-all hover:border-primary-200 hover:text-primary-600"
          >
            <span className="text-sm">{lang === 'uz' ? '🇷🇺' : '🇺🇿'}</span>
            {lang === 'uz' ? 'RU' : 'UZ'}
          </button>

          {/* Auth */}
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-xl bg-gray-100" />
          ) : user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-primary-200 hover:text-primary-700"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-black text-white shadow-sm">
                  {(user.name ?? user.phone).slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[80px] truncate text-xs">{user.name ?? user.phone}</span>
              </Link>
              <button
                onClick={logout}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                {t(lang, { uz: 'Chiqish', ru: 'Выйти' })}
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="hidden rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md sm:flex items-center gap-1.5"
            >
              {t(lang, { uz: 'Kirish', ru: 'Войти' })}
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="rounded-xl border border-gray-200 p-2 text-gray-600 transition-all hover:bg-gray-100 sm:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menyu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu — slide down */}
      {menuOpen && (
        <div className="animate-slide-down border-t border-gray-100 bg-white px-4 pb-4 pt-3 sm:hidden">
          {/* User info */}
          {user && (
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-50 to-primary-100 px-4 py-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-black text-white shadow">
                {(user.name ?? user.phone).slice(0, 1).toUpperCase()}
              </span>
              <div>
                <div className="font-semibold text-primary-900 text-sm">{user.name ?? user.phone}</div>
                <div className="text-xs text-primary-600">{t(lang, { uz: 'Profilni ko\'rish', ru: 'Смотреть профиль' })}</div>
              </div>
            </Link>
          )}

          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {lang === 'uz' ? link.uz : link.ru}
              </Link>
            ))}
            {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
              >
                🛡️ Admin panel
              </Link>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { setLang(lang === 'uz' ? 'ru' : 'uz'); setMenuOpen(false) }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600"
            >
              {lang === 'uz' ? '🇷🇺 Русский' : '🇺🇿 O\'zbek'}
            </button>
            {user ? (
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="flex flex-1 items-center justify-center rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-500"
              >
                {t(lang, { uz: 'Chiqish', ru: 'Выйти' })}
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="flex flex-1 items-center justify-center rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white"
              >
                {t(lang, { uz: 'Kirish', ru: 'Войти' })}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
