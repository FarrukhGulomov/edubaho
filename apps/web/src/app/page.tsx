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

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}
function fmtUzs(n: number) {
  return `${fmt(n)} so'm`
}

const TYPE_LABELS: Record<string, { uz: string; ru: string; icon: string; desc: { uz: string; ru: string } }> = {
  COURSE_CENTER:   { uz: "O'quv markaz",  ru: 'Учебный центр', icon: '✏️',
                     desc: { uz: "Fan, til, kasb — istalgan kurslar", ru: 'Курсы по любым предметам' } },
  SCHOOL:          { uz: 'Maktab',        ru: 'Школа',          icon: '📚',
                     desc: { uz: "Davlat va xususiy maktablar",      ru: 'Государственные и частные' } },
  IT_SCHOOL:       { uz: 'IT maktab',     ru: 'IT школа',       icon: '💻',
                     desc: { uz: "Dasturlash, dizayn, AI",           ru: 'Программирование, дизайн, AI' } },
  LANGUAGE_CENTER: { uz: 'Til markazi',   ru: 'Языковой центр', icon: '🌐',
                     desc: { uz: "Ingliz, rus, xitoy va boshqalar",  ru: 'Английский, китайский и др.' } },
  UNIVERSITY:      { uz: 'Universitet',   ru: 'Университет',    icon: '🎓',
                     desc: { uz: "Oliy ta'lim muassasalari",         ru: 'Высшее образование' } },
  KINDERGARTEN:    { uz: "Bog'cha",       ru: 'Детский сад',    icon: '🎨',
                     desc: { uz: "Bolalar uchun maktabgacha ta'lim", ru: 'Дошкольное образование' } },
}

const ACTIVE_TYPES = ['COURSE_CENTER', 'SCHOOL', 'IT_SCHOOL', 'LANGUAGE_CENTER']
const COMING_TYPES = ['UNIVERSITY', 'KINDERGARTEN']

export default function HomePage() {
  const router  = useRouter()
  const { lang } = useLang()
  const [query, setQuery]               = useState('')
  const [topInstitutions, setTop]       = useState<TopInstitution[]>([])
  const [regions, setRegions]           = useState<Region[]>([])

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

  useEffect(() => {
    const h = { 'ngrok-skip-browser-warning': '1' }
    fetch(`${API}/institutions?sortBy=rating&limit=6`, { headers: h })
      .then(r => r.json()).then(d => setTop(d.data ?? [])).catch(() => {})
    fetch(`${API}/geo/regions`, { headers: h })
      .then(r => r.json()).then(d => setRegions(d.data ?? [])).catch(() => {})
  }, [API])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search')
  }

  const uz = lang === 'uz'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      {/* ══════════════════════════════════════════════════════
          HERO — Asosiy qidiruv bloki
          ══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-sky-600 px-4 py-16 text-white sm:py-24">
        {/* Dekorativ doiralar */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">

          {/* Yorliq */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-bold tracking-wide text-white/90 backdrop-blur-sm">
            🇺🇿 {uz ? "O'zbekiston №1 ta'lim platformasi" : "Платформа образования №1 в Узбекистане"}
          </div>

          {/* Sarlavha */}
          <h1 className="mb-5 text-[1.75rem] font-black leading-tight sm:text-4xl md:text-6xl">
            {uz ? (
              <>Eng yaxshi <span className="text-yellow-300">ta&apos;lim muassasasi</span>ni toping</>
            ) : (
              <>Найдите лучшее <span className="text-yellow-300">учебное заведение</span></>
            )}
          </h1>

          <p className="mb-10 text-lg text-primary-100 sm:text-xl max-w-xl mx-auto leading-relaxed">
            {uz
              ? "Haqiqiy sharhlar asosida maktab, o'quv markaz yoki kurs tanlang"
              : 'Выбирайте школу, учебный центр или курс на основе реальных отзывов'}
          </p>

          {/* ── Qidiruv qutisi ── */}
          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="flex gap-2 rounded-3xl bg-white p-2.5 shadow-2xl ring-2 ring-white/20">
              <div className="flex flex-1 items-center gap-3 rounded-2xl px-4">
                <svg className="h-6 w-6 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={uz
                    ? "Muassasa nomi, fan yoki shahar..."
                    : "Название, предмет или город..."}
                  className="flex-1 bg-transparent py-2 text-lg text-gray-900 outline-none placeholder:text-gray-400"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-2xl bg-primary-600 px-7 py-3 text-lg font-black text-white shadow-sm transition-all hover:bg-primary-700 active:scale-95"
              >
                {uz ? 'Qidirish' : 'Найти'}
              </button>
            </div>
          </form>

          {/* Tezkor havolalar */}
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            {ACTIVE_TYPES.map(type => {
              const info = TYPE_LABELS[type]!
              return (
                <Link
                  key={type}
                  href={`/search?type=${type}`}
                  className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-5 py-2.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/25 hover:scale-105"
                >
                  <span className="text-xl">{info.icon}</span>
                  {uz ? info.uz : info.ru}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          Qanday ishlaydi? — 3 qadam
          ══════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="section-title">
              {uz ? '📖 Qanday foydalanasiz?' : '📖 Как пользоваться?'}
            </h2>
            <p className="section-sub">
              {uz ? "Uch qadamda eng mos muassasani toping" : 'Найдите подходящее заведение за три шага'}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                n: '1', icon: '🔍', color: 'from-blue-50 to-sky-50 border-blue-200',
                iconBg: 'bg-blue-100',
                title: { uz: 'Qidiring', ru: 'Найдите' },
                desc:  { uz: "Muassasa nomi, fan yoki shahar bo'yicha qidiring", ru: 'Ищите по названию, предмету или городу' },
              },
              {
                n: '2', icon: '⭐', color: 'from-amber-50 to-yellow-50 border-amber-200',
                iconBg: 'bg-amber-100',
                title: { uz: 'Solishtiring', ru: 'Сравните' },
                desc:  { uz: "Reytinglar, narxlar va haqiqiy sharhlarni taqqoslang", ru: 'Сравните рейтинги, цены и реальные отзывы' },
              },
              {
                n: '3', icon: '✅', color: 'from-green-50 to-emerald-50 border-green-200',
                iconBg: 'bg-green-100',
                title: { uz: 'Tanlang', ru: 'Выберите' },
                desc:  { uz: "Eng mos variantni tanlang va bog'laning", ru: 'Выберите лучший вариант и свяжитесь' },
              },
            ].map(step => (
              <div
                key={step.n}
                className={`relative flex flex-col items-center rounded-3xl border-2 bg-gradient-to-br p-8 text-center ${step.color}`}
              >
                {/* Raqam */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-base font-black text-white shadow-lg">
                  {step.n}
                </div>
                <div className={`mb-5 mt-3 flex h-20 w-20 items-center justify-center rounded-3xl text-5xl shadow-sm ${step.iconBg}`}>
                  {step.icon}
                </div>
                <h3 className="mb-3 text-2xl font-black text-gray-900">{t(lang, step.title)}</h3>
                <p className="text-base text-gray-600 leading-relaxed">{t(lang, step.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          Kategoriyalar — Nima qidiryapsiz?
          ══════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="section-title">
              {uz ? '🏫 Qaysi ta\'lim turini qidiryapsiz?' : '🏫 Какое образование вам нужно?'}
            </h2>
            <p className="section-sub">
              {uz ? "Quyidagilardan birini tanlang" : 'Выберите подходящую категорию'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ACTIVE_TYPES.map(type => {
              const info = TYPE_LABELS[type]!
              const colors: Record<string, string> = {
                COURSE_CENTER:   'border-blue-200   bg-blue-50   text-blue-700   hover:border-blue-400   hover:bg-blue-100',
                SCHOOL:          'border-green-200  bg-green-50  text-green-700  hover:border-green-400  hover:bg-green-100',
                IT_SCHOOL:       'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400 hover:bg-purple-100',
                LANGUAGE_CENTER: 'border-cyan-200   bg-cyan-50   text-cyan-700   hover:border-cyan-400   hover:bg-cyan-100',
              }
              const iconBg: Record<string, string> = {
                COURSE_CENTER:   'bg-blue-100',
                SCHOOL:          'bg-green-100',
                IT_SCHOOL:       'bg-purple-100',
                LANGUAGE_CENTER: 'bg-cyan-100',
              }
              return (
                <Link
                  key={type}
                  href={`/search?type=${type}`}
                  className={`group flex flex-col items-center gap-3 rounded-3xl border-2 bg-white p-4 sm:p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${colors[type]}`}
                >
                  <span className={`flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl text-3xl sm:text-4xl shadow-sm ${iconBg[type]}`}>
                    {info.icon}
                  </span>
                  <div>
                    <div className="text-sm sm:text-lg font-black leading-tight">{uz ? info.uz : info.ru}</div>
                    <div className="mt-1 text-xs sm:text-sm font-medium opacity-75 leading-snug">
                      {uz ? info.desc.uz : info.desc.ru}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Tez kunda keladiganlar */}
          <div className="mt-4 grid grid-cols-1 gap-3 opacity-50 sm:grid-cols-2">
            {COMING_TYPES.map(type => {
              const info = TYPE_LABELS[type]!
              return (
                <div
                  key={type}
                  className="flex items-center gap-3 rounded-3xl border-2 border-dashed border-gray-200 bg-white p-4 sm:p-6"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-3xl grayscale">
                    {info.icon}
                  </span>
                  <div>
                    <div className="text-base font-bold text-gray-600">{uz ? info.uz : info.ru}</div>
                    <div className="mt-0.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-400 inline-block">
                      {uz ? 'Tez kunda' : 'Скоро'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          Eng yuqori reytingli muassasalar
          ══════════════════════════════════════════════════════ */}
      {topInstitutions.length > 0 && (
        <section className="bg-white px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="section-title">⭐ {uz ? 'Eng yuqori reytingli' : 'Лучшие по рейтингу'}</h2>
                <p className="section-sub">
                  {uz
                    ? "Foydalanuvchilar tomonidan eng yuqori baho olgan muassasalar"
                    : 'Учреждения с наивысшими оценками пользователей'}
                </p>
              </div>
              <Link
                href="/search?sortBy=rating"
                className="flex items-center gap-2 rounded-2xl border-2 border-primary-200 px-5 py-3 text-base font-bold text-primary-600 hover:bg-primary-50 transition-all"
              >
                {uz ? "Barchasini ko'rish" : 'Смотреть все'} →
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topInstitutions.map((inst, idx) => {
                const info     = TYPE_LABELS[inst.type]
                const name     = uz || !inst.nameRu ? inst.nameUz : inst.nameRu
                const cityName = inst.city ? (uz || !inst.city.nameRu ? inst.city.nameUz : inst.city.nameRu) : null

                return (
                  <Link
                    key={inst.id}
                    href={`/institutions/${inst.slug}`}
                    className="group card flex flex-col p-6"
                  >
                    {/* Yuqori qator */}
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <span className="badge-sm bg-primary-50 text-primary-700">
                        {info?.icon} {info ? (uz ? info.uz : info.ru) : inst.type}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {idx < 3 && (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-white shadow-sm">
                            #{idx + 1}
                          </span>
                        )}
                        {inst.isVerified && (
                          <span className="verified-badge">✓ {uz ? 'Tasdiqlangan' : 'Подтв.'}</span>
                        )}
                      </div>
                    </div>

                    {/* Nom */}
                    <h3 className="mb-2 text-xl font-black text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug">
                      {name}
                    </h3>

                    {/* Shahar */}
                    {cityName && (
                      <div className="info-row mb-3 text-sm">
                        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        {cityName}
                      </div>
                    )}

                    {/* O'quvchilar */}
                    {inst.details?.studentCount && (
                      <div className="mb-3 inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                        <span>👥</span>
                        {fmt(inst.details.studentCount)}+ {uz ? "o'quvchi" : 'учеников'}
                      </div>
                    )}

                    {/* Dasturlar */}
                    {(inst.details?.programs?.length ?? 0) > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {inst.details!.programs!.slice(0, 3).map(p => (
                          <span key={p} className="rounded-xl bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Reyting + narx */}
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                      {inst.avgRating ? (
                        <div className="flex items-center gap-2">
                          <StarRating rating={inst.avgRating} size="sm" />
                          <span className="text-base font-black text-gray-900">{inst.avgRating.toFixed(1)}</span>
                          <span className="text-sm text-gray-400">({inst.reviewCount})</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">{uz ? "Sharh yo'q" : 'Нет отзывов'}</span>
                      )}
                      {inst.pricing?.monthlyMin && (
                        <span className="price-badge">
                          {fmtUzs(inst.pricing.monthlyMin)}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link href="/search?sortBy=rating" className="btn-secondary">
                {uz ? "Barchasini ko'rish →" : 'Смотреть все →'}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          Viloyatlar bo'yicha
          ══════════════════════════════════════════════════════ */}
      {regions.length > 0 && (
        <section className="bg-slate-50 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="section-title">🗺️ {uz ? "Shahringizni tanlang" : 'Выберите ваш город'}</h2>
              <p className="section-sub">
                {uz
                  ? "O'zbekistonning barcha hududlarida muassasalarni toping"
                  : 'Найдите учреждения в любом регионе Узбекистана'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Link
                href="/search"
                className="flex flex-col items-center gap-3 rounded-3xl border-2 border-primary-300 bg-primary-50 p-5 text-center transition-all hover:border-primary-500 hover:shadow-lg hover:-translate-y-1"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-3xl">🇺🇿</span>
                <div>
                  <div className="text-base font-black text-primary-700">
                    {uz ? "Barcha hududlar" : 'Все регионы'}
                  </div>
                  <div className="mt-1 text-sm text-primary-500">O&apos;zbekiston</div>
                </div>
              </Link>

              {regions.map(region => {
                const name = uz
                  ? region.nameUz.replace(' viloyati', '').replace(' Respublikasi', '').replace(' Respublikası', '')
                  : region.nameRu.replace('Республика ', '').replace(' область', '').replace(' область', '')
                return (
                  <Link
                    key={region.id}
                    href={`/search?regionId=${region.id}`}
                    className="group flex flex-col items-center gap-3 rounded-3xl border-2 border-gray-100 bg-white p-5 text-center shadow-sm transition-all hover:border-primary-300 hover:shadow-lg hover:-translate-y-1"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-3xl transition-all group-hover:bg-primary-50">
                      {region.type === 'city' ? '🏙️' : '🏔️'}
                    </span>
                    <div>
                      <div className="text-base font-bold text-gray-800 leading-tight">{name}</div>
                      {region.institutionCount > 0 ? (
                        <div className="mt-1.5 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors">
                          {region.institutionCount} ta
                        </div>
                      ) : (
                        <div className="mt-1.5 text-xs text-gray-400">{uz ? 'Tez kunda' : 'Скоро'}</div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          Statistika — ishonch belgilari
          ══════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-sky-600 px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-black sm:text-4xl">
            {uz ? '💡 Nima uchun EduReyting?' : '💡 Почему EduReyting?'}
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { v: '500+',    icon: '🏫', uz: "Ta'lim muassasalari", ru: 'Учебных заведений' },
              { v: '10 000+', icon: '💬', uz: 'Haqiqiy sharhlar',    ru: 'Реальных отзывов' },
              { v: '14',      icon: '📍', uz: 'Viloyat qamrovi',     ru: 'Регионов' },
              { v: '50 000+', icon: '👥', uz: 'Oylik foydalanuvchi', ru: 'Пользователей/мес' },
            ].map(s => (
              <div key={s.v} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 text-4xl backdrop-blur-sm">
                  {s.icon}
                </div>
                <div className="text-4xl font-black text-yellow-300">{s.v}</div>
                <div className="text-base text-primary-100 leading-tight font-medium">
                  {uz ? s.uz : s.ru}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA — Ro'yxatdan o'tish
          ══════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl bg-gradient-to-br from-primary-50 to-sky-50 border-2 border-primary-100 p-10 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-md text-6xl">
              🎓
            </div>
            <h2 className="mb-3 text-3xl font-black text-gray-900">
              {uz ? "Bepul ro'yxatdan o'ting" : 'Зарегистрируйтесь бесплатно'}
            </h2>
            <p className="mb-3 text-base text-gray-500 leading-relaxed">
              {uz
                ? "SMS orqali kirish — parol kerak emas. Muassasalarni saqlang, sharh yozing va solishtirib ko'ring."
                : 'Вход через SMS — без пароля. Сохраняйте, пишите отзывы и сравнивайте.'}
            </p>

            {/* Afzalliklar */}
            <div className="mb-8 flex flex-col gap-2.5 text-left">
              {[
                { icon: '⭐', uz: "Sevimli muassasalarni saqlang",     ru: 'Сохраняйте любимые учреждения' },
                { icon: '✍️', uz: "Sharh yozing va boshqalarga yordam bering", ru: 'Пишите отзывы и помогайте другим' },
                { icon: '⇄', uz: "Ikki muassasani solishtiring",       ru: 'Сравнивайте два учреждения' },
              ].map(b => (
                <div key={b.icon} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <span className="text-2xl">{b.icon}</span>
                  <span className="text-base font-semibold text-gray-700">{uz ? b.uz : b.ru}</span>
                </div>
              ))}
            </div>

            <Link href="/auth" className="btn-primary w-full text-lg py-4">
              {uz ? "📱 SMS orqali bepul kirish" : '📱 Войти бесплатно через SMS'}
            </Link>
            <p className="mt-4 text-sm text-gray-400">
              {uz ? "Faqat O'zbekiston raqamlari (+998)" : 'Только номера Узбекистана (+998)'}
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          Footer
          ══════════════════════════════════════════════════════ */}
      <footer className="border-t border-gray-200 bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
            {/* Logo + tavsif */}
            <div className="text-center sm:text-left">
              <Link href="/" className="inline-flex items-center gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 text-xl">🎓</div>
                <span className="text-xl font-black text-gray-900">EduReyting<span className="text-primary-600">.uz</span></span>
              </Link>
              <p className="text-base text-gray-500 max-w-xs leading-relaxed">
                {uz
                  ? "O'zbekistondagi ta'lim muassasalari haqida haqiqiy sharhlar"
                  : 'Реальные отзывы об учебных заведениях Узбекистана'}
              </p>
            </div>

            {/* Havolalar */}
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-6 text-base text-gray-500 sm:justify-end">
              <div className="flex flex-col gap-3">
                <span className="text-sm font-black uppercase tracking-wider text-gray-400">
                  {uz ? "Qidirish" : 'Поиск'}
                </span>
                <Link href="/search?type=COURSE_CENTER" className="hover:text-primary-600 transition-colors font-medium">
                  {uz ? "O'quv markazlar" : 'Учебные центры'}
                </Link>
                <Link href="/search?type=SCHOOL" className="hover:text-primary-600 transition-colors font-medium">
                  {uz ? "Maktablar" : 'Школы'}
                </Link>
                <Link href="/search?type=IT_SCHOOL" className="hover:text-primary-600 transition-colors font-medium">
                  IT maktablar
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-sm font-black uppercase tracking-wider text-gray-400">
                  {uz ? "Aloqa" : 'Контакты'}
                </span>
                <a
                  href="https://t.me/edureyting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary-600 transition-colors font-medium"
                >
                  <span>✈️</span> Telegram
                </a>
                <Link href="/auth" className="hover:text-primary-600 transition-colors font-medium">
                  {uz ? "Kirish / Ro'yxat" : 'Войти / Регистрация'}
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
            © 2025 EduReyting.uz —{' '}
            {uz ? 'Barcha huquqlar himoyalangan' : 'Все права защищены'}
          </div>
        </div>
      </footer>
    </div>
  )
}
