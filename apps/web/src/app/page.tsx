'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Search, X, ArrowRight, MapPin, Users, Star,
  PencilLine, BookOpen, Laptop, Globe, GraduationCap,
  Palette, CheckCircle2, Building2, MessageSquare,
  BarChart3, Send,
} from 'lucide-react'
import Header from '@/components/shared/Header'
import StarRating from '@/components/shared/StarRating'
import Logo from '@/components/shared/Logo'
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
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
function fmtUzs(n: number) {
  return `${fmt(n)} so'm`
}

const TYPE_META: Record<string, {
  uz: string; ru: string
  icon: React.ElementType
  desc: { uz: string; ru: string }
  color: string
}> = {
  COURSE_CENTER:   {
    uz: "O'quv markaz",  ru: 'Учебный центр', icon: PencilLine,
    desc: { uz: "Fan, til, kasb — istalgan kurslar", ru: 'Курсы по любым предметам' },
    color: 'text-blue-600 dark:text-blue-400',
  },
  SCHOOL:          {
    uz: 'Maktab',        ru: 'Школа',          icon: BookOpen,
    desc: { uz: "Davlat va xususiy maktablar",      ru: 'Государственные и частные' },
    color: 'text-green-600 dark:text-green-400',
  },
  IT_SCHOOL:       {
    uz: 'IT maktab',     ru: 'IT школа',       icon: Laptop,
    desc: { uz: "Dasturlash, dizayn, AI",           ru: 'Программирование, дизайн, AI' },
    color: 'text-violet-600 dark:text-violet-400',
  },
  LANGUAGE_CENTER: {
    uz: 'Til markazi',   ru: 'Языковой центр', icon: Globe,
    desc: { uz: "Ingliz, rus, xitoy va boshqalar",  ru: 'Английский, китайский и др.' },
    color: 'text-cyan-600 dark:text-cyan-400',
  },
  UNIVERSITY:      {
    uz: 'Universitet',   ru: 'Университет',    icon: GraduationCap,
    desc: { uz: "Oliy ta'lim muassasalari",         ru: 'Высшее образование' },
    color: 'text-amber-600 dark:text-amber-400',
  },
  KINDERGARTEN:    {
    uz: "Bog'cha",       ru: 'Детский сад',    icon: Palette,
    desc: { uz: "Bolalar uchun maktabgacha ta'lim", ru: 'Дошкольное образование' },
    color: 'text-pink-600 dark:text-pink-400',
  },
}

const ACTIVE_TYPES  = ['COURSE_CENTER', 'SCHOOL', 'IT_SCHOOL', 'LANGUAGE_CENTER']
const COMING_TYPES  = ['UNIVERSITY', 'KINDERGARTEN']

export default function HomePage() {
  const router  = useRouter()
  const { lang } = useLang()
  const [query, setQuery]   = useState('')
  const [top, setTop]       = useState<TopInstitution[]>([])
  const [regions, setRegions] = useState<Region[]>([])

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
  const uz  = lang === 'uz'

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

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <Header />

      {/* ═══════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-950 via-primary-800 to-primary-700 px-4 py-20 text-white sm:py-28">
        {/* Subtle texture circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/[0.03] blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl text-center">
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" aria-hidden />
            {uz ? "O'zbekiston №1 ta'lim platformasi" : "Платформа образования №1 в Узбекистане"}
          </div>

          {/* Headline */}
          <h1 className="mb-5 text-[1.9rem] font-bold leading-[1.15] tracking-tight text-white sm:text-5xl">
            {uz ? (
              <>Eng yaxshi{' '}<span className="text-sky-300">ta&apos;lim muassasasi</span>ni toping</>
            ) : (
              <>Найдите лучшее{' '}<span className="text-sky-300">учебное заведение</span></>
            )}
          </h1>

          <p className="mx-auto mb-10 max-w-lg text-base leading-relaxed text-white/65 sm:text-lg">
            {uz
              ? "Haqiqiy sharhlar asosida maktab, o'quv markaz yoki kurs tanlang"
              : 'Выбирайте школу, курс или центр на основе реальных отзывов'}
          </p>

          {/* Search */}
          <form onSubmit={handleSearch}>
            <div className="flex gap-2 rounded-2xl bg-white/10 p-2 shadow-pop ring-1 ring-white/15 backdrop-blur-sm">
              <div className="flex flex-1 items-center gap-3 pl-3">
                <Search className="h-5 w-5 shrink-0 text-white/50" aria-hidden />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={uz
                    ? "Muassasa nomi, fan yoki shahar..."
                    : "Название, предмет или город..."}
                  className="flex-1 bg-transparent py-2 text-base text-white outline-none placeholder:text-white/40"
                  aria-label={uz ? 'Qidirish' : 'Поиск'}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="rounded p-1 text-white/40 transition-colors hover:text-white/70"
                    style={{ minHeight: 0, minWidth: 0 }}
                    aria-label="Tozalash"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-white px-6 py-2.5 text-base font-semibold text-primary-700 transition-colors hover:bg-primary-50 active:scale-[0.98]"
              >
                {uz ? 'Qidirish' : 'Найти'}
              </button>
            </div>
          </form>

          {/* Quick filters */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {ACTIVE_TYPES.map(type => {
              const m = TYPE_META[type]!
              return (
                <Link
                  key={type}
                  href={`/search?type=${type}`}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <m.icon className="h-4 w-4" aria-hidden />
                  {uz ? m.uz : m.ru}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          HOW IT WORKS — 3 steps
          ═══════════════════════════════════════════ */}
      <section className="bg-surface px-4 py-16">
        <div className="section">
          <div className="mb-12 text-center">
            <h2 className="section-title">{uz ? 'Qanday foydalanasiz?' : 'Как пользоваться?'}</h2>
            <p className="section-sub">
              {uz ? "Uch qadamda eng mos muassasani toping" : 'Найдите подходящее заведение за три шага'}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                n: '01', icon: Search,
                title: { uz: 'Qidiring', ru: 'Найдите' },
                desc:  { uz: "Muassasa nomi, fan yoki shahar bo'yicha qidiring", ru: 'Ищите по названию, предмету или городу' },
              },
              {
                n: '02', icon: BarChart3,
                title: { uz: 'Solishtiring', ru: 'Сравните' },
                desc:  { uz: "Reytinglar, narxlar va sharhlarni taqqoslang", ru: 'Сравните рейтинги, цены и отзывы' },
              },
              {
                n: '03', icon: CheckCircle2,
                title: { uz: 'Tanlang', ru: 'Выберите' },
                desc:  { uz: "Eng mos variantni tanlang va bog'laning", ru: 'Выберите лучший вариант и свяжитесь' },
              },
            ].map((step, i) => (
              <div key={step.n} className="card p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-xs font-semibold tabular-nums text-faint">{step.n}</span>
                  <div className="h-px flex-1 bg-line" aria-hidden />
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <h3 className="mb-2 text-base font-semibold text-ink">{t(lang, step.title)}</h3>
                <p className="text-sm leading-relaxed text-mute">{t(lang, step.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CATEGORIES
          ═══════════════════════════════════════════ */}
      <section className="bg-canvas px-4 py-16">
        <div className="section">
          <div className="mb-10 text-center">
            <h2 className="section-title">
              {uz ? "Qaysi ta'lim turini qidiryapsiz?" : 'Какое образование вам нужно?'}
            </h2>
            <p className="section-sub">{uz ? "Quyidagilardan birini tanlang" : 'Выберите подходящую категорию'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {ACTIVE_TYPES.map(type => {
              const m = TYPE_META[type]!
              return (
                <Link
                  key={type}
                  href={`/search?type=${type}`}
                  className="card group flex flex-col items-center gap-3 p-5 text-center sm:p-6"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 transition-colors group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 ${m.color}`}>
                    <m.icon className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink leading-snug">{uz ? m.uz : m.ru}</p>
                    <p className="mt-1 text-xs text-mute leading-snug">{uz ? m.desc.uz : m.desc.ru}</p>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Coming soon */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COMING_TYPES.map(type => {
              const m = TYPE_META[type]!
              return (
                <div
                  key={type}
                  className="flex items-center gap-4 rounded-xl border border-dashed border-line bg-surface px-5 py-4 opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                    <m.icon className="h-5 w-5 text-faint" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{uz ? m.uz : m.ru}</p>
                    <p className="text-xs text-faint">{uz ? 'Tez kunda' : 'Скоро'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TOP INSTITUTIONS
          ═══════════════════════════════════════════ */}
      {top.length > 0 && (
        <section className="bg-surface px-4 py-16">
          <div className="section">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="section-title">{uz ? 'Eng yuqori reytingli' : 'Лучшие по рейтингу'}</h2>
                <p className="section-sub">
                  {uz
                    ? "Foydalanuvchilar tomonidan eng yuqori baho olgan muassasalar"
                    : 'Учреждения с наивысшими оценками пользователей'}
                </p>
              </div>
              <Link
                href="/search?sortBy=rating"
                className="flex items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {uz ? "Barchasini ko'rish" : 'Смотреть все'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {top.map((inst, idx) => {
                const m       = TYPE_META[inst.type]
                const name    = uz || !inst.nameRu ? inst.nameUz : inst.nameRu
                const city    = inst.city ? (uz || !inst.city.nameRu ? inst.city.nameUz : inst.city.nameRu) : null
                const IconEl  = m?.icon ?? Building2

                return (
                  <Link
                    key={inst.id}
                    href={`/institutions/${inst.slug}`}
                    className="card group flex flex-col p-5"
                  >
                    {/* Top row */}
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="badge-sm bg-surface-2 text-mute">
                        <IconEl className="h-3.5 w-3.5" aria-hidden />
                        {m ? (uz ? m.uz : m.ru) : inst.type}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {idx < 3 && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-white tabular-nums">
                            #{idx + 1}
                          </span>
                        )}
                        {inst.isVerified && (
                          <span className="verified-badge">
                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                            {uz ? 'Tasdiqlangan' : 'Подтв.'}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-snug text-ink transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      {name}
                    </h3>

                    {city && (
                      <div className="mb-2 flex items-center gap-1.5 text-sm text-mute">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {city}
                      </div>
                    )}

                    {inst.details?.studentCount && (
                      <div className="mb-3 flex items-center gap-1.5 text-sm text-mute">
                        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {fmt(inst.details.studentCount)}+ {uz ? "o'quvchi" : 'учеников'}
                      </div>
                    )}

                    {(inst.details?.programs?.length ?? 0) > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {inst.details!.programs!.slice(0, 3).map(p => (
                          <span key={p} className="badge-sm bg-surface-2 text-mute">{p}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
                      {inst.avgRating ? (
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={inst.avgRating} size="sm" />
                          <span className="text-xs text-faint tabular-nums">({inst.reviewCount})</span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-faint">
                          <Star className="h-3.5 w-3.5" aria-hidden />
                          {uz ? "Sharh yo'q" : 'Нет отзывов'}
                        </span>
                      )}
                      {inst.pricing?.monthlyMin && (
                        <span className="price-badge">{fmtUzs(inst.pricing.monthlyMin)}</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          REGIONS
          ═══════════════════════════════════════════ */}
      {regions.length > 0 && (
        <section className="bg-canvas px-4 py-16">
          <div className="section">
            <div className="mb-10 text-center">
              <h2 className="section-title">{uz ? "Shahringizni tanlang" : 'Выберите ваш город'}</h2>
              <p className="section-sub">
                {uz
                  ? "O'zbekistonning barcha hududlarida muassasalarni toping"
                  : 'Найдите учреждения в любом регионе Узбекистана'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Link
                href="/search"
                className="card group flex flex-col items-center gap-2 p-4 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100 dark:bg-primary-500/10 dark:text-primary-400">
                  <MapPin className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-ink leading-tight">
                  {uz ? "Barcha hududlar" : 'Все регионы'}
                </p>
              </Link>

              {regions.map(region => {
                const name = uz
                  ? region.nameUz.replace(' viloyati', '').replace(' Respublikasi', '').replace(' Respublikası', '')
                  : region.nameRu.replace('Республика ', '').replace(' область', '')
                return (
                  <Link
                    key={region.id}
                    href={`/search?regionId=${region.id}`}
                    className="card group flex flex-col items-center gap-2 p-4 text-center"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-mute transition-colors group-hover:bg-primary-50 group-hover:text-primary-600 dark:group-hover:bg-primary-500/10 dark:group-hover:text-primary-400">
                      <Building2 className="h-5 w-5" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-ink leading-tight">{name}</p>
                    {region.institutionCount > 0 && (
                      <span className="badge-sm bg-surface-2 text-faint tabular-nums">{region.institutionCount} ta</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════ */}
      <section className="bg-primary-950 px-4 py-16 text-white">
        <div className="section">
          <h2 className="mb-12 text-center text-2xl font-bold text-white sm:text-3xl">
            {uz ? 'Nima uchun EDUBAHO?' : 'Почему EDUBAHO?'}
          </h2>
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { v: '500+',    icon: Building2,      uz: "Ta'lim muassasalari", ru: 'Учебных заведений' },
              { v: '10 000+', icon: MessageSquare,  uz: 'Haqiqiy sharhlar',    ru: 'Реальных отзывов' },
              { v: '14',      icon: MapPin,         uz: 'Viloyat qamrovi',     ru: 'Регионов' },
              { v: '50 000+', icon: Users,          uz: 'Oylik foydalanuvchi', ru: 'Пользователей/мес' },
            ].map(s => (
              <div key={s.v} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <s.icon className="h-6 w-6 text-white/70" aria-hidden />
                </div>
                <dt className="text-3xl font-bold tabular-nums text-sky-300">{s.v}</dt>
                <dd className="text-sm leading-tight text-white/55">{uz ? s.uz : s.ru}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA — Register
          ═══════════════════════════════════════════ */}
      <section className="bg-surface px-4 py-16">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-line bg-canvas p-8 text-center">
            <div className="mx-auto mb-5 flex items-center justify-center">
              <Logo size={48} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-ink">
              {uz ? "Bepul ro'yxatdan o'ting" : 'Зарегистрируйтесь бесплатно'}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-mute">
              {uz
                ? "SMS orqali kirish — parol kerak emas. Muassasalarni saqlang, sharh yozing va solishtirib ko'ring."
                : 'Вход через SMS — без пароля. Сохраняйте, пишите отзывы и сравнивайте.'}
            </p>

            <div className="mb-6 flex flex-col gap-2 text-left">
              {[
                { icon: Star,          uz: "Sevimli muassasalarni saqlang",     ru: 'Сохраняйте любимые учреждения' },
                { icon: PencilLine,    uz: "Sharh yozing va boshqalarga yordam bering", ru: 'Пишите отзывы и помогайте другим' },
                { icon: BarChart3,     uz: "Ikki muassasani solishtiring",       ru: 'Сравнивайте два учреждения' },
              ].map(b => (
                <div key={b.uz} className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3">
                  <b.icon className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />
                  <span className="text-sm text-ink">{uz ? b.uz : b.ru}</span>
                </div>
              ))}
            </div>

            <a
              href="/auth"
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#229ED9] py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#1a8ec4] active:scale-[0.98]"
            >
              {/* Telegram icon */}
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/>
              </svg>
              {uz ? 'Telegram orqali kirish' : 'Войти через Telegram'}
            </a>
            <p className="mt-3 text-xs text-faint">
              {uz ? 'SMS kod ham qo‘llab-quvvatlanadi' : 'SMS-код также поддерживается'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}
      <footer className="border-t border-line bg-primary-950 px-4 pt-12 pb-8">
        <div className="section">
          <div className="mb-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

            {/* Brand */}
            <div className="lg:col-span-2">
              <Link href="/" className="mb-4 inline-flex items-center transition-opacity hover:opacity-80">
                <Logo size={36} inverted />
              </Link>
              <p className="mb-5 max-w-sm text-sm leading-relaxed text-white/45">
                {uz
                  ? "O'zbekistondagi maktab, o'quv markaz va kurslarni haqiqiy sharhlar asosida qidiring va solishtiring."
                  : 'Ищите и сравнивайте школы, курсы и учебные центры Узбекистана на основе реальных отзывов.'}
              </p>
              <a
                href="https://t.me/TrustboxInc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white/90"
              >
                <Send className="h-4 w-4 text-[#229ED9]" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">@TrustboxInc</p>
                  <p className="text-xs text-white/45">
                    {uz ? "Murojaat va qo‘llab-quvvatlash" : 'Поддержка и обратная связь'}
                  </p>
                </div>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-white/30" aria-hidden />
              </a>
            </div>

            {/* Categories */}
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                {uz ? "Kategoriyalar" : 'Категории'}
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  { href: '/search?type=IT_SCHOOL',       label: { uz: "IT maktablar",    ru: 'IT школы' } },
                  { href: '/search?type=LANGUAGE_CENTER', label: { uz: "Til markazlari",  ru: 'Языковые центры' } },
                  { href: '/search?type=SCHOOL',          label: { uz: "Maktablar",       ru: 'Школы' } },
                  { href: '/search?type=COURSE_CENTER',   label: { uz: "O'quv markazlar", ru: 'Учебные центры' } },
                  { href: '/search?type=LYCEUM',          label: { uz: "Litseylar",       ru: 'Лицеи' } },
                ].map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/45 transition-colors hover:text-white">
                      {uz ? l.label.uz : l.label.ru}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Platform */}
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                {uz ? "Platforma" : 'Платформа'}
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  { href: '/search',  label: { uz: "Qidirish",             ru: 'Поиск' } },
                  { href: '/compare', label: { uz: "Solishtirish",          ru: 'Сравнение' } },
                  { href: '/auth',    label: { uz: "Kirish / Ro'yxat",     ru: 'Войти / Регистрация' } },
                  { href: '/terms',   label: { uz: "Foydalanish shartlari", ru: 'Условия использования' } },
                ].map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/45 transition-colors hover:text-white">
                      {uz ? l.label.uz : l.label.ru}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/30">
            <span>© 2025 EDUBAHO.uz — {uz ? 'Barcha huquqlar himoyalangan' : 'Все права защищены'}</span>
            <a
              href="https://t.me/TrustboxInc"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white/40 transition-colors hover:text-white/70"
            >
              {uz ? 'Yaratuvchi:' : 'Разработчик:'} @TrustboxInc
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
