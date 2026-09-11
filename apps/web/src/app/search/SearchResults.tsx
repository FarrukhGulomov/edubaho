'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  Search, X, MapPin, Globe2, Bookmark,
  ArrowLeftRight, Check, PencilLine, School, Palette, Lock, Award, ChevronDown, Crown,
  ChevronLeft, ChevronRight, WifiOff,
} from 'lucide-react'
import { haptic } from '@/lib/telegram'
import { RatingHint } from '@/components/shared/StarRating'
import VerificationBadge from '@/components/shared/VerificationBadge'
import InstitutionMetrics from '@/components/shared/InstitutionMetrics'
import { priceFrom } from '@/lib/price'
import { pluralRu } from '@/lib/plural'
import { localizeList } from '@/lib/i18nList'
import { useCompare, useSaved } from '@/hooks/useCompare'
import { useLang, t } from '@/contexts/LangContext'
import { track, trackSearch, trackSearchClick } from '@/lib/analytics'
import type { InstitutionCard } from './page'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

/**
 * Joriy sahifa atrofidagi ko'rsatiladigan sahifa raqamlari — 1-, oxirgi
 * sahifa va joriy sahifa ±1 doim ko'rinadi, orasidagi bo'shliq "..." bilan
 * belgilanadi. Ilgari sahifalash faqat birinchi 7 tani ko'rsatib, undan
 * keyingi natijalarga UI orqali umuman o'tib bo'lmas edi.
 */
function getPageWindow(current: number, total: number): (number | 'gap')[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('gap')
    result.push(p)
    prev = p
  }
  return result
}

interface Props {
  institutions: InstitutionCard[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  params: Record<string, string>
  // true — server so'rovi (fetch) muvaffaqiyatsiz tugadi, ya'ni bo'sh natija
  // haqiqiy "hech narsa topilmadi" emas, balki xatolik natijasi
  apiError?: boolean
}

interface City   { id: string; nameUz: string; nameRu: string }
interface Region { id: string; nameUz: string; nameRu: string; institutionCount: number }

const TYPE_LABELS: Record<string, { uz: string; ru: string; color: string }> = {
  SCHOOL:          { uz: 'Maktab',        ru: 'Школа',        color: 'bg-green-50 text-green-700' },
  LYCEUM:          { uz: 'Litsey',        ru: 'Лицей',        color: 'bg-teal-50 text-teal-700' },
  COURSE_CENTER:   { uz: "O'quv markaz",  ru: 'Учебный центр', color: 'bg-blue-50 text-blue-700' },
  LANGUAGE_CENTER: { uz: 'Til markazi',   ru: 'Языковой',     color: 'bg-cyan-50 text-cyan-700' },
  IT_SCHOOL:       { uz: 'IT maktab',     ru: 'IT школа',     color: 'bg-purple-50 text-purple-700' },
  UNIVERSITY:      { uz: 'Universitet',   ru: 'Университет',  color: 'bg-amber-50 text-amber-700' },
  KINDERGARTEN:    { uz: "Bog'cha",       ru: 'Детсад',       color: 'bg-pink-50 text-pink-700' },
  SPORTS_SCHOOL:   { uz: 'Sport maktabi', ru: 'Спортшкола',   color: 'bg-orange-50 text-orange-700' },
  ARTS_SCHOOL:     { uz: "San'at",        ru: 'Школа искусств', color: 'bg-rose-50 text-rose-700' },
}

// Faqat haqiqiy ma'lumoti bor turlar ko'rsatiladi — bo'sh natija bilan
// tugaydigan "o'lik" filtrlarni chiqarmaslik uchun.
// MVP doirasida faqat O'quv markaz aktiv — qolganlari disable (bosh
// sahifadagi QUICK_CATEGORIES bilan bir xil siyosat).
const TYPE_FILTERS = [
  { type: 'COURSE_CENTER', Icon: PencilLine, uz: "O'quv markazlar", ru: 'Учебные центры', disabled: false },
  { type: 'SCHOOL',        Icon: School,     uz: 'Maktablar',       ru: 'Школы',          disabled: true },
  { type: 'KINDERGARTEN',  Icon: Palette,    uz: "Bog'chalar",      ru: 'Детские сады',    disabled: true },
]

const SORT_OPTIONS = [
  { value: 'rating',     uz: "Yuqori reyting", ru: 'Высокий рейтинг' },
  { value: 'value',      uz: 'Narx-sifat',      ru: 'Цена-качество' },
  { value: 'newest',     uz: 'Yangi',           ru: 'Новые' },
  { value: 'price_asc',  uz: 'Arzon',           ru: 'Дешевле' },
  { value: 'price_desc', uz: 'Qimmat',          ru: 'Дороже' },
]

export default function SearchResults({ institutions, meta, params, apiError }: Props) {
  const router = useRouter()
  const { lang } = useLang()
  const [q, setQ] = useState(params.q ?? '')
  const [cities, setCities] = useState<City[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const { toggle, isSelected } = useCompare()
  const { toggleSave, isSaved } = useSaved()
  // Oxirgi track qilingan so'rov — ikki marta yubormaslik uchun
  const lastTrackedQuery = useRef<string | undefined>(undefined)

  // Muassasa sahifasiga kirib "Orqaga" bosilganda scroll pozitsiyasi
  // saqlanmasdi (filtr/sort URL orqali saqlansa ham) — foydalanuvchi har
  // safar ro'yxatni qayta scroll qilardi (UX audit topilmasi). Har bir
  // aniq qidiruv holati (filtr+sahifa) uchun scrollY sessionStorage'da
  // saqlanadi va shu holatga qaytilganda tiklanadi.
  const searchKey = JSON.stringify(params)
  useEffect(() => {
    const key = `edu_search_scroll:${searchKey}`
    try {
      const saved = sessionStorage.getItem(key)
      if (saved != null) {
        const y = parseInt(saved, 10)
        if (!Number.isNaN(y)) requestAnimationFrame(() => window.scrollTo(0, y))
      }
    } catch { /* sessionStorage yo'q bo'lsa jim o'tkaziladi */ }

    let raf = 0
    function onScroll() {
      if (raf) return
      raf = requestAnimationFrame(() => {
        try { sessionStorage.setItem(key, String(window.scrollY)) } catch { /* ignore */ }
        raf = 0
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [searchKey])

  useEffect(() => {
    const h = { 'ngrok-skip-browser-warning': '1' }
    fetch(`${API}/geo/cities`, { headers: h })
      .then(r => r.json()).then(d => setCities(d.data ?? [])).catch(() => {})
    fetch(`${API}/geo/regions`, { headers: h })
      .then(r => r.json()).then(d => setRegions(d.data ?? [])).catch(() => {})
  }, [])

  // Qidiruv so'rovi o'zgarganda yoki natijalar yuklanganda bir marta track qilamiz
  useEffect(() => {
    const currentQuery = params.q ?? ''
    if (lastTrackedQuery.current !== currentQuery) {
      lastTrackedQuery.current = currentQuery
      if (currentQuery) {
        trackSearch(currentQuery, meta.total)
      }
    }
  }, [params.q, meta.total])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams(params)
    if (q.trim()) p.set('q', q.trim()); else p.delete('q')
    p.delete('page')
    router.push(`/search?${p.toString()}`)
  }

  function setParam(key: string, val: string) {
    const p = new URLSearchParams(params)
    if (val) p.set(key, val); else p.delete(key)
    p.delete('page')
    router.push(`/search?${p.toString()}`)
    // Filter o'zgarishlarini kuzatamiz
    if (['type', 'regionId', 'cityId', 'sortBy'].includes(key)) {
      track('search_filter', {
        category: 'search',
        properties: { filter: key, value: val || null, query: params.q ?? '' },
      })
    }
  }

  const ui = {
    placeholder: { uz: "Muassasa nomi... (masalan: Najot, PDP)", ru: 'Название учреждения... (напр: Najot, PDP)' },
    searchBtn:   { uz: 'Qidirish', ru: 'Найти' },
    allTypes:    { uz: 'Barchasi', ru: 'Все' },
    allInst:     { uz: "Barcha ta'lim muassasalari", ru: 'Все учебные заведения' },
    emptyTitle:  { uz: 'Hech narsa topilmadi', ru: 'Ничего не найдено' },
    emptySub:    { uz: "Filtrlarni o'zgartiring yoki boshqa so'z kiriting", ru: 'Измените фильтры или введите другое слово' },
    errorTitle:  { uz: "Natijalarni yuklab bo'lmadi", ru: 'Не удалось загрузить результаты' },
    errorSub:    { uz: "Server bilan bog'lanishda xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.", ru: 'Ошибка соединения с сервером. Повторите попытку через некоторое время.' },
    retry:       { uz: 'Qayta urinish', ru: 'Повторить' },
    verified:    { uz: 'Tasdiqlangan', ru: 'Подтверждено' },
    compare:     { uz: 'Solishtir', ru: 'Сравнить' },
    compared:    { uz: 'Tanlandi', ru: 'Выбрано' },
    sortLabel:   { uz: 'Saralash', ru: 'Сортировка' },
    allCities:   { uz: 'Barcha shaharlar', ru: 'Все города' },
    allRegions:  { uz: 'Barcha viloyatlar', ru: 'Все регионы' },
    students:    { uz: "o'quvchi", ru: 'учеников' },
    teachers:    { uz: "o'qituvchi", ru: 'преподавателей' },
    prevPage:    { uz: 'Oldingi', ru: 'Назад' },
    nextPage:    { uz: 'Keyingi', ru: 'Далее' },
    regionFilterLabel: { uz: 'Viloyat bo\'yicha filtrlash', ru: 'Фильтр по региону' },
    cityFilterLabel:   { uz: 'Shahar bo\'yicha filtrlash', ru: 'Фильтр по городу' },
    sortFilterLabel:   { uz: 'Saralash tartibi', ru: 'Порядок сортировки' },
  }
  const pageOf = (p: number, total: number) => t(lang, { uz: `${total} sahifadan ${p}-sahifa`, ru: `Страница ${p} из ${total}` })

  // Active labels
  const activeCity   = params.cityId   ? cities.find(c => c.id === params.cityId)    : null
  const activeRegion = params.regionId ? regions.find(r => r.id === params.regionId) : null

  return (
    <main className="flex-1 bg-gray-50">
      {/* ── Qidiruv satri ─── */}
      <div className="sticky top-[65px] z-30 border-b border-gray-200 bg-white/97 backdrop-blur px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-6xl">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 focus-within:border-primary-400 transition-colors">
              <Search className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={1.75} />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={t(lang, ui.placeholder)}
                className="min-w-0 flex-1 bg-transparent py-3 text-base text-gray-900 outline-none placeholder:text-gray-400"
              />
              {q && (
                <button type="button" onClick={() => setQ('')} aria-label="Qidiruvni tozalash" className="tap-center shrink-0 p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              )}
            </div>
            <button type="submit" className="btn-primary shrink-0 whitespace-nowrap px-5">
              {t(lang, ui.searchBtn)}
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* ── Filters row ─── */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {/* Type chips */}
          <div className="flex flex-wrap gap-1.5">
            {/* Bosh sahifadagi kategoriya tablar bilan bir xil standart shakl */}
            <Link
              href={`/search?${(() => { const p = new URLSearchParams(params); p.delete('type'); p.delete('page'); return p.toString() })()}`}
              className={`flex h-9 shrink-0 items-center whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                !params.type
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t(lang, ui.allTypes)}
            </Link>
            {TYPE_FILTERS.map(f => (
              f.disabled ? (
                <span
                  key={f.type}
                  aria-disabled="true"
                  title={lang === 'uz' ? 'Tez orada' : 'Скоро'}
                  className="flex h-9 shrink-0 cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-xl bg-gray-50 px-3.5 text-sm font-semibold text-gray-300"
                >
                  <f.Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {lang === 'uz' ? f.uz : f.ru}
                  <Lock className="h-3 w-3 shrink-0" strokeWidth={2} />
                </span>
              ) : (
                <Link
                  key={f.type}
                  href={`/search?${new URLSearchParams({ ...params, type: f.type, page: '1' }).toString()}`}
                  className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                    params.type === f.type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <f.Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {lang === 'uz' ? f.uz : f.ru}
                </Link>
              )
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Region filter */}
          {regions.length > 0 && (
            <FilterSelect value={params.regionId ?? ''} onChange={v => setParam('regionId', v)} ariaLabel={t(lang, ui.regionFilterLabel)}>
              <option value="">{t(lang, ui.allRegions)}</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>
                  {lang === 'ru'
                    ? r.nameRu.replace('Республика ', '')
                    : r.nameUz.replace(' viloyati', ' vil.').replace(" Respublikasi", '')}
                  {r.institutionCount > 0 ? ` (${r.institutionCount})` : ''}
                </option>
              ))}
            </FilterSelect>
          )}

          {/* City filter */}
          {cities.length > 0 && (
            <FilterSelect value={params.cityId ?? ''} onChange={v => setParam('cityId', v)} ariaLabel={t(lang, ui.cityFilterLabel)}>
              <option value="">{t(lang, ui.allCities)}</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>
                  {lang === 'ru' ? c.nameRu : c.nameUz}
                </option>
              ))}
            </FilterSelect>
          )}

          {/* Sort */}
          <FilterSelect value={params.sortBy ?? 'rating'} onChange={v => setParam('sortBy', v)} ariaLabel={t(lang, ui.sortFilterLabel)}>
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {lang === 'uz' ? opt.uz : opt.ru}
              </option>
            ))}
          </FilterSelect>
        </div>


        {/* ── Title + active filters ─── */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-black text-gray-900">
            {params.q ? `"${params.q}"` : t(lang, ui.allInst)}
          </h1>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
            {lang === 'ru'
              ? `${meta.total} ${pluralRu(meta.total, ['результат', 'результата', 'результатов'])}`
              : `${meta.total} ta natija`}
          </span>
          {/* Active region badge */}
          {activeRegion && (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Globe2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              {lang === 'ru'
                ? activeRegion.nameRu.replace('Республика ', '')
                : activeRegion.nameUz.replace(' viloyati', '').replace(' Respublikasi', '')}
              <button onClick={() => setParam('regionId', '')} aria-label="Viloyat filtrini olib tashlash" className="ml-0.5 text-blue-500 hover:text-blue-700">
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          )}
          {/* Active city badge */}
          {activeCity && (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              {lang === 'ru' ? activeCity.nameRu : activeCity.nameUz}
              <button onClick={() => setParam('cityId', '')} aria-label="Shahar filtrini olib tashlash" className="tap-center ml-0.5 text-primary-500 hover:text-primary-700">
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          )}
        </div>

        {/* ── Results ─── */}
        {apiError ? (
          // Avval bu holat oddiy "hech narsa topilmadi" bilan bir xil ko'rinardi —
          // foydalanuvchi buni "filtrlaringiz bo'yicha natija yo'q" deb tushunardi,
          // holbuki sabab server bilan bog'lanib bo'lmagani edi (UX audit topilmasi)
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
              <WifiOff className="h-7 w-7 text-red-300" strokeWidth={1.5} />
            </div>
            <p className="mb-2 text-xl font-bold text-gray-800">{t(lang, ui.errorTitle)}</p>
            <p className="mb-6 text-sm text-gray-500">{t(lang, ui.errorSub)}</p>
            <button onClick={() => router.refresh()} className="btn-secondary text-sm">
              {t(lang, ui.retry)}
            </button>
          </div>
        ) : institutions.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Search className="h-7 w-7 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="mb-2 text-xl font-bold text-gray-800">{t(lang, ui.emptyTitle)}</p>
            <p className="mb-6 text-sm text-gray-500">{t(lang, ui.emptySub)}</p>
            <Link href="/search" className="btn-secondary text-sm">
              {t(lang, { uz: 'Barcha muassasalar', ru: 'Все учреждения' })}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {institutions.map((inst, idx) => (
              <InstitutionCardComp
                key={inst.id}
                institution={inst}
                lang={lang}
                position={idx + 1}
                query={params.q ?? ''}
                onCompare={() => toggle({ id: inst.id, slug: inst.slug, nameUz: inst.nameUz, type: inst.type, avgRating: inst.avgRating, pricing: inst.pricing })}
                onSave={() => toggleSave({ id: inst.id, slug: inst.slug, nameUz: inst.nameUz, type: inst.type, avgRating: inst.avgRating, pricing: inst.pricing })}
                isCompared={isSelected(inst.id)}
                isSaved={isSaved(inst.id)}
                ui={ui}
                showValueBadge={params.sortBy === 'value' && (params.page ?? '1') === '1' && idx < 3}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ─── */}
        {meta.totalPages > 1 && (
          <nav aria-label={pageOf(meta.page, meta.totalPages)} className="mt-8 flex flex-col items-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Link
                href={`/search?${new URLSearchParams({ ...params, page: String(Math.max(1, meta.page - 1)) }).toString()}`}
                aria-label={t(lang, ui.prevPage)}
                aria-disabled={meta.page <= 1}
                tabIndex={meta.page <= 1 ? -1 : undefined}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                  meta.page <= 1
                    ? 'pointer-events-none border-gray-100 bg-gray-50 text-gray-300'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </Link>

              {getPageWindow(meta.page, meta.totalPages).map((p, i) =>
                p === 'gap' ? (
                  <span key={`gap-${i}`} className="flex h-9 w-6 items-center justify-center text-sm text-gray-400">…</span>
                ) : (
                  <Link
                    key={p}
                    href={`/search?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                    aria-current={meta.page === p ? 'page' : undefined}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                      meta.page === p
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {p}
                  </Link>
                ),
              )}

              <Link
                href={`/search?${new URLSearchParams({ ...params, page: String(Math.min(meta.totalPages, meta.page + 1)) }).toString()}`}
                aria-label={t(lang, ui.nextPage)}
                aria-disabled={meta.page >= meta.totalPages}
                tabIndex={meta.page >= meta.totalPages ? -1 : undefined}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                  meta.page >= meta.totalPages
                    ? 'pointer-events-none border-gray-100 bg-gray-50 text-gray-300'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
            <p className="text-xs text-gray-400">{pageOf(meta.page, meta.totalPages)}</p>
          </nav>
        )}
      </div>
    </main>
  )
}

// Brauzer standart strelkasi o'rniga izchil lucide chevron bilan select
function FilterSelect({ value, onChange, children, ariaLabel }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  ariaLabel: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-primary-400"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" strokeWidth={2} />
    </div>
  )
}

function InstitutionCardComp({
  institution: i,
  lang,
  position,
  query,
  onCompare,
  onSave,
  isCompared,
  isSaved,
  ui,
  showValueBadge,
}: {
  institution: InstitutionCard
  lang: 'uz' | 'ru'
  position: number
  query: string
  onCompare: () => void
  onSave: () => void
  isCompared: boolean
  isSaved: boolean
  ui: Record<string, { uz: string; ru: string }>
  showValueBadge?: boolean
}) {
  const typeInfo = TYPE_LABELS[i.type]
  const name = lang === 'ru' && i.nameRu ? i.nameRu : i.nameUz
  const price = priceFrom(i.pricing, lang)
  const programs = localizeList(i.details?.programs, i.details?.programsRu, lang)
  const uz = lang === 'uz'

  // "Saqlash" ikonka-only tugma bo'lgani uchun holat o'zgarishi ko'zga
  // kam tashlanadi — bosilganda ikonka ostida qisqa muddat "Saqlandi"
  // belgisi ko'rsatiladi (bosh sahifadagi karta bilan bir xil naqsh)
  const [justSaved, setJustSaved] = useState(false)
  function handleSave(e: React.MouseEvent) {
    e.preventDefault()
    onSave()
    haptic('light')
    if (!isSaved) {
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1500)
    }
  }

  return (
    <div className="card relative flex flex-col">
      {showValueBadge && (
        <span className="absolute -top-2 left-4 z-10 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
          <Award className="h-3 w-3 shrink-0" strokeWidth={2.5} />
          {lang === 'ru' ? 'ТОП цена-качество' : 'TOP narx-sifat'}
        </span>
      )}

      {/* Saqlash — ikonka-only, kartaning o'ng yuqori burchagida suzib
          turadi (bosh sahifadagi karta bilan bir xil dizayn, UX audit
          topilmasi: bu o'zgarish avval faqat bosh sahifada bo'lgan) */}
      <button
        onClick={handleSave}
        aria-pressed={isSaved}
        aria-label={uz ? (isSaved ? "Saqlangan — olib tashlash" : 'Saqlash') : (isSaved ? 'Сохранено — убрать' : 'Сохранить')}
        className={`absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-all duration-200 hover:scale-110 active:scale-95 ${
          isSaved
            ? 'border-amber-200 bg-amber-50/95 text-amber-600'
            : 'border-gray-200/80 bg-white/85 text-gray-500 hover:border-amber-200 hover:text-amber-600'
        }`}
      >
        <Bookmark
          className={justSaved ? 'h-[18px] w-[18px] animate-save-pop' : 'h-[18px] w-[18px]'}
          fill={isSaved ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
        {justSaved && (
          <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 whitespace-nowrap rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-semibold text-white animate-save-hint">
            {uz ? 'Saqlandi ✓' : 'Сохранено ✓'}
          </span>
        )}
      </button>

      <Link
        href={`/institutions/${i.slug}`}
        className="group flex flex-1 flex-col"
        onClick={() => trackSearchClick(i.id, position, query)}
      >
        {/* Rasm boxi hozircha yashirilgan — muassasalarning aksariyatida
            hali rasm yuklanmagan, faqat bosh harflar ko'rsatilishi
            "bo'sh" taassurot qoldirardi. Rasmlar ko'proq to'lgach qaytariladi. */}
        <div className="flex flex-1 flex-col p-6">
        {/* Tur + tasdiqlangan — o'ng tarafda suzib turgan Saqlash tugmasi
            bilan ustma-ust tushmasligi uchun o'ng chetdan bo'shliq
            qoldiriladi */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5 pr-10">
          <span className="badge-sm bg-primary-50 text-primary-700">
            {typeInfo ? t(lang, typeInfo) : i.type}
          </span>
          <VerificationBadge level={i.verificationLevel} lang={lang} size="xs" />
          {i.isPinned && (
            <span title={t(lang, { uz: 'Tavsiya etiladi', ru: 'Рекомендуется' })} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-sm ring-1 ring-amber-200">
              <Crown className="h-4 w-4 shrink-0 text-white" strokeWidth={2} fill="currentColor" />
            </span>
          )}
        </div>

        {/* Nom */}
        <h2 className="mb-1.5 min-h-[2.75rem] text-base font-black text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug">
          {name}
        </h2>

        {/* Shahar + statistika — har bir son yonida qisqa yozuv bilan
            (ikonka yolg'iz ma'no tashimasin) */}
        <InstitutionMetrics
          lang={lang}
          className="mb-3"
          data={{
            city: lang === 'ru' && i.city?.nameRu ? i.city.nameRu : (i.city?.nameUz ?? i.address),
            studentCount: i.details?.studentCount,
            teacherCount: i.details?.teacherCount,
            foundedYear: i.details?.foundedYear,
          }}
        />

        {/* Yo'nalishlar — teglar soni har xil bo'lsa ham kartalar bir xil
            balandlikda qolishi uchun sm+ ekranlarda (bir qatorda bir nechta
            karta yonma-yon turadigan joyda) balandlik qattiq belgilanadi.
            Mobil (1 ustunli, hech kim bilan qatorlashmaydi) — bo'sh joy
            ajratishning ma'nosi yo'q, TO'LIQ ko'rsatiladi (ma'lumot
            "+N ta" belgisi bilan birga ikkinchi qatorga tushib yashirinib
            qolmasligi kerak) */}
        <div className="mb-3 flex flex-wrap gap-1.5 sm:h-8 sm:overflow-hidden">
          {programs.slice(0, 3).map(prog => (
            <span key={prog} className="max-w-full truncate rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-600" title={prog}>
              {prog}
            </span>
          ))}
          {programs.length > 3 && (
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-400">
              +{programs.length - 3} ta
            </span>
          )}
        </div>

        {/* Narx (asosiy) + reyting (tinch, taxminiy ko'rsatkich sifatida).
            Sharh mavjud bo'lmasa — bo'sh joy shunchaki bo'sh qoladi (avval
            "Sharh yo'q" matni bor edi, ko'p kartada takrorlanib ortiqcha
            shovqin qilardi) */}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-gray-100 pt-4">
          {i.avgRating && (
            <RatingHint rating={i.avgRating} count={i.reviewCount} lang={lang} />
          )}
          {price && (
            <span className={`price-badge whitespace-nowrap text-sm ${!i.avgRating ? 'ml-auto' : ''}`}>{price.full}</span>
          )}
        </div>
        </div>
      </Link>

      {/* Solishtirish — Saqlash yuqorida ikonka sifatida ko'chirilgani
          uchun bu tugma to'liq kenglikni egallaydi */}
      <div className="border-t border-gray-100 p-2">
        <button
          onClick={onCompare}
          aria-pressed={isCompared}
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
            isCompared
              ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
              : 'bg-gray-50 text-gray-600 hover:bg-primary-50 hover:text-primary-700'
          }`}
        >
          {isCompared ? <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} /> : <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2} />}
          {isCompared ? t(lang, ui.compared) : t(lang, ui.compare)}
        </button>
      </div>
    </div>
  )
}
