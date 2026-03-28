'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
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

const TYPE_FILTERS = [
  { type: 'COURSE_CENTER',   icon: '✏️', uz: "O'quv markazlar", ru: 'Учебные центры', active: true },
  { type: 'SCHOOL',          icon: '📚', uz: 'Maktablar',        ru: 'Школы',          active: true },
  { type: 'IT_SCHOOL',       icon: '💻', uz: 'IT',               ru: 'IT',             active: false },
  { type: 'UNIVERSITY',      icon: '🎓', uz: 'Universitet',      ru: 'Университет',    active: false },
  { type: 'LANGUAGE_CENTER', icon: '🌐', uz: 'Til markazi',      ru: 'Языковой',       active: false },
  { type: 'KINDERGARTEN',    icon: '🎨', uz: "Bog'cha",          ru: 'Детсад',         active: false },
]

const SORT_OPTIONS = [
  { value: 'rating',     uz: '⭐ Yuqori reyting', ru: '⭐ Высокий рейтинг' },
  { value: 'newest',     uz: '🆕 Yangi',           ru: '🆕 Новые' },
  { value: 'price_asc',  uz: '💰 Arzon',           ru: '💰 Дешевле' },
  { value: 'price_desc', uz: '💎 Qimmat',           ru: '💎 Дороже' },
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
    comingSoon:  { uz: 'Tez kunda', ru: 'Скоро' },
  }

  // Active labels
  const activeCity   = params.cityId   ? cities.find(c => c.id === params.cityId)    : null
  const activeRegion = params.regionId ? regions.find(r => r.id === params.regionId) : null

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Qidiruv satri ─── */}
      <div className="sticky top-[65px] z-30 border-b-2 border-gray-100 bg-white/97 backdrop-blur px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-6xl">
          <form onSubmit={handleSearch} className="flex gap-2.5">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white px-4 focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-100 transition-all">
              <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={t(lang, ui.placeholder)}
                className="flex-1 bg-transparent py-3 text-base text-gray-900 outline-none placeholder:text-gray-400"
              />
              {q && (
                <button type="button" onClick={() => setQ('')} className="text-gray-400 hover:text-gray-600 p-1">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
            <button type="submit" className="btn-primary shrink-0 px-5">
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
            <Link
              href={`/search?${(() => { const p = new URLSearchParams(params); p.delete('type'); p.delete('page'); return p.toString() })()}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                !params.type
                  ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {t(lang, ui.allTypes)}
            </Link>
            {TYPE_FILTERS.map(f => f.active ? (
              <Link
                key={f.type}
                href={`/search?${new URLSearchParams({ ...params, type: f.type, page: '1' }).toString()}`}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  params.type === f.type
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {f.icon} {lang === 'uz' ? f.uz : f.ru}
              </Link>
            ) : (
              <span
                key={f.type}
                title={t(lang, ui.comingSoon)}
                className="flex items-center gap-1 rounded-full border border-dashed border-gray-200 px-3 py-1 text-xs font-medium text-gray-300 cursor-not-allowed select-none"
              >
                {f.icon} {lang === 'uz' ? f.uz : f.ru}
              </span>
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
              <option value="">🗺️ {t(lang, ui.allRegions)}</option>
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
              <option value="">📍 {t(lang, ui.allCities)}</option>
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
            <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              🗺️ {lang === 'ru'
                ? activeRegion.nameRu.replace('Республика ', '')
                : activeRegion.nameUz.replace(' viloyati', '').replace(' Respublikasi', '')}
              <button onClick={() => setParam('regionId', '')} className="ml-0.5 text-blue-500 hover:text-blue-700">✕</button>
            </span>
          )}
          {/* Active city badge */}
          {activeCity && (
            <span className="flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
              📍 {lang === 'ru' ? activeCity.nameRu : activeCity.nameUz}
              <button onClick={() => setParam('cityId', '')} className="ml-0.5 text-primary-500 hover:text-primary-700">✕</button>
            </span>
          )}
        </div>

        {/* ── Results ─── */}
        {institutions.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-100 text-5xl">🔍</div>
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
                className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition-all ${
                  String(meta.page) === String(p)
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
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
    <div className="group flex flex-col rounded-3xl border-2 border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg">
      <Link
        href={`/institutions/${i.slug}`}
        className="flex flex-1 flex-col p-6"
        onClick={() => trackSearchClick(i.id, position, query)}
      >
        {/* Tur + tasdiqlangan */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-bold ${typeInfo?.color ?? 'bg-gray-50 text-gray-700'}`}>
            {typeInfo ? t(lang, typeInfo) : i.type}
          </span>
          {i.isVerified && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
              ✓ {t(lang, ui.verified)}
            </span>
          )}
        </div>

        {/* Nom */}
        <h2 className="mb-2 text-xl font-black text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug">
          {name}
        </h2>

        {/* Shahar */}
        {(i.city?.nameUz ?? i.address) && (
          <div className="mb-3 flex items-center gap-2 text-base text-gray-500">
            <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            {lang === 'ru' && i.city?.nameRu ? i.city.nameRu : (i.city?.nameUz ?? i.address)}
          </div>
        )}

        {/* O'quvchilar + o'qituvchilar */}
        {(i.details?.studentCount || i.details?.teacherCount) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {i.details.studentCount && (
              <span className="flex items-center gap-1.5 rounded-2xl bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                👥 {formatNum(i.details.studentCount)}+ {lang === 'uz' ? "o'quvchi" : 'уч.'}
              </span>
            )}
            {i.details.teacherCount && (
              <span className="flex items-center gap-1.5 rounded-2xl bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700">
                👨‍🏫 {i.details.teacherCount} {lang === 'uz' ? "o'qit." : 'пед.'}
              </span>
            )}
          </div>
        )}

        {/* Yo'nalishlar */}
        {(i.details?.programs?.length ?? 0) > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {i.details!.programs!.slice(0, 3).map(prog => (
              <span key={prog} className="rounded-xl bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-600">
                {prog}
              </span>
            ))}
            {i.details!.programs!.length > 3 && (
              <span className="rounded-xl bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-400">
                +{i.details!.programs!.length - 3} ta
              </span>
            )}
          </div>
        )}

        {/* Reyting + narx */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
          {i.avgRating ? (
            <div className="flex items-center gap-1.5">
              <StarRating rating={i.avgRating} size="sm" />
              <span className="text-base font-black text-gray-900">{i.avgRating.toFixed(1)}</span>
              <span className="text-sm text-gray-400">({i.reviewCount})</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">{t(lang, ui.noReview)}</span>
          )}
          {i.pricing?.monthlyMin && (
            <span className="shrink-0 rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-sm font-black text-emerald-700">
              {formatUzs(i.pricing.monthlyMin)}
            </span>
          )}
        </div>
      </Link>

      {/* Amallar */}
      <div className="flex divide-x-2 divide-gray-100 border-t-2 border-gray-100">
        <button
          onClick={onSave}
          className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors rounded-bl-3xl ${
            isSaved
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <span className="text-lg">{isSaved ? '⭐' : '☆'}</span>
          {isSaved ? t(lang, ui.saved) : t(lang, ui.save)}
        </button>
        <button
          onClick={onCompare}
          className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors rounded-br-3xl ${
            isCompared
              ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <span className="text-lg">{isCompared ? '✓' : '⇄'}</span>
          {isCompared ? t(lang, ui.compared) : t(lang, ui.compare)}
        </button>
      </div>
    </div>
  )
}
