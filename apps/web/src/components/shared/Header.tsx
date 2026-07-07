'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Search, PencilLine, BookOpen, Target, ShieldCheck, Menu, X, Home,
  ArrowLeftRight, LogOut, User,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLang, t } from '@/contexts/LangContext'
import Logo from './Logo'

/**
 * Asosiy navigatsiya sarlavhasi.
 *
 * Desktop: yuqori qator bilan
 * Mobil:   yuqorida logo + til, pastda 4-tugmali tab bar
 *          (buvilar ham bemalol ishlatsin deb)
 */

export default function Header() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, loading, logout } = useAuth()
  const { lang, setLang } = useLang()

  return (
    <>
      {/* ── Yuqori header ─────────────────────────────────────── */}
      {/* pt-safe: Telegram Mini App'da status-bar/notch orqasiga yashirinmasin */}
      <header className="sticky top-0 z-50 border-b border-gray-100 glass shadow-sm pt-safe">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">

          {/* Logo */}
          <Link href="/" className="flex items-center group transition-opacity hover:opacity-80">
            <Logo size={44} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-nowrap items-center gap-1 lg:flex">
            <Link
              href="/search"
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                pathname === '/search'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t(lang, { uz: 'Qidirish', ru: 'Найти' })}
            </Link>
            <Link
              href="/search?type=COURSE_CENTER"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <PencilLine className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t(lang, { uz: "O'quv markazlar", ru: 'Учебные центры' })}
            </Link>
            <Link
              href="/search?type=SCHOOL"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <BookOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t(lang, { uz: 'Maktablar', ru: 'Школы' })}
            </Link>
            <Link
              href="/match"
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                pathname === '/match'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
            >
              <Target className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t(lang, { uz: 'Mos tanlash', ru: 'Подбор' })}
            </Link>
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MODERATOR') && (
              <Link
                href="/admin"
                className="ml-1 flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Admin
              </Link>
            )}
          </nav>

          {/* O'ng: til + kirish/profil */}
          <div className="flex items-center gap-2">
            {/* Til almashtirish */}
            <button
              onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-600"
              title={lang === 'uz' ? 'Переключить на русский' : "O'zbekchaga o'tish"}
            >
              <span className="text-lg leading-none">{lang === 'uz' ? '🇷🇺' : '🇺🇿'}</span>
            </button>

            {/* Auth — desktop */}
            {loading ? (
              <div className="hidden h-10 w-28 animate-pulse rounded-xl bg-gray-100 lg:flex" />
            ) : user ? (
              <div className="hidden items-center gap-2 lg:flex">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-700"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
                    {(user.name ?? user.phone ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-[100px] truncate">{user.name ?? user.phone ?? 'Profil'}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  {t(lang, { uz: 'Chiqish', ru: 'Выйти' })}
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="hidden rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 lg:flex items-center gap-2"
              >
                <User className="h-4 w-4" strokeWidth={1.75} /> {t(lang, { uz: 'Kirish', ru: 'Войти' })}
              </Link>
            )}

            {/* Mobil: hamburger (faqat katta ekranlarda yo'q) */}
            <button
              className="rounded-xl border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100 lg:hidden"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menyu ochish"
            >
              {menuOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {/* Mobil kengaytirilgan menyu (hamburger ochilganda) */}
        {menuOpen && (
          <div className="animate-slide-down border-t border-gray-100 bg-white/98 px-4 pb-5 pt-4 lg:hidden">
            {user && (
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="mb-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-base font-semibold text-white">
                  {(user.name ?? user.phone ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <div className="text-base font-semibold text-gray-900">{user.name ?? user.phone ?? 'Foydalanuvchi'}</div>
                  <div className="text-sm text-primary-600">
                    {t(lang, { uz: "Profilni ko'rish →", ru: 'Открыть профиль →' })}
                  </div>
                </div>
              </Link>
            )}

            <div className="mb-3 flex flex-col gap-1">
              {[
                { href: '/',                            Icon: Home,           label: { uz: 'Bosh sahifa',    ru: 'Главная' } },
                { href: '/search',                      Icon: Search,         label: { uz: 'Qidirish',       ru: 'Поиск' } },
                { href: '/search?type=COURSE_CENTER',   Icon: PencilLine,     label: { uz: "O'quv markazlar", ru: 'Учебные центры' } },
                { href: '/search?type=SCHOOL',          Icon: BookOpen,       label: { uz: 'Maktablar',      ru: 'Школы' } },
                { href: '/match',                       Icon: Target,         label: { uz: 'Menga mosini top', ru: 'Подобрать для меня' } },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                >
                  <link.Icon className="h-[18px] w-[18px] text-gray-400" strokeWidth={1.75} />
                  {t(lang, link.label)}
                </Link>
              ))}
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MODERATOR') && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-600"
                >
                  <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} /> Admin panel
                </Link>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setLang(lang === 'uz' ? 'ru' : 'uz'); setMenuOpen(false) }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600"
              >
                {lang === 'uz' ? '🇷🇺 Русский' : "🇺🇿 O'zbek"}
              </button>
              {user ? (
                <button
                  onClick={() => { setMenuOpen(false); logout() }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-500 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  {t(lang, { uz: 'Chiqish', ru: 'Выйти' })}
                </button>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  <User className="h-4 w-4" strokeWidth={1.75} />
                  {t(lang, { uz: 'Kirish', ru: 'Войти' })}
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobil pastki tab navigatsiyasi ────────────────────── */}
      {/* Har doim ko'rinadi — buvi ham topadi */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 pb-safe backdrop-blur-sm lg:hidden">
        <div className="flex">
          {/* Bosh sahifa */}
          <Link
            href="/"
            className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 transition-colors active:opacity-70 ${
              pathname === '/' ? 'text-primary-600' : 'text-gray-400'
            }`}
          >
            <Home className="h-[22px] w-[22px]" strokeWidth={1.9} />
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
            <Search className="h-[22px] w-[22px]" strokeWidth={1.9} />
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
            <ArrowLeftRight className="h-[22px] w-[22px]" strokeWidth={1.9} />
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
      <div className="h-[72px] lg:hidden" aria-hidden />
    </>
  )
}
