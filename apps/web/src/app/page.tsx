'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/shared/Header'
import StarRating from '@/components/shared/StarRating'
import { useLang, t } from '@/contexts/LangContext'
import { useCompare, useSaved } from '@/hooks/useCompare'

interface InstCard {
  id: string
  nameUz: string
  nameRu?: string
  slug: string
  type: string
  avgRating?: number
  reviewCount: number
  isVerified: boolean
  city?: { nameUz: string; nameRu?: string }
  pricing?: { monthlyMin?: number }
  details?: {
    studentCount?: number | null
    teacherCount?: number
    programs?: string[]
  }
  subscription?: { plan: string }
}

interface Meta { total: number; page: number; limit: number; totalPages: number }

const TYPE_LABELS: Record<string, { uz: string; ru: string; icon: string }> = {
  COURSE_CENTER:   { uz: "O'quv markaz",  ru: 'Учебный центр', icon: '✏️' },
  SCHOOL:          { uz: 'Maktab',        ru: 'Школа',          icon: '📚' },
  IT_SCHOOL:       { uz: 'IT maktab',     ru: 'IT школа',       icon: '💻' },
  LANGUAGE_CENTER: { uz: 'Til markazi',   ru: 'Языковой',       icon: '🌐' },
  UNIVERSITY:      { uz: 'Universitet',   ru: 'Университет',    icon: '🎓' },
  KINDERGARTEN:    { uz: "Bog'cha",       ru: 'Детсад',         icon: '🎨' },
  LYCEUM:          { uz: 'Litsey',        ru: 'Лицей',          icon: '🏆' },
  SPORTS_SCHOOL:   { uz: 'Sport',         ru: 'Спорт',          icon: '⚽' },
  ARTS_SCHOOL:     { uz: "San'at",        ru: 'Искусство',      icon: '🎭' },
}

const CARD_GRADIENTS: Record<string, string> = {
  COURSE_CENTER:   'from-blue-500 to-sky-400',
  SCHOOL:          'from-green-500 to-emerald-400',
  IT_SCHOOL:       'from-violet-600 to-purple-500',
  LANGUAGE_CENTER: 'from-cyan-500 to-teal-400',
  UNIVERSITY:      'from-amber-500 to-orange-400',
  KINDERGARTEN:    'from-pink-500 to-rose-400',
  LYCEUM:          'from-teal-600 to-emerald-500',
  SPORTS_SCHOOL:   'from-green-600 to-lime-500',
  ARTS_SCHOOL:     'from-fuchsia-500 to-pink-400',
}

const TYPE_FILTERS = [
  { type: '',               icon: '🏫', uz: 'Barchasi',         ru: 'Все' },
  { type: 'COURSE_CENTER',  icon: '✏️', uz: "O'quv markazlar", ru: 'Учебные центры' },
  { type: 'IT_SCHOOL',      icon: '💻', uz: 'IT maktablar',    ru: 'IT школы' },
  { type: 'SCHOOL',         icon: '📚', uz: 'Maktablar',       ru: 'Школы' },
  { type: 'LANGUAGE_CENTER',icon: '🌐', uz: 'Til markazlari',  ru: 'Языковые' },
  { type: 'UNIVERSITY',     icon: '🎓', uz: 'Universitetlar',  ru: 'Университеты' },
]

const SORT_OPTIONS = [
  { value: 'rating',     uz: "⭐ Reyting bo'yicha", ru: '⭐ По рейтингу' },
  { value: 'newest',     uz: '🆕 Yangilar',          ru: '🆕 Новые' },
  { value: 'price_asc',  uz: '💰 Arzon avval',       ru: '💰 Сначала дешевле' },
  { value: 'price_desc', uz: '💎 Qimmat avval',       ru: '💎 Сначала дороже' },
]

function fmtNum(n: number) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }
function fmtUzs(n: number) { return `${fmtNum(n)} so'm` }

export default function HomePage() {
  const { lang } = useLang()
  const uz = lang === 'uz'

  const [institutions, setInstitutions] = useState<InstCard[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 12, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeType, setActiveType] = useState('')
  const [sortBy, setSortBy] = useState('rating')
  const [currentPage, setCurrentPage] = useState(1)

  const { toggle: toggleCompare, isSelected: isCompared } = useCompare()
  const { toggleSave, isSaved } = useSaved()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

  function handleQueryChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val)
      setCurrentPage(1)
    }, 400)
  }

  const fetchInstitutions = useCallback(async (pg: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const p = new URLSearchParams()
      if (debouncedQuery.trim()) p.set('q', debouncedQuery.trim())
      if (activeType) p.set('type', activeType)
      p.set('sortBy', sortBy)
      p.set('page', String(pg))
      p.set('limit', '12')
      const res = await fetch(`${API}/institutions?${p.toString()}`, {
        headers: { 'ngrok-skip-browser-warning': '1' },
      })
      const data = await res.json()
      const list: InstCard[] = data.data ?? []
      const m: Meta = data.meta ?? { total: 0, page: pg, limit: 12, totalPages: 1 }
      if (append) setInstitutions(prev => [...prev, ...list])
      else setInstitutions(list)
      setMeta(m)
    } catch { /* network error — silently fail */ }
    finally { setLoading(false); setLoadingMore(false) }
  }, [API, debouncedQuery, activeType, sortBy])

  useEffect(() => {
    setCurrentPage(1)
    fetchInstitutions(1, false)
  }, [debouncedQuery, activeType, sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    const next = currentPage + 1
    setCurrentPage(next)
    fetchInstitutions(next, true)
  }

  const remaining = meta.total - institutions.length

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      {/* ── Qidiruv banner (compact) ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-700 to-sky-500 px-4 py-6 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <h1 className="mb-4 text-center text-xl font-black text-white sm:text-2xl">
            {uz ? "🏫 Barcha ta'lim muassasalari" : "🏫 Все учебные заведения"}
          </h1>
          {/* Qidiruv qutisi */}
          <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-white/20">
            <div className="flex flex-1 items-center gap-2 px-3">
              <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder={uz ? "Muassasa nomi, fan yoki shahar..." : "Название, предмет или город..."}
                className="flex-1 bg-transparent py-2 text-base text-gray-900 outline-none placeholder:text-gray-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setDebouncedQuery(''); setCurrentPage(1) }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* EduFit wizard CTA */}
          <div className="mt-3 flex justify-center">
            <Link
              href="/match"
              className="group inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur-sm transition-all hover:bg-white hover:text-primary-700"
            >
              <span className="text-base">🎯</span>
              {uz ? 'Qaysi biri menga mos? — 1 daqiqada aniqlang' : 'Что мне подходит? — узнайте за 1 минуту'}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Kategoriya tablar (sticky) ── */}
      <div className="sticky top-[65px] z-30 border-b border-gray-200 bg-white/97 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-1 overflow-x-auto py-2.5" style={{ scrollbarWidth: 'none' }}>
            {TYPE_FILTERS.map(f => (
              <button
                key={f.type}
                onClick={() => { setActiveType(f.type); setCurrentPage(1) }}
                className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                  activeType === f.type
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{f.icon}</span>
                <span>{uz ? f.uz : f.ru}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Asosiy kontent ── */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">

        {/* Sort + natijalar soni */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-base font-black text-gray-800">
                {meta.total} {uz ? "ta muassasa" : "учреждений"}
              </span>
            )}
            {debouncedQuery && (
              <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                &ldquo;{debouncedQuery}&rdquo;
              </span>
            )}
          </div>
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setCurrentPage(1) }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm outline-none focus:border-primary-400"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{uz ? o.uz : o.ru}</option>
            ))}
          </select>
        </div>

        {/* Skeleton loader */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="shimmer h-20" />
                <div className="space-y-3 p-4">
                  <div className="shimmer h-4 w-24 rounded-full" />
                  <div className="shimmer h-5 w-4/5 rounded-xl" />
                  <div className="shimmer h-4 w-1/2 rounded-xl" />
                  <div className="shimmer h-4 w-2/3 rounded-xl" />
                </div>
              </div>
            ))}
          </div>

        /* Bo'sh holat */
        ) : institutions.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-100 text-5xl">🔍</div>
            <p className="mb-2 text-xl font-bold text-gray-800">
              {uz ? "Hech narsa topilmadi" : "Ничего не найдено"}
            </p>
            <p className="mb-6 text-sm text-gray-500">
              {uz ? "Boshqa so'z kiriting yoki filterni o'zgartiring" : "Попробуйте другое слово или измените фильтр"}
            </p>
            <button
              onClick={() => { setQuery(''); setDebouncedQuery(''); setActiveType(''); setCurrentPage(1) }}
              className="btn-secondary text-sm"
            >
              {uz ? "Barcha muassasalar" : "Все учреждения"}
            </button>
          </div>

        /* Kartochkalar grid */
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {institutions.map(inst => {
                const info     = TYPE_LABELS[inst.type]
                const name     = uz || !inst.nameRu ? inst.nameUz : inst.nameRu
                const city     = inst.city ? (uz || !inst.city.nameRu ? inst.city.nameUz : inst.city.nameRu) : null
                const gradient = CARD_GRADIENTS[inst.type] ?? 'from-primary-500 to-sky-400'
                const saved    = isSaved(inst.id)
                const compared = isCompared(inst.id)

                return (
                  <div key={inst.id} className="group card flex flex-col overflow-hidden p-0">
                    {/* Gradient sarlavha */}
                    <Link href={`/institutions/${inst.slug}`} className={`relative flex h-20 items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}>
                      <div
                        className="pointer-events-none absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '14px 14px' }}
                      />
                      <span className="relative z-10 text-4xl">{info?.icon ?? '🏫'}</span>
                      {inst.isVerified && (
                        <span className="absolute right-2.5 top-2.5 z-10 flex items-center gap-0.5 rounded-full border border-white/30 bg-white/25 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                          ✓ {uz ? 'Tasdiqlangan' : 'Подтв.'}
                        </span>
                      )}
                      {inst.subscription?.plan === 'PREMIUM' && (
                        <span className="absolute left-2.5 top-2.5 z-10 flex items-center gap-0.5 rounded-full border border-amber-300/30 bg-amber-400/25 px-2 py-0.5 text-[11px] font-bold text-amber-100 backdrop-blur-sm">
                          ⭐ Premium
                        </span>
                      )}
                    </Link>

                    {/* Karta tanasi */}
                    <div className="flex flex-1 flex-col p-4">
                      {/* Tur tegi */}
                      <span className="badge-sm mb-2 self-start bg-primary-50 text-primary-700">
                        {info ? (uz ? info.uz : info.ru) : inst.type}
                      </span>

                      {/* Nom */}
                      <Link href={`/institutions/${inst.slug}`}>
                        <h3 className="mb-1.5 text-base font-black text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug">
                          {name}
                        </h3>
                      </Link>

                      {/* Yo'nalishlar preview */}
                      {(inst.details?.programs?.length ?? 0) > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {inst.details!.programs!.slice(0, 2).map(p => (
                            <span key={p} className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {p}
                            </span>
                          ))}
                          {(inst.details!.programs!.length ?? 0) > 2 && (
                            <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                              +{inst.details!.programs!.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Shahar + statistika */}
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {city && (
                          <span className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            {city}
                          </span>
                        )}
                        {inst.details?.studentCount && (
                          <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            👥 {fmtNum(inst.details.studentCount)}+
                          </span>
                        )}
                        {inst.details?.teacherCount && (
                          <span className="flex items-center gap-1 text-violet-600 font-semibold">
                            👨‍🏫 {inst.details.teacherCount}
                          </span>
                        )}
                      </div>

                      {/* Reyting + narx */}
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                        {inst.avgRating ? (
                          <div className="flex items-center gap-1.5">
                            <StarRating rating={inst.avgRating} size="sm" />
                            <span className="text-sm font-black text-gray-900">{inst.avgRating.toFixed(1)}</span>
                            <span className="text-xs text-gray-400">({inst.reviewCount})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{uz ? "Sharh yo'q" : "Нет отзывов"}</span>
                        )}
                        {inst.pricing?.monthlyMin && (
                          <span className="price-badge text-xs">
                            {fmtUzs(inst.pricing.monthlyMin)}
                          </span>
                        )}
                      </div>

                      {/* Saqlash / Solishtirish tugmalari */}
                      <div className="mt-2 flex gap-1.5 border-t border-gray-50 pt-2">
                        <button
                          onClick={() => toggleSave(inst)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-semibold transition-all ${
                            saved
                              ? 'bg-primary-50 text-primary-700'
                              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {saved ? '🔖' : '🔖'} {uz ? (saved ? "Saqlandi" : "Saqlash") : (saved ? "Сохранено" : "Сохранить")}
                        </button>
                        <button
                          onClick={() => toggleCompare(inst)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-semibold transition-all ${
                            compared
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          ⇄ {uz ? (compared ? "Tanlandi" : "Solishtir") : (compared ? "Выбрано" : "Сравнить")}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Ko'proq yuklash */}
            {currentPage < meta.totalPages && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-secondary px-8 py-3 text-base disabled:opacity-60"
                >
                  {loadingMore
                    ? (uz ? 'Yuklanmoqda…' : 'Загрузка…')
                    : (uz
                        ? `Ko'proq ko'rish${remaining > 0 ? ` (yana ${remaining} ta)` : ''}`
                        : `Показать ещё${remaining > 0 ? ` (ещё ${remaining})` : ''}`)}
                </button>
              </div>
            )}

            {/* Ko'proq yuklash skeleton */}
            {loadingMore && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                    <div className="shimmer h-20" />
                    <div className="space-y-3 p-4">
                      <div className="shimmer h-4 w-24 rounded-full" />
                      <div className="shimmer h-5 w-3/4 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-gray-900 px-4 py-8 text-sm text-gray-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>© 2025 EDUBAHO.uz — {uz ? "O'zbekiston ta'lim platformasi" : "Платформа образования Узбекистана"}</span>
          <div className="flex gap-4">
            <Link href="/compare" className="transition-colors hover:text-white">{uz ? "Solishtirish" : "Сравнение"}</Link>
            <Link href="/auth"    className="transition-colors hover:text-white">{uz ? "Kirish" : "Войти"}</Link>
            <Link href="/terms"   className="transition-colors hover:text-white">{uz ? "Shartlar" : "Условия"}</Link>
            <a href="https://t.me/TrustboxInc" target="_blank" rel="noopener noreferrer"
              className="font-bold text-[#7DD3F8] transition-colors hover:text-white">
              @TrustboxInc
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
