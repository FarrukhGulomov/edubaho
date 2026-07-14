'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Search,
  PencilLine,
  BookOpen,
  ShieldCheck,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Home,
  Scale,
  LogIn,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLang, t } from '@/contexts/LangContext'
import { useTheme } from '@/contexts/ThemeContext'
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
  const { theme, toggleTheme } = useTheme()

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MODERATOR'

  const navLinks = [
    { href: '/search',                    icon: Search,     label: { uz: 'Qidirish',        ru: 'Найти' } },
    { href: '/search?type=COURSE_CENTER', icon: PencilLine, label: { uz: "O'quv markazlar", ru: 'Учебные центры' } },
    { href: '/search?type=SCHOOL',        icon: BookOpen,   label: { uz: 'Maktablar',       ru: 'Школы' } },
  ]

  return (
    <>
      {/* ── Yuqori header ─────────────────────────────────────── */}
      <header className="glass sticky top-0 z-50 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">

          {/* Logo */}
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Logo size={38} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map(link => {
              const active = pathname === '/search' && link.href === '/search'
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                      : 'text-mute hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  <link.icon className="h-4 w-4" aria-hidden />
                  {t(lang, link.label)}
                </Link>
              )
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className="ml-1 flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Admin
              </Link>
            )}
          </nav>

          {/* O'ng: mavzu + til + kirish/profil */}
          <div className="flex items-center gap-1.5">
            {/* Mavzu almashtirish */}
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-mute transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label={theme === 'dark' ? "Yorug' rejimga o'tish" : "Qorong'u rejimga o'tish"}
            >
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            {/* Til almashtirish */}
            <button
              onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}
              className="flex h-10 items-center rounded-lg px-2.5 text-sm font-semibold tracking-wide text-mute transition-colors hover:bg-surface-2 hover:text-ink"
              title={lang === 'uz' ? 'Переключить на русский' : "O'zbekchaga o'tish"}
            >
              {lang === 'uz' ? 'РУ' : 'UZ'}
            </button>

            {/* Auth — desktop */}
            {loading ? (
              <div className="hidden h-10 w-24 animate-pulse rounded-lg bg-surface-2 sm:flex" />
            ) : user ? (
              <div className="hidden items-center gap-1.5 sm:flex">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1.5 pl-1.5 pr-3 text-sm font-medium text-ink transition-colors hover:border-line-2 hover:bg-surface-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-600 text-xs font-bold text-white">
                    {(user.name ?? user.phone ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-[100px] truncate">{user.name ?? user.phone ?? 'Profil'}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-faint transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  aria-label={t(lang, { uz: 'Chiqish', ru: 'Выйти' })}
                  title={t(lang, { uz: 'Chiqish', ru: 'Выйти' })}
                >
                  <LogOut className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="hidden h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 sm:flex"
              >
                {t(lang, { uz: 'Kirish', ru: 'Войти' })}
              </Link>
            )}

            {/* Mobil: hamburger */}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg text-mute transition-colors hover:bg-surface-2 sm:hidden"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menyu ochish"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>

        {/* Mobil kengaytirilgan menyu (hamburger ochilganda) */}
        {menuOpen && (
          <div className="animate-slide-down border-t border-line bg-surface px-4 pb-5 pt-4 sm:hidden">
            {user && (
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-base font-bold text-white">
                  {(user.name ?? user.phone ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">{user.name ?? user.phone ?? 'Foydalanuvchi'}</div>
                  <div className="text-xs text-mute">
                    {t(lang, { uz: "Profilni ko'rish →", ru: 'Открыть профиль →' })}
                  </div>
                </div>
              </Link>
            )}

            <div className="mb-3 flex flex-col gap-0.5">
              {[
                { href: '/',                            icon: Home,       label: { uz: 'Bosh sahifa',      ru: 'Главная' } },
                { href: '/search',                      icon: Search,     label: { uz: 'Qidirish',          ru: 'Поиск' } },
                { href: '/search?type=COURSE_CENTER',   icon: PencilLine, label: { uz: "O'quv markazlar",  ru: 'Учебные центры' } },
                { href: '/search?type=SCHOOL',          icon: BookOpen,   label: { uz: 'Maktablar',         ru: 'Школы' } },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-ink transition-colors hover:bg-surface-2 active:bg-surface-2"
                >
                  <link.icon className="h-5 w-5 text-faint" aria-hidden />
                  {t(lang, link.label)}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                  Admin panel
                </Link>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setLang(lang === 'uz' ? 'ru' : 'uz'); setMenuOpen(false) }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line-2 py-3 text-sm font-semibold text-mute transition-colors hover:bg-surface-2"
              >
                {lang === 'uz' ? 'Русский' : "O'zbek"}
              </button>
              {user ? (
                <button
                  onClick={() => { setMenuOpen(false); logout() }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  {t(lang, { uz: 'Chiqish', ru: 'Выйти' })}
                </button>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  <LogIn className="h-4 w-4" aria-hidden />
                  {t(lang, { uz: 'Kirish', ru: 'Войти' })}
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobil pastki tab navigatsiyasi ────────────────────── */}
      {/* Har doim ko'rinadi — buvi ham topadi */}
      <nav className="glass fixed bottom-0 left-0 right-0 z-50 border-t border-line pb-safe sm:hidden">
        <div className="flex">
          {[
            { href: '/',        icon: Home,   label: { uz: 'Asosiy',    ru: 'Главная' } },
            { href: '/search',  icon: Search, label: { uz: 'Qidirish',  ru: 'Поиск' } },
            { href: '/compare', icon: Scale,  label: { uz: 'Solishtir', ru: 'Сравнить' } },
          ].map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-1 px-1 py-2.5 transition-colors active:opacity-70 ${
                  active ? 'text-primary-600 dark:text-primary-400' : 'text-faint'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <tab.icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} aria-hidden />
                <span className="text-[11px] font-semibold leading-tight">{t(lang, tab.label)}</span>
              </Link>
            )
          })}

          {/* Profil / Kirish */}
          {user ? (
            <Link
              href="/profile"
              className={`flex flex-1 flex-col items-center gap-1 px-1 py-2.5 transition-colors active:opacity-70 ${
                pathname === '/profile' ? 'text-primary-600 dark:text-primary-400' : 'text-faint'
              }`}
              aria-current={pathname === '/profile' ? 'page' : undefined}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                pathname === '/profile' ? 'bg-primary-600' : 'bg-faint'
              }`}>
                {(user.name ?? user.phone ?? '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="text-[11px] font-semibold leading-tight">
                {t(lang, { uz: 'Profil', ru: 'Профиль' })}
              </span>
            </Link>
          ) : (
            <Link
              href="/auth"
              className="flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-primary-600 active:opacity-70 dark:text-primary-400"
            >
              <LogIn className="h-6 w-6" aria-hidden />
              <span className="text-[11px] font-semibold leading-tight">
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
