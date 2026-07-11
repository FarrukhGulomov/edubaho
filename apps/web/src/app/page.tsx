'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Search, PencilLine, BookOpen, Palette, School, BadgeCheck, Sparkles,
  MapPin, Users2, UserCheck, Star, ArrowLeftRight, Target, ArrowRight, Lock,
} from 'lucide-react'
import Header from '@/components/shared/Header'
import { RatingHint } from '@/components/shared/StarRating'
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

// Hero'dagi EDULA wizard 1-qadam turlari — match wizard'dagi TYPE_OPTIONS bilan
// bir xil bo'lishi shart (bosilganda /match?type=X 2-qadamdan davom etadi).
// MVP doirasida faqat O'quv markaz bilan ishlaymiz — Maktab/Bog'cha hozircha
// disable (ko'rinadi, lekin bosilmaydi, "Tez orada" belgisi bilan).
const HERO_MATCH_TYPES = [
  { type: 'COURSE_CENTER', Icon: PencilLine, uz: "O'quv markaz", ru: 'Учебный центр', disabled: false },
  { type: 'SCHOOL',        Icon: School,     uz: 'Maktab',       ru: 'Школа',         disabled: true },
  { type: 'KINDERGARTEN',  Icon: Palette,    uz: "Bog'cha",      ru: 'Детский сад',   disabled: true },
]

// Tezkor kategoriya havolalari — endi filtrlashni o'zi qilmaydi, balki
// yagona katalog sahifasiga (/search) yo'naltiradi (duplikatsiyani oldini olish).
// MVP doirasida faqat O'quv markaz aktiv — qolganlari disable.
const QUICK_CATEGORIES = [
  { type: '',              Icon: School,     uz: 'Barchasi',        ru: 'Все',                disabled: false },
  { type: 'COURSE_CENTER', Icon: PencilLine, uz: "O'quv markazlar", ru: 'Учебные центры',      disabled: false },
  { type: 'SCHOOL',        Icon: BookOpen,   uz: 'Maktablar',       ru: 'Школы',               disabled: true },
  { type: 'KINDERGARTEN',  Icon: Palette,    uz: "Bog'chalar",      ru: 'Детские сады',        disabled: true },
]

function fmtNum(n: number) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }
function fmtUzs(n: number) { return `${fmtNum(n)} so'm` }

export default function HomePage() {
  const { lang } = useLang()
  const uz = lang === 'uz'
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [topInstitutions, setTopInstitutions] = useState<InstCard[]>([])
  const [loadingTop, setLoadingTop] = useState(true)

  const { toggle: toggleCompare, isSelected: isCompared } = useCompare()
  const { toggleSave, isSaved } = useSaved()

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

  // Bosh sahifada faqat qisqa "eng yaxshi baholangan" preview — to'liq
  // katalog (filtr/sort/pagination) /search'da, ikki marta yozilmasin
  useEffect(() => {
    fetch(`${API}/institutions?sortBy=rating&limit=6`, {
      headers: { 'ngrok-skip-browser-warning': '1' },
    })
      .then(r => r.json())
      .then(data => setTopInstitutions(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingTop(false))
  }, [API])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      {/* ── EDULA hero — user saytga kirganda BIRINCHI ko'radigan narsa.
             Banner emas: wizard'ning 1-qadami to'g'ridan-to'g'ri shu yerda,
             tur tanlangach /match 2-qadamdan davom etadi. ── */}
      <div className="border-b border-gray-200 bg-white px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-1.5 flex items-center justify-center gap-2 text-primary-600">
            <Target className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="text-sm font-bold uppercase tracking-wide">EDULA</span>
          </div>
          <h1 className="mb-2 text-center text-2xl font-bold leading-tight text-gray-900 sm:text-4xl">
            {uz ? 'Qaysi ta\'lim muassasasi senga mos?' : 'Какое учебное заведение вам подходит?'}
          </h1>
          <p className="mb-6 text-center text-sm text-gray-500 sm:text-base">
            {uz
              ? "Turini tanlang — 1 daqiqada shaxsiy tavsiyalar tayyor bo'ladi"
              : 'Выберите тип — персональные рекомендации будут готовы за 1 минуту'}
          </p>

          {/* Wizard 1-qadam: tur tanlash (bosilsa /match 2-qadamdan davom etadi).
              MVP: faqat O'quv markaz aktiv, qolganlari "Tez orada" bilan disable. */}
          <div className="mb-6 grid grid-cols-3 gap-2.5 sm:gap-4">
            {HERO_MATCH_TYPES.map(o => (
              o.disabled ? (
                <div
                  key={o.type}
                  aria-disabled="true"
                  title={uz ? 'Tez orada' : 'Скоро'}
                  className="relative flex cursor-not-allowed flex-col items-center gap-2.5 rounded-2xl border-2 border-gray-100 bg-gray-50 px-2 py-5 text-center opacity-60 sm:py-7"
                >
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-400 shadow-sm">
                    <Lock className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
                    {uz ? 'Tez orada' : 'Скоро'}
                  </span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 sm:h-14 sm:w-14">
                    <o.Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm font-bold leading-tight text-gray-400 sm:text-base">
                    {uz ? o.uz : o.ru}
                  </span>
                </div>
              ) : (
                <Link
                  key={o.type}
                  href={`/match?type=${o.type}`}
                  className="group flex flex-col items-center gap-2.5 rounded-2xl border-2 border-gray-200 bg-white px-2 py-5 text-center shadow-sm transition-colors hover:border-primary-400 hover:bg-primary-50/40 sm:py-7"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100 sm:h-14 sm:w-14">
                    <o.Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm font-bold leading-tight text-gray-900 sm:text-base">
                    {uz ? o.uz : o.ru}
                  </span>
                </Link>
              )
            ))}
          </div>

          {/* Qidiruv qutisi — /search'ga yo'naltiradi (ikkinchi mustaqil
              filtrlash mexanizmi emas, yagona katalogga kirish nuqtasi) */}
          <p className="mb-2 text-center text-xs font-medium text-gray-400">
            {uz ? "yoki quyidan o'zingiz qidiring" : 'или найдите самостоятельно ниже'}
          </p>
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
              <Search className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={1.75} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={uz ? "Muassasa nomi, fan yoki shahar..." : "Название, предмет или город..."}
                className="min-w-0 flex-1 bg-transparent py-2 text-base text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
            <button type="submit" className="btn-primary shrink-0 whitespace-nowrap px-5 py-2.5 text-sm">
              {uz ? 'Qidirish' : 'Найти'}
            </button>
          </form>

          {/* Tezkor kategoriyalar — to'g'ridan-to'g'ri /search'ga yo'naltiradi.
              MVP: disable qilinganlari ko'rinadi, lekin bosilmaydi. */}
          <div className="mt-4 flex flex-nowrap justify-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {QUICK_CATEGORIES.map(f => (
              f.disabled ? (
                <span
                  key={f.type}
                  aria-disabled="true"
                  title={uz ? 'Tez orada' : 'Скоро'}
                  className="flex h-9 shrink-0 cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-xl bg-gray-50 px-3.5 text-sm font-semibold text-gray-300"
                >
                  <f.Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>{uz ? f.uz : f.ru}</span>
                  <Lock className="h-3 w-3 shrink-0" strokeWidth={2} />
                </span>
              ) : (
                <Link
                  key={f.type}
                  href={f.type ? `/search?type=${f.type}` : '/search'}
                  className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gray-50 px-3.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <f.Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>{uz ? f.uz : f.ru}</span>
                </Link>
              )
            ))}
          </div>
        </div>
      </div>

      {/* ── Eng yaxshi baholangan muassasalar — qisqa preview, to'liq
             katalog emas. Filtrlash/saralash/pagination faqat /search'da. ── */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-500" strokeWidth={1.75} />
            {uz ? 'Ommabop muassasalar' : 'Популярные учреждения'}
          </h2>
          <Link href="/search" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            {uz ? 'Barchasini ko\'rish' : 'Смотреть все'}
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
          </Link>
        </div>

        {loadingTop ? (
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
        ) : topInstitutions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topInstitutions.map(inst => {
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
                          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
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

                    {/* Narx (asosiy) + reyting (tinch, taxminiy ko'rsatkich sifatida) */}
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      {inst.avgRating ? (
                        <RatingHint rating={inst.avgRating} count={inst.reviewCount} lang={lang} />
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
        )}

        {/* Katalogga o'tish — asosiy CTA, /search yagona to'liq katalog */}
        <div className="mt-8 flex justify-center">
          <Link href="/search" className="btn-secondary px-8 py-3 text-base">
            {uz ? "Barcha muassasalarni ko'rish" : 'Смотреть все учреждения'}
          </Link>
        </div>
      </div>

      {/* ── Footer — mobil/TWA'da vertikal, desktop'da bir qator.
             Havolalar qatori flex-wrap bilan — hech qanday enda kesilmaydi. ── */}
      <footer className="border-t border-gray-200 bg-gray-900 px-4 py-8 text-sm text-gray-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>© {new Date().getFullYear()} Edula.uz — {uz ? "O'zbekiston ta'lim platformasi" : "Платформа образования Узбекистана"}</span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/search"  className="shrink-0 whitespace-nowrap transition-colors hover:text-white">{uz ? "Qidiruv" : "Поиск"}</Link>
            <Link href="/compare" className="shrink-0 whitespace-nowrap transition-colors hover:text-white">{uz ? "Solishtirish" : "Сравнение"}</Link>
            <Link href="/auth"    className="shrink-0 whitespace-nowrap transition-colors hover:text-white">{uz ? "Kirish" : "Войти"}</Link>
            <Link href="/terms"   className="shrink-0 whitespace-nowrap transition-colors hover:text-white">{uz ? "Shartlar" : "Условия"}</Link>
            <a href="https://t.me/TrustboxInc" target="_blank" rel="noopener noreferrer"
              className="shrink-0 whitespace-nowrap font-bold text-[#7DD3F8] transition-colors hover:text-white">
              @TrustboxInc
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
