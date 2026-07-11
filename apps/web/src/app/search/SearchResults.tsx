'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  Search, X, MapPin, Globe2, Users2, UserCheck, BadgeCheck, Star,
  ArrowLeftRight, Check, PencilLine, School, Trophy,
} from 'lucide-react'
import { RatingHint } from '@/components/shared/StarRating'
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
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}
function formatUzs(n: number) { return `${formatNum(n)} so'm` }

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
// tugaydigan "o'lik" filtrlarni chiqarmaslik uchun
const TYPE_FILTERS = [
  { type: 'COURSE_CENTER', Icon: PencilLine, uz: "O'quv markazlar", ru: 'Учебные центры' },
  { type: 'SCHOOL',        Icon: School,     uz: 'Maktablar',       ru: 'Школы' },
  { type: 'LYCEUM',        Icon: Trophy,     uz: 'Litseylar',       ru: 'Лицеи' },
]

const SORT_OPTIONS = [
  { value: 'rating',     uz: "Yuqori reyting", ru: 'Высокий рейтинг' },
  { value: 'newest',     uz: 'Yangi',           ru: 'Новые' },
  { value: 'price_asc',  uz: 'Arzon',           ru: 'Дешевле' },
  { value: 'price_desc', uz: 'Qimmat',          ru: 'Дороже' },
]

export default function SearchResults({ institutions, meta, params }: Props) {
  const router = useRouter()
  const { lang } = useLang()
  const [q, setQ] = useState(params.q ?? '')
  const [cities, setCities] = useState<City[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const { toggle, isSelected } = useCompare()
  const { toggleSave, isSaved } = useSaved()
  // Oxirgi track qilingan so'rov — ikki marta yubormaslik uchun
  const lastTrackedQuery = useRef<string | undefined>(undefined)

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
    results:     { uz: 'ta natija', ru: 'результатов' },
    allInst:     { uz: "Barcha ta'lim muassasalari", ru: 'Все учебные заведения' },
    emptyTitle:  { uz: 'Hech narsa topilmadi', ru: 'Ничего не найдено' },
    emptySub:    { uz: "Filtrlarni o'zgartiring yoki boshqa so'z kiriting", ru: 'Измените фильтры или введите другое слово' },
    noReview:    { uz: "Sharh yo'q", ru: 'Нет отзывов' },
    verified:    { uz: 'Tasdiqlangan', ru: 'Подтверждено' },
    save:        { uz: 'Saqlash', ru: 'Сохранить' },
    saved:       { uz: 'Saqlandi', ru: 'Сохранено' },
    compare:     { uz: 'Solishtir', ru: 'Сравнить' },
    compared:    { uz: 'Tanlandi', ru: 'Выбрано' },
    sortLabel:   { uz: 'Saralash', ru: 'Сортировка' },
    allCities:   { uz: 'Barcha shaharlar', ru: 'Все города' },
    allRegions:  { uz: 'Barcha viloyatlar', ru: 'Все регионы' },
    students:    { uz: "o'quvchi", ru: 'учеников' },
    teachers:    { uz: "o'qituvchi", ru: 'преподавателей' },
  }

  // Active labels
  const activeCity   = params.cityId   ? cities.find(c => c.id === params.cityId)    : null
  const activeRegion = params.regionId ? regions.find(r => r.id === params.regionId) : null

  return (
    <main className="min-h-screen bg-gray-50">
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
                <button type="button" onClick={() => setQ('')} aria-label="Qidiruvni tozalash" className="shrink-0 p-1 text-gray-400 hover:text-gray-600">
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
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Region filter */}
          {regions.length > 0 && (
            <select
              value={params.regionId ?? ''}
              onChange={e => setParam('regionId', e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-primary-400 cursor-pointer"
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
          )}

          {/* City filter */}
          {cities.length > 0 && (
            <select
              value={params.cityId ?? ''}
              onChange={e => setParam('cityId', e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-primary-400 cursor-pointer"
            >
              <option value="">{t(lang, ui.allCities)}</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>
                  {lang === 'ru' ? c.nameRu : c.nameUz}
                </option>
              ))}
            </select>
          )}

          {/* Sort */}
          <select
            value={params.sortBy ?? 'rating'}
            onChange={e => setParam('sortBy', e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-primary-400 cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {lang === 'uz' ? opt.uz : opt.ru}
              </option>
            ))}
          </select>
        </div>


        {/* ── Title + active filters ─── */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-black text-gray-900">
            {params.q ? `"${params.q}"` : t(lang, ui.allInst)}
          </h1>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
            {meta.total} {t(lang, ui.results)}
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
              <button onClick={() => setParam('cityId', '')} aria-label="Shahar filtrini olib tashlash" className="ml-0.5 text-primary-500 hover:text-primary-700">
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          )}
        </div>

        {/* ── Results ─── */}
        {institutions.length === 0 ? (
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
              />
            ))}
          </div>
        )}

        {/* ── Pagination ─── */}
        {meta.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-1.5">
            {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={`/search?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                  String(meta.page) === String(p)
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-600'
                }`}
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
  const typeInfo = TYPE_LABELS[i.type]
  const name = lang === 'ru' && i.nameRu ? i.nameRu : i.nameUz

  return (
    <div className="group card flex flex-col">
      <Link
        href={`/institutions/${i.slug}`}
        className="flex flex-1 flex-col p-6"
        onClick={() => trackSearchClick(i.id, position, query)}
      >
        {/* Tur + tasdiqlangan — bosh sahifa kartasi bilan bir xil ixcham badge'lar */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="badge-sm bg-primary-50 text-primary-700">
            {typeInfo ? t(lang, typeInfo) : i.type}
          </span>
          {i.isVerified && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <BadgeCheck className="h-3 w-3 shrink-0" strokeWidth={2} /> {t(lang, ui.verified)}
            </span>
          )}
        </div>

        {/* Nom */}
        <h2 className="mb-1.5 text-base font-black text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug">
          {name}
        </h2>

        {/* Shahar + statistika — bitta ixcham qator (rangli pill'lar o'rniga) */}
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {(i.city?.nameUz ?? i.address) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.75} />
              {lang === 'ru' && i.city?.nameRu ? i.city.nameRu : (i.city?.nameUz ?? i.address)}
            </span>
          )}
          {i.details?.studentCount && (
            <span className="flex items-center gap-1 font-semibold text-primary-600">
              <Users2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {formatNum(i.details.studentCount)}+
            </span>
          )}
          {i.details?.teacherCount && (
            <span className="flex items-center gap-1 font-semibold">
              <UserCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {i.details.teacherCount}
            </span>
          )}
        </div>

        {/* Yo'nalishlar */}
        {(i.details?.programs?.length ?? 0) > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {i.details!.programs!.slice(0, 3).map(prog => (
              <span key={prog} className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-600">
                {prog}
              </span>
            ))}
            {i.details!.programs!.length > 3 && (
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-400">
                +{i.details!.programs!.length - 3} ta
              </span>
            )}
          </div>
        )}

        {/* Narx (asosiy) + reyting (tinch, taxminiy ko'rsatkich sifatida) */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
          {i.avgRating ? (
            <RatingHint rating={i.avgRating} count={i.reviewCount} lang={lang} />
          ) : (
            <span className="text-sm text-gray-400">{t(lang, ui.noReview)}</span>
          )}
          {i.pricing?.monthlyMin && (
            <span className="price-badge shrink-0 whitespace-nowrap text-sm">
              {formatUzs(i.pricing.monthlyMin)}
            </span>
          )}
        </div>
      </Link>

      {/* Amallar */}
      <div className="flex divide-x divide-gray-100 border-t border-gray-100">
        <button
          onClick={onSave}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-bl-2xl py-3 text-sm font-semibold transition-colors ${
            isSaved
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <Star className="h-4 w-4 shrink-0" fill={isSaved ? 'currentColor' : 'none'} strokeWidth={2} />
          {isSaved ? t(lang, ui.saved) : t(lang, ui.save)}
        </button>
        <button
          onClick={onCompare}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-br-2xl py-3 text-sm font-semibold transition-colors ${
            isCompared
              ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          {isCompared ? <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} /> : <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2} />}
          {isCompared ? t(lang, ui.compared) : t(lang, ui.compare)}
        </button>
      </div>
    </div>
  )
}
