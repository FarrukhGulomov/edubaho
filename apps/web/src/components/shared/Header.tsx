'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useLang, t } from '@/contexts/LangContext'

/**
 * Asosiy navigatsiya sarlavhasi.
 *
 * Desktop: yuqori qator bilan
 * Mobil:   yuqorida logo + til, pastda 4-tugmali tab bar
 *          (buvilar ham bemalol ishlatsin deb)
 */

const NAV_LINKS = [
  {
    href:  '/search',
    icon:  (active: boolean) => (
      <svg className={`h-6 w-6 ${active ? 'text-primary-600' : 'text-gray-400'}`}
        fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
      </svg>
    ),
    uz: 'Qidirish',
    ru: 'Поиск',
  },
  {
    href:  '/search?type=COURSE_CENTER',
    icon:  (active: boolean) => (
      <svg className={`h-6 w-6 ${active ? 'text-primary-600' : 'text-gray-400'}`}
        fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 14l9-5-9-5-9 5 9 5zm0 7V9m6 3v5a9 9 0 01-12 0v-5"/>
      </svg>
    ),
    uz: 'Kurslar',
    ru: 'Курсы',
  },
  {
    href:  '/profile',
    icon:  (active: boolean) => (
      <svg className={`h-6 w-6 ${active ? 'text-primary-600' : 'text-gray-400'}`}
        fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    ),
    uz: 'Profil',
    ru: 'Профиль',
  },
]

export default function Header() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, loading, logout } = useAuth()
  const { lang, setLang } = useLang()

  const isActive = (href: string) => {
    const [path] = href.split('?')
    return pathname === path
  }

  return (
    <>
      {/* ── Yuqori header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 glass shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 text-xl shadow-sm transition-transform group-hover:scale-105">
              🎓
            </div>
            <div className="leading-none">
              <div className="text-lg font-black text-gray-900 tracking-tight">EduReyting</div>
              <div className="text-[11px] font-bold text-primary-500 tracking-widest">.uz</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/search"
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-base font-semibold transition-all ${
                pathname === '/search'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              🔍 {t(lang, { uz: 'Qidirish', ru: 'Найти' })}
            </Link>
            <Link
              href="/search?type=COURSE_CENTER"
              className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-base font-semibold text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900"
            >
              ✏️ {t(lang, { uz: "O'quv markazlar", ru: 'Учебные центры' })}
            </Link>
            <Link
              href="/search?type=SCHOOL"
              className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-base font-semibold text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900"
            >
              📚 {t(lang, { uz: 'Maktablar', ru: 'Школы' })}
            </Link>
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MODERATOR') && (
              <Link
                href="/admin"
                className="ml-1 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2.5 text-base font-bold text-red-600 transition-all hover:bg-red-100"
              >
                🛡️ Admin
              </Link>
            )}
          </nav>

          {/* O'ng: til + kirish/profil */}
          <div className="flex items-center gap-2">
            {/* Til almashtirish */}
            <button
              onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}
              className="flex items-center gap-1.5 rounded-2xl border-2 border-gray-200 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-600 transition-all hover:border-primary-300 hover:text-primary-600"
              title={lang === 'uz' ? 'Переключить на русский' : "O'zbekchaga o'tish"}
            >
              <span className="text-base">{lang === 'uz' ? '🇷🇺' : '🇺🇿'}</span>
              <span className="hidden sm:inline">{lang === 'uz' ? 'RU' : 'UZ'}</span>
            </button>

            {/* Auth — desktop */}
            {loading ? (
              <div className="hidden h-11 w-28 animate-pulse rounded-2xl bg-gray-100 sm:flex" />
            ) : user ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 rounded-2xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-all hover:border-primary-300 hover:text-primary-700"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-black text-white shadow-sm">
                    {(user.name ?? user.phone ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-[100px] truncate">{user.name ?? user.phone ?? 'Profil'}</span>
                </Link>
                <button
                  onClick={logout}
                  className="rounded-2xl border-2 border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  {t(lang, { uz: 'Chiqish', ru: 'Выйти' })}
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="hidden rounded-2xl bg-primary-600 px-5 py-2.5 text-base font-bold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-lg sm:flex items-center gap-2"
              >
                {t(lang, { uz: '👤 Kirish', ru: '👤 Войти' })}
              </Link>
            )}

            {/* Mobil: hamburger (faqat katta ekranlarda yo'q) */}
            <button
              className="rounded-2xl border-2 border-gray-200 p-2.5 text-gray-600 transition-all hover:bg-gray-100 sm:hidden"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menyu ochish"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobil kengaytirilgan menyu (hamburger ochilganda) */}
        {menuOpen && (
          <div className="animate-slide-down border-t border-gray-100 bg-white/98 px-4 pb-5 pt-4 sm:hidden">
            {user && (
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-50 to-sky-50 border-2 border-primary-100 px-4 py-3.5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-black text-white shadow">
                  {(user.name ?? user.phone ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <div className="text-base font-bold text-primary-900">{user.name ?? user.phone ?? 'Foydalanuvchi'}</div>
                  <div className="text-sm text-primary-600">
                    {t(lang, { uz: "Profilni ko'rish →", ru: 'Открыть профиль →' })}
                  </div>
                </div>
              </Link>
            )}

            <div className="mb-3 flex flex-col gap-1">
              {[
                { href: '/',                            label: { uz: '🏠 Bosh sahifa',     ru: '🏠 Главная' } },
                { href: '/search',                      label: { uz: '🔍 Qidirish',         ru: '🔍 Поиск' } },
                { href: '/search?type=COURSE_CENTER',   label: { uz: "✏️ O'quv markazlar",  ru: '✏️ Учебные центры' } },
                { href: '/search?type=SCHOOL',          label: { uz: '📚 Maktablar',         ru: '📚 Школы' } },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl px-4 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                >
                  {t(lang, link.label)}
                </Link>
              ))}
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MODERATOR') && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3.5 text-base font-bold text-red-600"
                >
                  🛡️ Admin panel
                </Link>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setLang(lang === 'uz' ? 'ru' : 'uz'); setMenuOpen(false) }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 py-3.5 text-base font-bold text-gray-600"
              >
                {lang === 'uz' ? '🇷🇺 Русский' : "🇺🇿 O'zbek"}
              </button>
              {user ? (
                <button
                  onClick={() => { setMenuOpen(false); logout() }}
                  className="flex flex-1 items-center justify-center rounded-2xl border-2 border-red-200 py-3.5 text-base font-semibold text-red-500 hover:bg-red-50"
                >
                  {t(lang, { uz: '🚪 Chiqish', ru: '🚪 Выйти' })}
                </button>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex flex-1 items-center justify-center rounded-2xl bg-primary-600 py-3.5 text-base font-bold text-white hover:bg-primary-700"
                >
                  {t(lang, { uz: '👤 Kirish', ru: '👤 Войти' })}
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobil pastki tab navigatsiyasi ────────────────────── */}
      {/* Har doim ko'rinadi — buvi ham topadi */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 pb-safe backdrop-blur-sm sm:hidden">
        <div className="flex">
          {/* Bosh sahifa */}
          <Link
            href="/"
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 transition-colors active:opacity-70 ${
              pathname === '/' ? 'text-primary-600' : 'text-gray-400'
            }`}
          >
            <svg className="h-[26px] w-[26px]" fill={pathname === '/' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <span className={`text-[12px] font-semibold leading-tight ${pathname === '/' ? 'text-primary-600' : 'text-gray-400'}`}>
              {t(lang, { uz: 'Asosiy', ru: 'Главная' })}
            </span>
          </Link>

          {/* Qidirish */}
          <Link
            href="/search"
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 transition-colors active:opacity-70 ${
              pathname === '/search' ? 'text-primary-600' : 'text-gray-400'
            }`}
          >
            <svg className="h-[26px] w-[26px]" fill={pathname === '/search' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <span className={`text-[12px] font-semibold leading-tight ${pathname === '/search' ? 'text-primary-600' : 'text-gray-400'}`}>
              {t(lang, { uz: 'Qidirish', ru: 'Поиск' })}
            </span>
          </Link>

          {/* Compare */}
          <Link
            href="/compare"
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 transition-colors active:opacity-70 ${
              pathname === '/compare' ? 'text-primary-600' : 'text-gray-400'
            }`}
          >
            <svg className="h-[26px] w-[26px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
            </svg>
            <span className={`text-[12px] font-semibold leading-tight ${pathname === '/compare' ? 'text-primary-600' : 'text-gray-400'}`}>
              {t(lang, { uz: 'Solishtir', ru: 'Сравнить' })}
            </span>
          </Link>

          {/* Profil / Kirish */}
          {user ? (
            <Link
              href="/profile"
              className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 transition-colors active:opacity-70 ${
                pathname === '/profile' ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-xs font-black text-white shadow-sm ${
                pathname === '/profile' ? 'bg-primary-600' : 'bg-gray-400'
              }`}>
                {(user.name ?? user.phone ?? '?').slice(0, 1).toUpperCase()}
              </span>
              <span className={`text-[12px] font-semibold leading-tight ${pathname === '/profile' ? 'text-primary-600' : 'text-gray-400'}`}>
                {t(lang, { uz: 'Profil', ru: 'Профиль' })}
              </span>
            </Link>
          ) : (
            <Link
              href="/auth"
              className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-primary-600 active:opacity-70"
            >
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-primary-600 text-sm font-black text-white">
                +
              </span>
              <span className="text-[12px] font-semibold leading-tight text-primary-600">
                {t(lang, { uz: 'Kirish', ru: 'Войти' })}
              </span>
            </Link>
          )}
        </div>
      </nav>

      {/* Mobil pastki nav uchun joy — content pastda yashirib qolmasin */}
      <div className="h-[72px] sm:hidden" aria-hidden />
    </>
  )
}
