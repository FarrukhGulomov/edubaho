'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  Search, X, MapPin, Users, Star, CheckCircle2,
  Bookmark, Scale, Building2, PencilLine, BookOpen,
  Laptop, Globe, GraduationCap, Palette, ChevronDown,
} from 'lucide-react'
import StarRating from '@/components/shared/StarRating'
import { useCompare, useSaved } from '@/hooks/useCompare'
import { useLang, t } from '@/contexts/LangContext'
import { track, trackSearch, trackSearchClick } from '@/lib/analytics'
import type { InstitutionCard } from './page'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface Props {
  institutions: InstitutionCard[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  params: Record<string, string>
}

interface City   { id: string; nameUz: string; nameRu: string }
interface Region { id: string; nameUz: string; nameRu: string; institutionCount: number }

function formatNum(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
function formatUzs(n: number) { return `${formatNum(n)} so'm` }

const TYPE_META: Record<string, { uz: string; ru: string; icon: React.ElementType }> = {
  SCHOOL:          { uz: 'Maktab',        ru: 'Школа',          icon: BookOpen },
  LYCEUM:          { uz: 'Litsey',        ru: 'Лицей',          icon: BookOpen },
  COURSE_CENTER:   { uz: "O'quv markaz",  ru: 'Учебный центр',  icon: PencilLine },
  LANGUAGE_CENTER: { uz: 'Til markazi',   ru: 'Языковой',       icon: Globe },
  IT_SCHOOL:       { uz: 'IT maktab',     ru: 'IT школа',       icon: Laptop },
  UNIVERSITY:      { uz: 'Universitet',   ru: 'Университет',    icon: GraduationCap },
  KINDERGARTEN:    { uz: "Bog'cha",       ru: 'Детсад',         icon: Palette },
  SPORTS_SCHOOL:   { uz: 'Sport maktabi', ru: 'Спортшкола',     icon: Building2 },
  ARTS_SCHOOL:     { uz: "San'at",        ru: 'Школа искусств', icon: Building2 },
}

const TYPE_FILTERS = [
  { type: 'COURSE_CENTER',   icon: PencilLine, uz: "O'quv markazlar", ru: 'Учебные центры', active: true },
  { type: 'SCHOOL',          icon: BookOpen,   uz: 'Maktablar',        ru: 'Школы',          active: true },
  { type: 'IT_SCHOOL',       icon: Laptop,     uz: 'IT',               ru: 'IT',             active: false },
  { type: 'LANGUAGE_CENTER', icon: Globe,      uz: 'Til markazi',      ru: 'Языковой',       active: false },
]

const SORT_OPTIONS = [
  { value: 'rating',     uz: 'Yuqori reyting', ru: 'Высокий рейтинг' },
  { value: 'newest',     uz: 'Yangi',           ru: 'Новые' },
  { value: 'price_asc',  uz: 'Arzon',           ru: 'Дешевле' },
  { value: 'price_desc', uz: 'Qimmat',           ru: 'Дороже' },
]

export default function SearchResults({ institutions, meta, params }: Props) {
  const router = useRouter()
  const { lang } = useLang()
  const [q, setQ] = useState(params.q ?? '')
  const [cities, setCities] = useState<City[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const { toggle, isSelected } = useCompare()
  const { toggleSave, isSaved } = useSaved()
  const lastTrackedQuery = useRef<string | undefined>(undefined)

  useEffect(() => {
    const h = { 'ngrok-skip-browser-warning': '1' }
    fetch(`${API}/geo/cities`, { headers: h })
      .then(r => r.json()).then(d => setCities(d.data ?? [])).catch(() => {})
    fetch(`${API}/geo/regions`, { headers: h })
      .then(r => r.json()).then(d => setRegions(d.data ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    const currentQuery = params.q ?? ''
    if (lastTrackedQuery.current !== currentQuery) {
      lastTrackedQuery.current = currentQuery
      if (currentQuery) trackSearch(currentQuery, meta.total)
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
    if (['type', 'regionId', 'cityId', 'sortBy'].includes(key)) {
      track('search_filter', {
        category: 'search',
        properties: { filter: key, value: val || null, query: params.q ?? '' },
      })
    }
  }

  const ui = {
    placeholder: { uz: "Muassasa nomi... (masalan: Najot, PDP)", ru: 'Название учреждения...' },
    searchBtn:   { uz: 'Qidirish', ru: 'Найти' },
    allTypes:    { uz: 'Barchasi', ru: 'Все' },
    results:     { uz: 'ta natija', ru: 'результатов' },
    allInst:     { uz: "Barcha ta'lim muassasalari", ru: 'Все учебные заведения' },
    emptyTitle:  { uz: 'Hech narsa topilmadi', ru: 'Ничего не найдено' },
    emptySub:    { uz: "Filtrlarni o'zgartiring yoki boshqa so'z kiriting", ru: 'Измените фильтры или введите другое слово' },
    noReview:    { uz: "Sharh yo'q", ru: 'Нет отзывов' },
    verified:    { uz: 'Tasdiqlangan', ru: 'Подтв.' },
    save:        { uz: 'Saqlash', ru: 'Сохранить' },
    saved:       { uz: 'Saqlandi', ru: 'Сохранено' },
    compare:     { uz: 'Solishtir', ru: 'Сравнить' },
    compared:    { uz: 'Tanlandi', ru: 'Выбрано' },
    allCities:   { uz: 'Barcha shaharlar', ru: 'Все города' },
    allRegions:  { uz: 'Barcha viloyatlar', ru: 'Все регионы' },
    comingSoon:  { uz: 'Tez kunda', ru: 'Скоро' },
  }

  const activeCity   = params.cityId   ? cities.find(c => c.id === params.cityId)    : null
  const activeRegion = params.regionId ? regions.find(r => r.id === params.regionId) : null

  return (
    <main className="min-h-dvh bg-canvas">
      {/* ── Sticky search bar ─── */}
      <div className="glass sticky top-[64px] z-30 border-b border-line px-4 py-3 shadow-card">
        <div className="mx-auto max-w-6xl">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-line-2 bg-surface px-4 transition-all focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20">
              <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={t(lang, ui.placeholder)}
                className="flex-1 bg-transparent py-3 text-base text-ink outline-none placeholder:text-faint"
                aria-label={t(lang, ui.searchBtn)}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="rounded p-1 text-faint transition-colors hover:text-ink"
                  style={{ minHeight: 0, minWidth: 0 }}
                  aria-label="Tozalash"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            <button type="submit" className="btn-primary shrink-0">
              {t(lang, ui.searchBtn)}
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* ── Filters ─── */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {/* Type chips */}
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={`/search?${(() => { const p = new URLSearchParams(params); p.delete('type'); p.delete('page'); return p.toString() })()}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                !params.type
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-line-2 bg-surface text-mute hover:border-line-2 hover:text-ink'
              }`}
            >
              {t(lang, ui.allTypes)}
            </Link>
            {TYPE_FILTERS.map(f => f.active ? (
              <Link
                key={f.type}
                href={`/search?${new URLSearchParams({ ...params, type: f.type, page: '1' }).toString()}`}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  params.type === f.type
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-line-2 bg-surface text-mute hover:text-ink'
                }`}
              >
                <f.icon className="h-3.5 w-3.5" aria-hidden />
                {lang === 'uz' ? f.uz : f.ru}
              </Link>
            ) : (
              <span
                key={f.type}
                title={t(lang, ui.comingSoon)}
                className="flex cursor-not-allowed select-none items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1 text-xs text-faint"
              >
                <f.icon className="h-3.5 w-3.5" aria-hidden />
                {lang === 'uz' ? f.uz : f.ru}
              </span>
            ))}
          </div>

          <div className="flex-1" />

          {/* Region filter */}
          {regions.length > 0 && (
            <div className="relative">
              <select
                value={params.regionId ?? ''}
                onChange={e => setParam('regionId', e.target.value)}
                className="cursor-pointer appearance-none rounded-lg border border-line-2 bg-surface py-2 pl-3 pr-7 text-xs font-medium text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">{t(lang, ui.allRegions)}</option>
                {regions.map(r => (
                  <option key={r.id} value={r.id}>
                    {lang === 'ru'
                      ? r.nameRu.replace('Республика ', '')
                      : r.nameUz.replace(' viloyati', ' vil.').replace(" Respublikasi", '')}
                    {r.institutionCount > 0 ? ` (${r.institutionCount})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
            </div>
          )}

          {/* City filter */}
          {cities.length > 0 && (
            <div className="relative">
              <select
                value={params.cityId ?? ''}
                onChange={e => setParam('cityId', e.target.value)}
                className="cursor-pointer appearance-none rounded-lg border border-line-2 bg-surface py-2 pl-3 pr-7 text-xs font-medium text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">{t(lang, ui.allCities)}</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>
                    {lang === 'ru' ? c.nameRu : c.nameUz}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
            </div>
          )}

          {/* Sort */}
          <div className="relative">
            <select
              value={params.sortBy ?? 'rating'}
              onChange={e => setParam('sortBy', e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border border-line-2 bg-surface py-2 pl-3 pr-7 text-xs font-medium text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {lang === 'uz' ? opt.uz : opt.ru}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
          </div>
        </div>

        {/* ── Header + active filter badges ─── */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <h1 className="text-base font-semibold text-ink">
            {params.q ? `"${params.q}"` : t(lang, ui.allInst)}
          </h1>
          <span className="badge-sm bg-surface-2 text-faint tabular-nums">{meta.total} {t(lang, ui.results)}</span>
          {activeRegion && (
            <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
              <MapPin className="h-3 w-3" aria-hidden />
              {lang === 'ru'
                ? activeRegion.nameRu.replace('Республика ', '')
                : activeRegion.nameUz.replace(' viloyati', '').replace(' Respublikasi', '')}
              <button
                onClick={() => setParam('regionId', '')}
                className="ml-0.5 text-primary-400 hover:text-primary-700"
                style={{ minHeight: 0, minWidth: 0 }}
                aria-label="Filtrni olib tashlash"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          )}
          {activeCity && (
            <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
              <MapPin className="h-3 w-3" aria-hidden />
              {lang === 'ru' ? activeCity.nameRu : activeCity.nameUz}
              <button
                onClick={() => setParam('cityId', '')}
                className="ml-0.5 text-primary-400 hover:text-primary-700"
                style={{ minHeight: 0, minWidth: 0 }}
                aria-label="Filtrni olib tashlash"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          )}
        </div>

        {/* ── Results grid ─── */}
        {institutions.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
              <Search className="h-8 w-8 text-faint" aria-hidden />
            </div>
            <p className="mb-1 text-base font-semibold text-ink">{t(lang, ui.emptyTitle)}</p>
            <p className="mb-6 text-sm text-mute">{t(lang, ui.emptySub)}</p>
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
              />
            ))}
          </div>
        )}

        {/* ── Pagination ─── */}
        {meta.totalPages > 1 && (
          <div className="mt-10 flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={`/search?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition-all ${
                  String(meta.page) === String(p)
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-line-2 bg-surface text-mute hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
                aria-label={`${p}-sahifa`}
                aria-current={String(meta.page) === String(p) ? 'page' : undefined}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
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
}) {
  const m    = TYPE_META[i.type]
  const name = lang === 'ru' && i.nameRu ? i.nameRu : i.nameUz
  const Icon = m?.icon ?? Building2

  return (
    <div className="card group flex flex-col overflow-hidden">
      <Link
        href={`/institutions/${i.slug}`}
        className="flex flex-1 flex-col p-5"
        onClick={() => trackSearchClick(i.id, position, query)}
      >
        {/* Type + verified */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="badge-sm bg-surface-2 text-mute">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {m ? t(lang, m) : i.type}
          </span>
          {i.isVerified && (
            <span className="verified-badge">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              {t(lang, ui.verified)}
            </span>
          )}
        </div>

        <h2 className="mb-2 line-clamp-2 text-base font-semibold leading-snug text-ink transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
          {name}
        </h2>

        {(i.city?.nameUz ?? i.address) && (
          <div className="mb-2 flex items-center gap-1.5 text-sm text-mute">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {lang === 'ru' && i.city?.nameRu ? i.city.nameRu : (i.city?.nameUz ?? i.address)}
          </div>
        )}

        {(i.details?.studentCount || i.details?.teacherCount) && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {i.details?.studentCount && (
              <span className="flex items-center gap-1 text-xs text-mute">
                <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {formatNum(i.details.studentCount)}+ {lang === 'uz' ? "o'q." : 'уч.'}
              </span>
            )}
          </div>
        )}

        {(i.details?.programs?.length ?? 0) > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {i.details!.programs!.slice(0, 3).map(prog => (
              <span key={prog} className="badge-sm bg-surface-2 text-mute">{prog}</span>
            ))}
            {i.details!.programs!.length > 3 && (
              <span className="badge-sm bg-surface-2 text-faint">+{i.details!.programs!.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          {i.avgRating ? (
            <div className="flex items-center gap-1.5">
              <StarRating rating={i.avgRating} size="sm" />
              <span className="text-sm font-semibold tabular-nums text-ink">{i.avgRating.toFixed(1)}</span>
              <span className="text-xs tabular-nums text-faint">({i.reviewCount})</span>
            </div>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-faint">
              <Star className="h-3.5 w-3.5" aria-hidden />
              {t(lang, ui.noReview)}
            </span>
          )}
          {i.pricing?.monthlyMin && (
            <span className="price-badge">{formatUzs(i.pricing.monthlyMin)}</span>
          )}
        </div>
      </Link>

      {/* Actions */}
      <div className="flex divide-x divide-line border-t border-line">
        <button
          onClick={onSave}
          aria-pressed={isSaved}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
            isSaved
              ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10'
              : 'text-mute hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" fill={isSaved ? 'currentColor' : 'none'} aria-hidden />
          {isSaved ? t(lang, ui.saved) : t(lang, ui.save)}
        </button>
        <button
          onClick={onCompare}
          aria-pressed={isCompared}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
            isCompared
              ? 'text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10'
              : 'text-mute hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <Scale className="h-3.5 w-3.5" aria-hidden />
          {isCompared ? t(lang, ui.compared) : t(lang, ui.compare)}
        </button>
      </div>
    </div>
  )
}
