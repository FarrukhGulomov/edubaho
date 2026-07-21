'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Star, Wallet, Info, Phone, Laptop, GraduationCap, School,
  Palette, Globe2, PencilLine, Dumbbell, Trophy, Landmark, UserCheck,
  Users2, Award, ChevronDown, Share2, Printer, Bookmark, BookmarkCheck,
  X, Plus, Crown, Check, ExternalLink, SlidersHorizontal, Clock,
} from 'lucide-react'
import { RatingHint } from '@/components/shared/StarRating'
import { useLang, t } from '@/contexts/LangContext'
import { useCompare, useSaved, MAX_COMPARE } from '@/hooks/useCompare'
import { useAuth } from '@/hooks/useAuth'
import { track } from '@/lib/analytics'
import { compareApi } from '@/lib/api'
import {
  computeHighlights, computeRecommendation, BADGE_LABELS,
  type HighlightBadge, type CompareRecInput,
} from '@/lib/compareRecommendation'

interface CompareInstitution {
  id: string
  nameUz: string
  nameRu?: string
  slug: string
  type: string
  isVerified: boolean
  avgRating?: number
  reviewCount: number
  viewCount: number
  createdAt: string
  address?: string
  phone?: string
  telegram?: string
  details?: {
    foundedYear?: number
    studentCount?: number
    teacherCount?: number
    languages?: string[]
    shifts?: string[]
  }
  pricing?: {
    monthlyMin?: number
    monthlyMax?: number
    paymentMethods?: string[]
  }
  accreditations?: { id: string; name: string; issuedBy?: string | null }[]
  _count?: { branches: number }
}

// Intl.toLocaleString('uz-UZ') server/klient orasida turlicha ICU
// ma'lumotlaridan foydalanishi mumkin (hydration mismatch xatosiga olib
// keladi) — shu sababli boshqa sahifalardagi kabi qo'lda formatlaymiz
function formatUzs(amount?: number | null) {
  if (!amount) return null
  return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`
}

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",         ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',          ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',          ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',          ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet',    ru: 'Университет' },
  COURSE_CENTER:   { uz: 'Kurs markazi',   ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi',    ru: 'Языковой центр' },
  IT_SCHOOL:       { uz: 'IT maktab',      ru: 'IT школа' },
  TUTORING:        { uz: 'Repetitor',      ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport maktabi',  ru: 'Спортшкола' },
  ARTS_SCHOOL:     { uz: "San'at maktabi", ru: 'Школа искусств' },
}

const TYPE_ICONS: Record<string, typeof School> = {
  IT_SCHOOL: Laptop, UNIVERSITY: GraduationCap, SCHOOL: School, KINDERGARTEN: Palette,
  LANGUAGE_CENTER: Globe2, COURSE_CENTER: PencilLine, SPORTS_SCHOOL: Dumbbell, LYCEUM: Trophy,
  COLLEGE: Landmark, TUTORING: UserCheck, ARTS_SCHOOL: Palette,
}

type SortKey = 'recommended' | 'price' | 'rating' | 'popular' | 'reviews' | 'alpha' | 'newest'

const SORT_OPTIONS: { value: SortKey; label: { uz: string; ru: string } }[] = [
  { value: 'recommended', label: { uz: 'Tavsiya etilgan', ru: 'Рекомендуемое' } },
  { value: 'price',       label: { uz: 'Arzon',           ru: 'Дешевле' } },
  { value: 'rating',      label: { uz: 'Reyting',         ru: 'Рейтинг' } },
  { value: 'popular',     label: { uz: 'Mashhur',         ru: 'Популярное' } },
  { value: 'reviews',     label: { uz: 'Sharhlar soni',   ru: 'По отзывам' } },
  { value: 'alpha',       label: { uz: 'Alifbo bo\'yicha', ru: 'По алфавиту' } },
  { value: 'newest',      label: { uz: 'Yangi qo\'shilgan', ru: 'Недавно добавленные' } },
]

interface SectionRow {
  key: string
  label: { uz: string; ru: string }
  value: (inst: CompareInstitution) => string | null
  badge?: HighlightBadge
}

interface Section {
  key: string
  label: { uz: string; ru: string }
  Icon: typeof School
  rows: SectionRow[]
  show: (insts: CompareInstitution[]) => boolean
}

const CATS_KEY = 'edu_compare_categories'
const EXPANDED_KEY = 'edu_compare_expanded'

export default function CompareContent({ institutions }: { institutions: CompareInstitution[] }) {
  const { lang } = useLang()
  const router = useRouter()
  const { user } = useAuth()
  const { remove } = useCompare()
  const { toggleSave, isSaved } = useSaved()

  const [sortBy, setSortBy] = useState<SortKey>('recommended')
  const [visibleCats, setVisibleCats] = useState<Set<string> | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['price', 'general']))
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Foydalanuvchi afzalliklarini (yashirilgan bo'limlar) yuklaymiz
  useEffect(() => {
    try {
      const cat = localStorage.getItem(CATS_KEY)
      if (cat) setVisibleCats(new Set(JSON.parse(cat)))
      const exp = localStorage.getItem(EXPANDED_KEY)
      if (exp) setExpanded(new Set(JSON.parse(exp)))
    } catch {
      // ignore
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    track('compare_opened', {
      category: 'engagement',
      properties: { count: institutions.length, ids: institutions.map((i) => i.id) },
    })
  }, [])

  const recInputs: CompareRecInput[] = useMemo(() => institutions.map((i) => ({
    id: i.id,
    nameUz: i.nameUz,
    nameRu: i.nameRu,
    avgRating: i.avgRating,
    reviewCount: i.reviewCount,
    viewCount: i.viewCount,
    isVerified: i.isVerified,
    createdAt: i.createdAt,
    pricing: { monthlyMin: i.pricing?.monthlyMin },
    branchCount: i._count?.branches ?? 0,
  })), [institutions])

  const highlights = useMemo(() => computeHighlights(recInputs), [recInputs])
  const recommendation = useMemo(() => computeRecommendation(recInputs), [recInputs])

  const sorted = useMemo(() => {
    const arr = [...institutions]
    switch (sortBy) {
      case 'price':
        return arr.sort((a, b) => (a.pricing?.monthlyMin ?? Infinity) - (b.pricing?.monthlyMin ?? Infinity))
      case 'rating':
        return arr.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
      case 'popular':
        return arr.sort((a, b) => b.viewCount - a.viewCount)
      case 'reviews':
        return arr.sort((a, b) => b.reviewCount - a.reviewCount)
      case 'newest':
        return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case 'alpha':
        return arr.sort((a, b) => {
          const na = lang === 'ru' && a.nameRu ? a.nameRu : a.nameUz
          const nb = lang === 'ru' && b.nameRu ? b.nameRu : b.nameUz
          return na.localeCompare(nb, 'uz')
        })
      case 'recommended':
      default:
        if (!recommendation) return arr
        return arr.sort((a) => (a.id === recommendation.winnerId ? -1 : 1))
    }
  }, [institutions, sortBy, lang, recommendation])

  const cols = sorted.length
  const cats = visibleCats ?? new Set(SECTION_KEYS)

  function toggleCategory(key: string) {
    const next = new Set(cats)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setVisibleCats(next)
    localStorage.setItem(CATS_KEY, JSON.stringify([...next]))
  }

  function toggleExpanded(key: string) {
    const next = new Set(expanded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpanded(next)
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]))
  }

  async function handleShare() {
    const url = `${window.location.origin}/compare?ids=${institutions.map((i) => i.id).join(',')}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
      track('compare_share', { category: 'engagement', properties: { method: 'copy_link', count: institutions.length } })
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      // clipboard ruxsat bo'lmasa jim o'tkazamiz
    }
  }

  function handlePrint() {
    track('compare_share', { category: 'engagement', properties: { method: 'print', count: institutions.length } })
    window.print()
  }

  async function handleSaveComparison() {
    const token = localStorage.getItem('accessToken')
    if (!user || !token) {
      router.push(`/auth?next=${encodeURIComponent(`/compare?ids=${institutions.map((i) => i.id).join(',')}`)}`)
      return
    }
    setSaveState('saving')
    try {
      await compareApi.save(institutions.map((i) => i.id), token)
      setSaveState('saved')
      track('compare_save', { category: 'engagement', properties: { count: institutions.length } })
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  const sections: Section[] = useMemo(() => [
    {
      key: 'price', Icon: Wallet, label: { uz: 'Narx', ru: 'Цена' }, show: () => true,
      rows: [
        { key: 'monthlyMin', label: { uz: 'Oylik narx (min)', ru: 'Ежемес. цена (мин)' }, value: (i) => formatUzs(i.pricing?.monthlyMin), badge: 'lowest_price' },
        { key: 'monthlyMax', label: { uz: 'Oylik narx (max)', ru: 'Ежемес. цена (макс)' }, value: (i) => formatUzs(i.pricing?.monthlyMax) },
        { key: 'payment', label: { uz: "To'lov usullari", ru: 'Способы оплаты' }, value: (i) => i.pricing?.paymentMethods?.join(', ') ?? null },
      ],
    },
    {
      key: 'general', Icon: Info, label: { uz: 'Umumiy', ru: 'Общее' }, show: () => true,
      rows: [
        { key: 'type', label: { uz: 'Turi', ru: 'Тип' }, value: (i) => TYPE_LABELS[i.type] ? t(lang, TYPE_LABELS[i.type]) : i.type },
        { key: 'founded', label: { uz: 'Tashkil etilgan', ru: 'Год основания' }, value: (i) => i.details?.foundedYear ? String(i.details.foundedYear) : null },
        { key: 'verified', label: { uz: 'Tasdiqlangan', ru: 'Подтверждён' }, value: (i) => i.isVerified ? '✓' : null, badge: 'verified' },
        { key: 'branches', label: { uz: 'Filiallar soni', ru: 'Кол-во филиалов' }, value: (i) => `${(i._count?.branches ?? 0) + 1} ta`, badge: 'most_branches' },
      ],
    },
    {
      key: 'people', Icon: Users2, label: { uz: "O'quvchi va o'qituvchilar", ru: 'Ученики и преподаватели' },
      show: (insts) => insts.some((i) => i.details?.studentCount || i.details?.teacherCount),
      rows: [
        { key: 'students', label: { uz: "O'quvchilar", ru: 'Учеников' }, value: (i) => i.details?.studentCount ? `${i.details.studentCount.toLocaleString()} ta` : null },
        { key: 'teachers', label: { uz: "O'qituvchilar", ru: 'Преподавателей' }, value: (i) => i.details?.teacherCount ? `${i.details.teacherCount} ta` : null },
      ],
    },
    {
      key: 'programs', Icon: Globe2, label: { uz: "O'qish sharoiti", ru: 'Условия обучения' },
      show: (insts) => insts.some((i) => i.details?.languages?.length || i.details?.shifts?.length),
      rows: [
        { key: 'languages', label: { uz: "O'qitish tillari", ru: 'Языки обучения' }, value: (i) => i.details?.languages?.length ? i.details.languages.join(', ').toUpperCase() : null },
        { key: 'shifts', label: { uz: 'Dars vaqtlari', ru: 'Расписание занятий' }, value: (i) => i.details?.shifts?.length ? i.details.shifts.join(', ') : null },
      ],
    },
    {
      key: 'certificates', Icon: Award, label: { uz: 'Sertifikatlar', ru: 'Сертификаты' },
      show: (insts) => insts.some((i) => i.accreditations?.length),
      rows: [
        { key: 'accr', label: { uz: 'Sertifikat/akkreditatsiya', ru: 'Сертификат/аккредитация' }, value: (i) => i.accreditations?.length ? i.accreditations.map((a) => a.name).join(', ') : null },
      ],
    },
    {
      key: 'rating', Icon: Star, label: { uz: 'Reyting va sharhlar', ru: 'Рейтинг и отзывы' }, show: () => true,
      rows: [
        { key: 'avgRating', label: { uz: 'Umumiy reyting', ru: 'Общий рейтинг' }, value: (i) => i.avgRating ? `${i.avgRating.toFixed(1)} / 5` : null, badge: 'highest_rating' },
        { key: 'reviewCount', label: { uz: 'Sharhlar soni', ru: 'Кол-во отзывов' }, value: (i) => `${i.reviewCount} ta`, badge: 'most_reviews' },
        { key: 'viewCount', label: { uz: "Qiziqish (ko'rishlar)", ru: 'Интерес (просмотры)' }, value: (i) => `${i.viewCount}`, badge: 'most_popular' },
      ],
    },
    {
      key: 'contact', Icon: Phone, label: { uz: 'Aloqa va manzil', ru: 'Контакты и адрес' }, show: () => true,
      rows: [
        { key: 'phone', label: { uz: 'Telefon', ru: 'Телефон' }, value: (i) => i.phone ?? null },
        { key: 'telegram', label: { uz: 'Telegram', ru: 'Telegram' }, value: (i) => i.telegram ? `@${i.telegram}` : null },
        { key: 'address', label: { uz: 'Manzil', ru: 'Адрес' }, value: (i) => i.address ?? null },
      ],
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lang])

  const winner = recommendation ? sorted.find((i) => i.id === recommendation.winnerId) : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:py-8">
      {/* Orqaga + harakatlar */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/search" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {t(lang, { uz: 'Qidiruvga qaytish', ru: 'Вернуться к поиску' })}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleShare}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {copyState === 'copied' ? t(lang, { uz: 'Nusxalandi!', ru: 'Скопировано!' }) : t(lang, { uz: 'Havola', ru: 'Ссылка' })}
          </button>
          <button
            onClick={handlePrint}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            PDF
          </button>
          <button
            onClick={handleSaveComparison}
            disabled={saveState === 'saving'}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary-50 px-3.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50"
          >
            {saveState === 'saved' ? <BookmarkCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} /> : <Bookmark className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
            {saveState === 'saved'
              ? t(lang, { uz: 'Saqlandi', ru: 'Сохранено' })
              : saveState === 'saving'
                ? t(lang, { uz: 'Saqlanmoqda...', ru: 'Сохранение...' })
                : t(lang, { uz: 'Saqlash', ru: 'Сохранить' })}
          </button>
        </div>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">
        {t(lang, { uz: "Ta'lim muassasalarini solishtirish", ru: 'Сравнение учебных заведений' })}
        <span className="ml-2 text-base font-normal text-gray-400">({cols})</span>
      </h1>

      {/* Tavsiya kartochkasi — mavjud ma'lumotlar asosida hisoblanadi */}
      {recommendation && winner && (
        <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 sm:p-6">
          <div className="mb-2.5 flex items-center gap-2 text-amber-700">
            <Crown className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="text-xs font-bold uppercase tracking-wide">{t(lang, { uz: 'Sizga tavsiya etamiz', ru: 'Рекомендуем вам' })}</span>
          </div>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            {lang === 'ru' && winner.nameRu ? winner.nameRu : winner.nameUz}
          </h2>
          <ul className="mb-4 space-y-1.5">
            {recommendation.reasons.map((r, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
                {t(lang, r)}
              </li>
            ))}
          </ul>
          <Link
            href={`/institutions/${winner.slug}`}
            className="no-print inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
          >
            {t(lang, { uz: "Profilni ko'rish", ru: 'Смотреть профиль' })}
            <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2} />
          </Link>
        </div>
      )}

      {/* Saralash */}
      <div className="no-print mb-4 flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              sortBy === opt.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t(lang, opt.label)}
          </button>
        ))}
      </div>

      {/* Sticky muassasa kartalari — mobil: gorizontal scroll, desktop: grid */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 overflow-x-auto bg-gray-50/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:border-gray-100">
        <div className="flex gap-3 sm:grid" style={cols <= 4 ? { gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` } : undefined}>
          {sorted.map((inst) => {
            const badges = highlights.get(inst.id) ?? []
            const name = lang === 'ru' && inst.nameRu ? inst.nameRu : inst.nameUz
            const TypeIcon = TYPE_ICONS[inst.type] ?? School
            const fav = isSaved(inst.id)
            const isWinner = recommendation?.winnerId === inst.id

            return (
              <div
                key={inst.id}
                className={`relative flex w-[220px] shrink-0 flex-col rounded-2xl border-2 bg-white p-4 shadow-sm sm:w-auto ${
                  isWinner ? 'border-amber-300' : 'border-gray-100'
                }`}
              >
                {isWinner && (
                  <span className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    <Crown className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                    {t(lang, { uz: 'Tavsiya etilgan', ru: 'Рекомендуем' })}
                  </span>
                )}
                <button
                  onClick={() => remove(inst.id)}
                  className="no-print absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label={t(lang, { uz: `${name}ni solishtirishdan olib tashlash`, ru: `Убрать ${name} из сравнения` })}
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>

                <div className="mb-2 flex justify-center">
                  <TypeIcon className="h-8 w-8 text-primary-300" strokeWidth={1.5} />
                </div>
                <Link href={`/institutions/${inst.slug}`} className="mb-1 line-clamp-2 text-center font-bold text-gray-900 hover:text-primary-600">
                  {name}
                </Link>
                {inst.avgRating ? (
                  <div className="mb-1.5 flex justify-center">
                    <RatingHint rating={inst.avgRating} lang={lang} />
                  </div>
                ) : (
                  <p className="mb-1.5 text-center text-xs text-gray-300">{t(lang, { uz: 'Sharh yo\'q', ru: 'Нет отзывов' })}</p>
                )}
                <p className="mb-2 text-center text-lg font-black text-primary-700">
                  {formatUzs(inst.pricing?.monthlyMin) ?? '—'}
                </p>

                {badges.length > 0 && (
                  <div className="mb-3 flex flex-wrap justify-center gap-1">
                    {badges.slice(0, 2).map((b) => (
                      <span key={b} className="whitespace-nowrap rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                        {t(lang, BADGE_LABELS[b])}
                      </span>
                    ))}
                  </div>
                )}

                <div className="no-print mt-auto flex gap-1.5">
                  <button
                    onClick={() => toggleSave({
                      id: inst.id, slug: inst.slug, nameUz: inst.nameUz, nameRu: inst.nameRu,
                      type: inst.type, avgRating: inst.avgRating, pricing: inst.pricing,
                    })}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                      fav ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-gray-200 text-gray-400 hover:border-amber-200 hover:text-amber-500'
                    }`}
                    aria-label={t(lang, { uz: 'Saqlash', ru: 'Сохранить' })}
                  >
                    <Star className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} strokeWidth={2} />
                  </button>
                  <Link
                    href={`/institutions/${inst.slug}`}
                    className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-primary-600 text-xs font-bold text-white transition-colors hover:bg-primary-700"
                  >
                    {t(lang, { uz: 'Profil', ru: 'Профиль' })}
                  </Link>
                </div>
              </div>
            )
          })}

          {cols < MAX_COMPARE && (
            <Link
              href="/search"
              className="no-print flex w-[220px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 p-4 text-center text-sm font-semibold text-gray-400 transition-colors hover:border-primary-300 hover:text-primary-500 sm:w-auto"
            >
              <Plus className="h-6 w-6 shrink-0" strokeWidth={2} />
              {t(lang, { uz: "Yana qo'shish", ru: 'Добавить ещё' })}
            </Link>
          )}
        </div>
      </div>

      {/* Bo'limlarni ko'rsatish/yashirish */}
      <div className="no-print mb-4 flex flex-wrap gap-2">
        {sections.filter((s) => s.show(institutions)).map((s) => (
          <button
            key={s.key}
            onClick={() => toggleCategory(s.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              cats.has(s.key) ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-400'
            }`}
          >
            <s.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {t(lang, s.label)}
          </button>
        ))}
      </div>

      {/* Guruhlangan, yig'iladigan bo'limlar */}
      <div className="space-y-3">
        {sections.filter((s) => s.show(institutions) && cats.has(s.key)).map((s) => {
          const isOpen = expanded.has(s.key)
          const rows = s.rows.filter((row) => sorted.some((i) => row.value(i) != null))
          if (rows.length === 0) return null

          return (
            <div key={s.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <button
                onClick={() => toggleExpanded(s.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-800">
                  <s.Icon className="h-4 w-4 shrink-0 text-primary-500" strokeWidth={1.75} />
                  {t(lang, s.label)}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>

              {isOpen && (
                <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3">
                  {rows.map((row) => {
                    const values = sorted.map((i) => row.value(i))
                    return (
                      <div key={row.key}>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {t(lang, row.label)}
                        </p>
                        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
                          {sorted.map((inst, idx) => {
                            const val = values[idx]
                            const isHi = row.badge ? (highlights.get(inst.id)?.includes(row.badge) ?? false) : false
                            return (
                              <div
                                key={inst.id}
                                className={`rounded-xl px-2 py-2 text-center text-[13px] leading-snug ${
                                  isHi ? 'bg-amber-50 font-bold text-amber-800 ring-1 ring-amber-300' : 'text-gray-700'
                                }`}
                              >
                                {isHi && <Crown className="mx-auto mb-0.5 h-3 w-3 text-amber-500" strokeWidth={2.5} />}
                                {val ?? <span className="text-gray-300">—</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}

const SECTION_KEYS = ['price', 'general', 'people', 'programs', 'certificates', 'rating', 'contact']
