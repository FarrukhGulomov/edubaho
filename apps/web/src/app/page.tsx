'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, PencilLine, BookOpen, Trophy, School, BadgeCheck, Sparkles,
  MapPin, Users2, UserCheck, Star, ArrowLeftRight, Target,
} from 'lucide-react'
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

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  COURSE_CENTER:   { uz: "O'quv markaz",  ru: 'Учебный центр' },
  SCHOOL:          { uz: 'Maktab',        ru: 'Школа' },
  IT_SCHOOL:       { uz: 'IT maktab',     ru: 'IT школа' },
  LANGUAGE_CENTER: { uz: 'Til markazi',   ru: 'Языковой' },
  UNIVERSITY:      { uz: 'Universitet',   ru: 'Университет' },
  KINDERGARTEN:    { uz: "Bog'cha",       ru: 'Детсад' },
  LYCEUM:          { uz: 'Litsey',        ru: 'Лицей' },
  SPORTS_SCHOOL:   { uz: 'Sport',         ru: 'Спорт' },
  ARTS_SCHOOL:     { uz: "San'at",        ru: 'Искусство' },
}

// Faqat haqiqiy ma'lumoti bor turlar ko'rsatiladi — bo'sh natija bilan
// tugaydigan "o'lik" filtrlarni chiqarmaslik uchun (IT maktab/Universitet/
// Til markazi kabi turlarda hozircha muassasa yo'q)
const TYPE_FILTERS = [
  { type: '',              Icon: School,     uz: 'Barchasi',        ru: 'Все' },
  { type: 'COURSE_CENTER', Icon: PencilLine, uz: "O'quv markazlar", ru: 'Учебные центры' },
  { type: 'SCHOOL',        Icon: BookOpen,   uz: 'Maktablar',       ru: 'Школы' },
  { type: 'LYCEUM',        Icon: Trophy,     uz: 'Litseylar',       ru: 'Лицеи' },
]

const SORT_OPTIONS = [
  { value: 'rating',     uz: "Reyting bo'yicha", ru: 'По рейтингу' },
  { value: 'newest',     uz: 'Yangilar',          ru: 'Новые' },
  { value: 'price_asc',  uz: 'Arzon avval',       ru: 'Сначала дешевле' },
  { value: 'price_desc', uz: 'Qimmat avval',       ru: 'Сначала дороже' },
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

      {/* ── Bosh banner ── */}
      <div className="border-b border-gray-200 bg-white px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-center text-xl font-bold text-gray-900 sm:text-2xl">
            {uz ? "Barcha ta'lim muassasalari" : "Все учебные заведения"}
          </h1>

          {/* EduFit — platformaning asosiy fichasi, birinchi bo'lib ko'zga tashlanishi kerak.
              Oq fonda — reklama banneriga o'xshamasligi uchun; ustunlik katta o'lcham,
              rangli chegara va aniq CTA tugma orqali beriladi (rangli fon emas). */}
          <Link
            href="/match"
            className="group mb-4 flex items-center gap-3 rounded-2xl border-2 border-primary-100 bg-white px-4 py-4 text-left shadow-sm transition-colors hover:border-primary-300 sm:gap-4 sm:px-6 sm:py-5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 sm:h-12 sm:w-12">
              <Target className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-gray-900 sm:text-lg">
                {uz ? 'Qaysi muassasa senga mos? — 1 daqiqada bilib ol' : 'Какое учреждение вам подходит? — узнайте за 1 минуту'}
              </span>
              <span className="hidden text-sm text-gray-500 sm:block">
                {uz ? "Shaxsiy so'rovnoma orqali eng mos variantlarni toping" : 'Персональный подбор по вашим критериям и бюджету'}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-bold text-white transition-colors group-hover:bg-primary-700 sm:px-4">
              {uz ? 'Boshlash' : 'Начать'}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </Link>

          {/* Qidiruv qutisi — ikkilamchi, o'zi nima izlashini biladiganlar uchun */}
          <p className="mb-2 text-center text-xs font-medium text-gray-400">
            {uz ? "yoki o'zingiz qidiring" : 'или найдите самостоятельно'}
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
              <Search className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={1.75} />
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder={uz ? "Muassasa nomi, fan yoki shahar..." : "Название, предмет или город..."}
                className="min-w-0 flex-1 bg-transparent py-2 text-base text-gray-900 outline-none placeholder:text-gray-400"
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
        </div>
      </div>

      {/* ── Kategoriya tablar (sticky, bitta qatorda, bir xil shakl) ── */}
      <div className="sticky top-[65px] z-30 border-b border-gray-200 bg-white/97 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto py-2.5" style={{ scrollbarWidth: 'none' }}>
            {TYPE_FILTERS.map(f => (
              <button
                key={f.type}
                onClick={() => { setActiveType(f.type); setCurrentPage(1) }}
                className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                  activeType === f.type
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <f.Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
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

        {/* Skeleton loader — haqiqiy karta tuzilishiga mos (badge, nom, statistika) */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="space-y-3">
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
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Search className="h-7 w-7 text-gray-300" strokeWidth={1.5} />
            </div>
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
                const saved    = isSaved(inst.id)
                const compared = isCompared(inst.id)

                return (
                  <div key={inst.id} className="group card flex flex-col p-0">
                    {/* Karta tanasi */}
                    <Link href={`/institutions/${inst.slug}`} className="flex flex-1 flex-col p-4 pb-0">
                      {/* Tur + status teglar */}
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <span className="badge-sm bg-primary-50 text-primary-700">
                          {info ? (uz ? info.uz : info.ru) : inst.type}
                        </span>
                        {inst.isVerified && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <BadgeCheck className="h-3 w-3" strokeWidth={2} /> {uz ? 'Tasdiqlangan' : 'Подтв.'}
                          </span>
                        )}
                        {inst.subscription?.plan === 'PREMIUM' && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            <Sparkles className="h-3 w-3" strokeWidth={2} /> Premium
                          </span>
                        )}
                      </div>

                      {/* Nom */}
                      <h3 className="mb-1.5 text-base font-black text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug">
                        {name}
                      </h3>

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
                          <span className="flex items-center gap-1 text-primary-600 font-semibold">
                            <Users2 className="h-3.5 w-3.5" strokeWidth={2} /> {fmtNum(inst.details.studentCount)}+
                          </span>
                        )}
                        {inst.details?.teacherCount && (
                          <span className="flex items-center gap-1 text-gray-500 font-semibold">
                            <UserCheck className="h-3.5 w-3.5" strokeWidth={2} /> {inst.details.teacherCount}
                          </span>
                        )}
                      </div>

                      {/* Reyting + narx */}
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                        {inst.avgRating ? (
                          <div className="flex items-center gap-1.5">
                            <StarRating rating={inst.avgRating} size="sm" />
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
                    </Link>

                    {/* Saqlash / Solishtirish tugmalari */}
                    <div className="flex gap-1.5 border-t border-gray-50 p-4 pt-2">
                      <button
                        onClick={() => toggleSave(inst)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                          saved
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <Star className="h-3.5 w-3.5" fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
                        {uz ? (saved ? "Saqlandi" : "Saqlash") : (saved ? "Сохранено" : "Сохранить")}
                      </button>
                      <button
                        onClick={() => toggleCompare(inst)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                          compared
                            ? 'bg-primary-50 text-primary-700'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={2} />
                        {uz ? (compared ? "Tanlandi" : "Solishtir") : (compared ? "Выбрано" : "Сравнить")}
                      </button>
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
                  <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="space-y-3">
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
          <span>© {new Date().getFullYear()} EDUBAHO.uz — {uz ? "O'zbekiston ta'lim platformasi" : "Платформа образования Узбекистана"}</span>
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
