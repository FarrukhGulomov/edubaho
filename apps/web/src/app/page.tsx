'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import StarRating from '@/components/shared/StarRating'
import { useLang, t } from '@/contexts/LangContext'

interface TopInstitution {
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
  details?: { studentCount?: number | null; programs?: string[] }
}

interface Region {
  id: string
  nameUz: string
  nameRu: string
  slug: string
  type: string
  institutionCount: number
}

function formatUzs(n: number) {
  return `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')} so'm`
}

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  SCHOOL:          { uz: 'Maktab',        ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',        ru: 'Лицей' },
  COURSE_CENTER:   { uz: 'O\'quv markaz', ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi',   ru: 'Языковой центр' },
  IT_SCHOOL:       { uz: 'IT maktab',     ru: 'IT школа' },
  UNIVERSITY:      { uz: 'Universitet',   ru: 'Университет' },
  KINDERGARTEN:    { uz: "Bog'cha",       ru: 'Детсад' },
}

export default function HomePage() {
  const router = useRouter()
  const { lang } = useLang()
  const [query, setQuery] = useState('')
  const [topInstitutions, setTopInstitutions] = useState<TopInstitution[]>([])
  const [regions, setRegions] = useState<Region[]>([])

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

  useEffect(() => {
    const h = { 'ngrok-skip-browser-warning': '1' }
    fetch(`${API_BASE}/institutions?sortBy=rating&limit=6`, { headers: h })
      .then(r => r.json()).then(d => setTopInstitutions(d.data ?? [])).catch(() => {})
    fetch(`${API_BASE}/geo/regions`, { headers: h })
      .then(r => r.json()).then(d => setRegions(d.data ?? [])).catch(() => {})
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search')
  }

  const ui = {
    heroEyebrow:  { uz: "O'zbekiston №1 ta'lim platformasi", ru: 'Платформа образования №1 в Узбекистане' },
    heroTitle1:   { uz: "Eng yaxshi",          ru: 'Лучшие' },
    heroTitle2:   { uz: "ta'lim muassasasi",   ru: 'учебные заведения' },
    heroTitle3:   { uz: "ni toping",           ru: 'Узбекистана' },
    heroSub:      { uz: "Haqiqiy sharhlar asosida maktab, o'quv markaz yoki kurs tanlang", ru: 'Выбирайте школу, учебный центр или курс на основе реальных отзывов' },
    searchHolder: { uz: "Muassasa nomi, fan, shahar... (Najot, Python, Toshkent)", ru: "Название, предмет, город... (Najot, Python, Ташкент)" },
    searchBtn:    { uz: 'Qidirish', ru: 'Найти' },
    step1t:       { uz: 'Qidiring',    ru: 'Найдите' },
    step1d:       { uz: "Nomi, turi yoki shahar bo'yicha toping", ru: 'По названию, типу или городу' },
    step2t:       { uz: 'Solishtiring', ru: 'Сравните' },
    step2d:       { uz: "Reyting, narx va sharhlarni ko'ring", ru: 'Смотрите рейтинги, цены и отзывы' },
    step3t:       { uz: 'Tanlang',     ru: 'Выберите' },
    step3d:       { uz: "Haqiqiy sharhlar asosida qaror qiling", ru: 'Примите решение на основе реальных отзывов' },
    catTitle:     { uz: "Qaysi turni qidiryapsiz?", ru: 'Что вы ищете?' },
    regionTitle:  { uz: "Viloyat bo'yicha qidiring", ru: 'Поиск по региону' },
    regionSub:    { uz: "O'zbekistonning barcha hududlarida qidiring", ru: 'Ищите по всем регионам Узбекистана' },
    cityTitle:    { uz: "Shahar bo'yicha qidiring", ru: 'Поиск по городу' },
    cityAll:      { uz: 'Barcha viloyatlar', ru: 'Все регионы' },
    inst:         { uz: "ta muassasa", ru: 'учреждений' },
    topTitle:     { uz: 'Eng yuqori reytingli', ru: 'Лучшие по рейтингу' },
    seeAll:       { uz: "Barchasini ko'rish", ru: 'Смотреть все' },
    noReview:     { uz: "Sharh yo'q",     ru: 'Нет отзывов' },
    verified:     { uz: 'Tasdiqlangan',   ru: 'Подтверждено' },
    statsTitle:   { uz: 'Nima uchun EduReyting?', ru: 'Почему EduReyting?' },
    ctaTitle:     { uz: "Ro'yxatdan o'tmadingizmi?", ru: 'Ещё не зарегистрированы?' },
    ctaSub:       { uz: "SMS orqali kirish — parol kerak emas. Muassasalarni saqlang, sharh yozing.", ru: 'Вход через SMS — без пароля. Сохраняйте и оставляйте отзывы.' },
    ctaBtn:       { uz: 'Bepul kirish', ru: 'Войти бесплатно' },
    comingSoon:   { uz: 'Tez kunda', ru: 'Скоро' },
    students:     { uz: "o'quvchi", ru: 'учеников' },
  }

  const QUICK_TYPES = [
    { type: 'COURSE_CENTER', icon: '✏️', uz: "O'quv markazlar", ru: 'Учебные центры', active: true },
    { type: 'SCHOOL',        icon: '📚', uz: 'Maktablar',        ru: 'Школы',          active: true },
    { type: 'IT_SCHOOL',     icon: '💻', uz: 'IT maktablar',     ru: 'IT школы',       active: false },
    { type: 'UNIVERSITY',    icon: '🎓', uz: 'Universitetlar',   ru: 'Университеты',   active: false },
    { type: 'LANGUAGE_CENTER',icon:'🌐', uz: 'Til markazlari',   ru: 'Языковые',       active: false },
    { type: 'KINDERGARTEN',  icon: '🎨', uz: "Bog'chalar",       ru: 'Детсады',        active: false },
  ]

  const CATEGORIES = [
    { type: 'COURSE_CENTER',   icon: '✏️', color: 'bg-blue-50   border-blue-200   text-blue-700',   active: true  },
    { type: 'SCHOOL',          icon: '📚', color: 'bg-green-50  border-green-200  text-green-700',  active: true  },
    { type: 'IT_SCHOOL',       icon: '💻', color: 'bg-purple-50 border-purple-200 text-purple-700', active: false },
    { type: 'LANGUAGE_CENTER', icon: '🌐', color: 'bg-cyan-50   border-cyan-200   text-cyan-700',   active: false },
    { type: 'UNIVERSITY',      icon: '🎓', color: 'bg-amber-50  border-amber-200  text-amber-700',  active: false },
    { type: 'KINDERGARTEN',    icon: '🎨', color: 'bg-pink-50   border-pink-200   text-pink-700',   active: false },
    { type: 'SPORTS_SCHOOL',   icon: '⚽', color: 'bg-orange-50 border-orange-200 text-orange-700', active: false },
    { type: 'LYCEUM',          icon: '🏫', color: 'bg-teal-50   border-teal-200   text-teal-700',   active: false },
  ]

  const STATS = [
    { value: '500+',    icon: '🏫', uz: "Ta'lim muassasalari", ru: 'Учебных заведений' },
    { value: '10 000+', icon: '💬', uz: 'Haqiqiy sharhlar',    ru: 'Реальных отзывов' },
    { value: '14',      icon: '📍', uz: 'Viloyat',             ru: 'Регионов' },
    { value: '50 000+', icon: '👥', uz: 'Oylik foydalanuvchilar', ru: 'Пользователей/мес' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-hero-gradient px-4 py-16 text-white sm:py-24">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Eyebrow */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            🇺🇿 {t(lang, ui.heroEyebrow)}
          </div>

          <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            {t(lang, ui.heroTitle1)}{' '}
            <span className="relative text-yellow-300">
              {t(lang, ui.heroTitle2)}
              <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 200 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 3 Q50 0 100 3 Q150 6 200 3" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7"/>
              </svg>
            </span>{' '}
            {lang === 'uz' ? t(lang, ui.heroTitle3) : ''}
          </h1>

          <p className="mb-8 text-base text-primary-100 sm:text-lg max-w-xl mx-auto leading-relaxed">
            {t(lang, ui.heroSub)}
          </p>

          {/* Search box */}
          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-white/10">
              <div className="flex flex-1 items-center gap-2 rounded-xl px-3">
                <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t(lang, ui.searchHolder)}
                  className="flex-1 bg-transparent py-3 text-gray-900 outline-none placeholder:text-gray-400 text-sm sm:text-base"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700 active:scale-95 sm:text-base"
              >
                {t(lang, ui.searchBtn)}
              </button>
            </div>
          </form>

          {/* Quick type chips */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {QUICK_TYPES.map(qt => qt.active ? (
              <Link
                key={qt.type}
                href={`/search?type=${qt.type}`}
                className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/25"
              >
                <span>{qt.icon}</span>
                {lang === 'uz' ? qt.uz : qt.ru}
              </Link>
            ) : (
              <span
                key={qt.type}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/35 cursor-not-allowed select-none"
              >
                <span className="grayscale opacity-50">{qt.icon}</span>
                {lang === 'uz' ? qt.uz : qt.ru}
                <span className="ml-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/50">
                  {t(lang, ui.comingSoon)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { n: '1', icon: '🔍', t: ui.step1t, d: ui.step1d, color: 'bg-blue-50 text-blue-600' },
              { n: '2', icon: '⭐', t: ui.step2t, d: ui.step2d, color: 'bg-amber-50 text-amber-600' },
              { n: '3', icon: '✅', t: ui.step3t, d: ui.step3d, color: 'bg-green-50 text-green-600' },
            ].map(step => (
              <div key={step.n} className="relative flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm ${step.color}`}>
                  {step.icon}
                </div>
                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-black text-white">
                  {step.n}
                </div>
                <h3 className="mb-1.5 text-lg font-bold text-gray-900">{t(lang, step.t)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(lang, step.d)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black text-gray-900 sm:text-3xl">{t(lang, ui.catTitle)}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map(cat => {
              const label = TYPE_LABELS[cat.type]
              if (cat.active) {
                return (
                  <Link
                    key={cat.type}
                    href={`/search?type=${cat.type}`}
                    className={`group flex flex-col items-center gap-3 rounded-2xl border-2 bg-white p-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${cat.color.split(' ').slice(1).join(' ')} hover:border-current`}
                  >
                    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${cat.color.split(' ')[0]} shadow-sm`}>
                      {cat.icon}
                    </span>
                    <span className={`text-sm font-bold ${cat.color.split(' ')[2]}`}>
                      {label ? t(lang, label) : cat.type}
                    </span>
                  </Link>
                )
              }
              return (
                <div
                  key={cat.type}
                  className="relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-white p-5 text-center opacity-55"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-3xl grayscale">
                    {cat.icon}
                  </span>
                  <span className="text-sm font-semibold text-gray-400">
                    {label ? t(lang, label) : cat.type}
                  </span>
                  <span className="absolute right-3 top-3 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                    {t(lang, ui.comingSoon)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Regions ───────────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900 sm:text-3xl">
                🗺️ {t(lang, ui.regionTitle)}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t(lang, ui.regionSub)}
              </p>
            </div>
            <Link href="/search" className="hidden text-sm font-semibold text-primary-600 hover:text-primary-700 sm:block">
              {t(lang, ui.seeAll)} →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {/* All regions card */}
            <Link
              href="/search"
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-primary-200 bg-primary-50 p-4 text-center transition-all hover:border-primary-400 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-2xl">🇺🇿</span>
              <div>
                <div className="text-sm font-bold text-primary-700 leading-tight">
                  {t(lang, ui.cityAll)}
                </div>
                <div className="mt-0.5 text-[11px] text-primary-500">O'zbekiston</div>
              </div>
            </Link>

            {regions.map(region => {
              const shortName = lang === 'ru'
                ? region.nameRu.replace('Республика ', '').replace(' область', '')
                : region.nameUz.replace(' viloyati', '').replace(" Respublikasi", '').replace(" Respublikası", '')
              return (
                <Link
                  key={region.id}
                  href={`/search?regionId=${region.id}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-gray-100 bg-white p-4 text-center shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-2xl transition-colors group-hover:bg-primary-50">
                    {region.type === 'city' ? '🏙️' : '🏔️'}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-gray-800 leading-tight">{shortName}</div>
                    <div className="mt-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 inline-block group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                      {region.institutionCount > 0
                        ? `${region.institutionCount} ${t(lang, ui.inst)}`
                        : t(lang, ui.comingSoon)
                      }
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Top institutions ──────────────────────────────────────────────── */}
      {topInstitutions.length > 0 && (
        <section className="bg-gray-50 px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 sm:text-3xl">
                  ⭐ {t(lang, ui.topTitle)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {t(lang, { uz: "Eng ko'p baho olgan muassasalar", ru: 'Учреждения с наивысшим рейтингом' })}
                </p>
              </div>
              <Link
                href="/search?sortBy=rating"
                className="hidden text-sm font-semibold text-primary-600 hover:text-primary-700 sm:block"
              >
                {t(lang, ui.seeAll)} →
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topInstitutions.map((inst, idx) => {
                const typeLabel = TYPE_LABELS[inst.type]
                const name = lang === 'ru' && inst.nameRu ? inst.nameRu : inst.nameUz
                return (
                  <Link
                    key={inst.id}
                    href={`/institutions/${inst.slug}`}
                    className="group card flex flex-col p-5"
                  >
                    {/* Top row */}
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="badge bg-primary-50 text-primary-700">
                        {typeLabel ? t(lang, typeLabel) : inst.type}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {idx < 3 && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-700">
                            #{idx + 1}
                          </span>
                        )}
                        {inst.isVerified && (
                          <span className="badge bg-emerald-50 text-emerald-700">✓</span>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="mb-1 font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug text-base">
                      {name}
                    </h3>

                    {/* City */}
                    {inst.city && (
                      <p className="mb-3 flex items-center gap-1 text-xs text-gray-500">
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        {lang === 'ru' && inst.city.nameRu ? inst.city.nameRu : inst.city.nameUz}
                      </p>
                    )}

                    {/* Students */}
                    {inst.details?.studentCount && (
                      <p className="mb-3 flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <span>👥</span>
                        {inst.details.studentCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')}+ {t(lang, ui.students)}
                      </p>
                    )}

                    {/* Bottom */}
                    <div className="mt-auto flex items-center justify-between pt-1">
                      {inst.avgRating ? (
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={inst.avgRating} size="sm" />
                          <span className="text-xs font-bold text-gray-900">{inst.avgRating.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">({inst.reviewCount})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{t(lang, ui.noReview)}</span>
                      )}
                      {inst.pricing?.monthlyMin && (
                        <span className="text-xs font-bold text-primary-700 bg-primary-50 rounded-lg px-2 py-1">
                          {formatUzs(inst.pricing.monthlyMin)}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="mt-6 text-center sm:hidden">
              <Link href="/search?sortBy=rating" className="btn-secondary text-sm">
                {t(lang, ui.seeAll)} →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="bg-hero-gradient px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-black sm:text-3xl">
            {t(lang, ui.statsTitle)}
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map(stat => (
              <div key={stat.value} className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur-sm">
                  {stat.icon}
                </div>
                <div className="text-3xl font-black text-yellow-300">{stat.value}</div>
                <div className="text-sm text-primary-100 leading-tight">
                  {lang === 'uz' ? stat.uz : stat.ru}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50 text-5xl shadow-sm">
            🎓
          </div>
          <h2 className="mb-3 text-2xl font-black text-gray-900 sm:text-3xl">
            {t(lang, ui.ctaTitle)}
          </h2>
          <p className="mb-8 text-gray-500 leading-relaxed">
            {t(lang, ui.ctaSub)}
          </p>
          <Link href="/auth" className="btn-primary px-10 py-4 text-base shadow-lg">
            {t(lang, ui.ctaBtn)}
          </Link>
          <p className="mt-4 text-xs text-gray-400">
            {t(lang, { uz: 'SMS orqali — parol kerak emas', ru: 'Через SMS — без пароля' })}
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-gray-100 bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/" className="flex items-center gap-2.5 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-base">🎓</div>
                <span className="font-black text-gray-900">EduReyting<span className="text-primary-600">.uz</span></span>
              </Link>
              <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                {t(lang, { uz: "O'zbekistondagi ta'lim muassasalari haqida haqiqiy sharhlar", ru: 'Реальные отзывы об учебных заведениях Узбекистана' })}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-500 sm:justify-end">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {t(lang, { uz: 'Qidiruv', ru: 'Поиск' })}
                </span>
                <Link href="/search?type=COURSE_CENTER" className="hover:text-primary-600 transition-colors">
                  {t(lang, { uz: "O'quv markazlar", ru: 'Учебные центры' })}
                </Link>
                <Link href="/search?type=SCHOOL" className="hover:text-primary-600 transition-colors">
                  {t(lang, { uz: 'Maktablar', ru: 'Школы' })}
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {t(lang, { uz: 'Aloqa', ru: 'Контакты' })}
                </span>
                <a href="https://t.me/edureyting" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors">
                  Telegram
                </a>
                <Link href="/auth" className="hover:text-primary-600 transition-colors">
                  {t(lang, { uz: 'Kirish', ru: 'Войти' })}
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            © 2025 EduReyting.uz — {t(lang, { uz: 'Barcha huquqlar himoyalangan', ru: 'Все права защищены' })}
          </div>
        </div>
      </footer>
    </div>
  )
}
