'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ChevronRight, CheckCircle2, Star, Phone, MessageCircle,
  Globe, MapPin, Calendar, Users, GraduationCap, BookOpen,
  ThumbsUp, PencilLine, Lock, Trophy, Clock, Target, BarChart2,
} from 'lucide-react'
import StarRating from '@/components/shared/StarRating'
import TypeIcon from '@/components/shared/TypeIcon'
import InstActions from '@/components/institutions/InstActions'
import WriteReview from '@/components/institutions/WriteReview'
import GuestLeadWidget from '@/components/shared/GuestLeadWidget'
import { useLang, t } from '@/contexts/LangContext'
import {
  trackInstitutionView, trackGateShown, trackGateCta, trackContactClick,
} from '@/lib/analytics'
import type { Institution } from './page'

function formatNum(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
function formatUzs(n: number) { return `${formatNum(n)} so'm` }

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",         ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',          ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',          ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',          ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet',     ru: 'Университет' },
  COURSE_CENTER:   { uz: "O'quv markaz",    ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi',     ru: 'Языковой центр' },
  IT_SCHOOL:       { uz: 'IT maktab',       ru: 'IT школа' },
  TUTORING:        { uz: 'Repetitor',       ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport maktabi',   ru: 'Спортшкола' },
  ARTS_SCHOOL:     { uz: "San'at maktabi",  ru: 'Школа искусств' },
}

function calcRatingBreakdown(reviews: Institution['reviews']) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  if (!reviews) return counts
  for (const r of reviews) counts[r.overallRating] = (counts[r.overallRating] ?? 0) + 1
  return counts
}

const DIM_DEFS = [
  { key: 'teacherRating',    Icon: GraduationCap, label: { uz: "O'qituvchilar", ru: 'Учителя' } },
  { key: 'facilityRating',   Icon: BookOpen,      label: { uz: 'Sharoit',        ru: 'Условия' } },
  { key: 'valueRating',      Icon: Star,          label: { uz: 'Narx/Sifat',     ru: 'Цена/Качество' } },
  { key: 'atmosphereRating', Icon: Users,         label: { uz: 'Muhit',          ru: 'Атмосфера' } },
  { key: 'serviceRating',    Icon: Phone,         label: { uz: 'Aloqa',          ru: 'Сервис' } },
] as const

type ReviewDimKey = 'teacherRating' | 'facilityRating' | 'valueRating' | 'atmosphereRating' | 'serviceRating'

function calcDimAverages(reviews: Institution['reviews']) {
  const sums: Record<ReviewDimKey, number> = { teacherRating: 0, facilityRating: 0, valueRating: 0, atmosphereRating: 0, serviceRating: 0 }
  const counts: Record<ReviewDimKey, number> = { teacherRating: 0, facilityRating: 0, valueRating: 0, atmosphereRating: 0, serviceRating: 0 }
  if (!reviews) return null
  for (const r of reviews) {
    for (const k of Object.keys(sums) as ReviewDimKey[]) {
      const v = r[k]
      if (v != null && v > 0) { sums[k] += v; counts[k]++ }
    }
  }
  const result: Partial<Record<ReviewDimKey, number>> = {}
  for (const k of Object.keys(sums) as ReviewDimKey[]) {
    if (counts[k] > 0) result[k] = Math.round((sums[k] / counts[k]) * 10) / 10
  }
  return Object.keys(result).length > 0 ? result : null
}

function GuestGate({
  isGuest, lang, blurPreview, children, gateType, institutionId,
}: {
  isGuest: boolean
  lang: 'uz' | 'ru'
  blurPreview?: React.ReactNode
  children: React.ReactNode
  gateType?: string
  institutionId?: string
}) {
  if (!isGuest) return <>{children}</>
  return (
    <div className="relative overflow-hidden rounded-2xl" data-gate-type={gateType}>
      {blurPreview && (
        <div className="pointer-events-none select-none opacity-60 saturate-50 blur-[3px]">
          {blurPreview}
        </div>
      )}
      <div className={`${blurPreview ? 'absolute inset-0' : ''} flex items-center justify-center bg-surface/80 backdrop-blur-sm`}>
        <div className="mx-4 w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-pop">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
            <Lock className="h-7 w-7 text-primary-600 dark:text-primary-400" aria-hidden />
          </div>
          <h3 className="mb-2 text-base font-bold text-ink">
            {lang === 'ru' ? 'Войдите для просмотра' : "Ko'rish uchun kiring"}
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-mute">
            {lang === 'ru'
              ? 'Контакты, цены и отзывы доступны только зарегистрированным пользователям'
              : "Kontaktlar, narxlar va sharhlar faqat ro'yxatdan o'tgan foydalanuvchilarga ko'rinadi"}
          </p>
          <Link
            href="/auth"
            onClick={() => trackGateCta(gateType ?? 'gate', institutionId)}
            className="btn-primary w-full"
          >
            {lang === 'ru' ? 'Зарегистрироваться / Войти' : "Ro'yxatdan o'tish / Kirish"}
          </Link>
          <p className="mt-3 text-xs text-faint">
            {lang === 'ru' ? 'Бесплатно · Только номер телефона' : "Bepul · Faqat telefon raqam"}
          </p>
        </div>
      </div>
    </div>
  )
}

function RegisterBanner({ lang }: { lang: 'uz' | 'ru' }) {
  const benefits = lang === 'ru' ? [
    [Phone,        'Контакты: телефон, Telegram, Instagram'],
    [Star,         'Актуальные цены и способы оплаты'],
    [MessageCircle,'Все отзывы родителей и учеников'],
    [PencilLine,   'Оставить свой отзыв'],
    [BookOpen,     'Сохранять и сравнивать учреждения'],
  ] as const : [
    [Phone,        'Kontaktlar: telefon, Telegram, Instagram'],
    [Star,         "Narxlar va to'lov usullari"],
    [MessageCircle,"Ota-onalar va o'quvchilarning barcha sharhlari"],
    [PencilLine,   "O'z sharhingizni yozish"],
    [BookOpen,     'Muassasalarni saqlash va solishtirish'],
  ] as const

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600">
          <GraduationCap className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">EDUBAHO.uz</p>
          <p className="text-xs text-faint">{lang === 'ru' ? "Ta'lim platformasi" : "Ta'lim platformasi"}</p>
        </div>
      </div>
      <h3 className="mb-1 text-base font-bold text-ink">
        {lang === 'ru' ? 'Хотите знать больше?' : "Ko'proq bilmoqchimisiz?"}
      </h3>
      <p className="mb-4 text-xs leading-relaxed text-mute">
        {lang === 'ru'
          ? 'Зарегистрируйтесь бесплатно — контакты, цены, отзывы'
          : "Bepul ro'yxatdan o'ting — kontaktlar, narxlar, sharhlar"}
      </p>
      <ul className="mb-5 space-y-2">
        {benefits.map(([Icon, text]) => (
          <li key={text} className="flex items-center gap-2.5 text-xs text-mute">
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary-500" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
      <Link href="/auth" className="btn-primary w-full">
        {lang === 'ru' ? 'Зарегистрироваться бесплатно' : "Bepul ro'yxatdan o'tish"}
      </Link>
      <p className="mt-3 text-center text-xs text-faint">
        {lang === 'ru' ? 'Только номер телефона · SMS-код' : 'Faqat telefon raqam · SMS-kod'}
      </p>
    </div>
  )
}

export default function InstitutionDetail({ inst }: { inst: Institution }) {
  const { lang } = useLang()
  const [isGuest, setIsGuest] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const viewTracked = useRef(false)
  const gatesShown = useRef<Set<string>>(new Set())

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const guest = !token
    setIsGuest(guest)
    setAuthChecked(true)
    if (!viewTracked.current) {
      viewTracked.current = true
      trackInstitutionView(inst.id, {
        type: inst.type,
        isGuest: guest,
        hasRating: !!inst.avgRating,
      })
    }
  }, [inst.id, inst.type, inst.avgRating])

  const gateObserver = useRef<IntersectionObserver | null>(null)
  useEffect(() => {
    if (!authChecked || !isGuest) return
    gateObserver.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const gateType = (entry.target as HTMLElement).dataset['gateType']
          if (gateType && !gatesShown.current.has(gateType)) {
            gatesShown.current.add(gateType)
            trackGateShown(gateType, inst.id)
          }
        }
      }
    }, { threshold: 0.3 })
    document.querySelectorAll('[data-gate-type]').forEach(el => {
      gateObserver.current?.observe(el)
    })
    return () => gateObserver.current?.disconnect()
  }, [authChecked, isGuest, inst.id])

  const typeLabel = TYPE_LABELS[inst.type]
  const displayName = lang === 'ru' && inst.nameRu ? inst.nameRu : inst.nameUz
  const description = lang === 'ru' && inst.details?.descriptionRu
    ? inst.details.descriptionRu
    : inst.details?.descriptionUz

  const ratingBreakdown = calcRatingBreakdown(inst.reviews)
  const dimAverages = calcDimAverages(inst.reviews)
  const totalReviews = inst.reviews?.length ?? 0
  const isCourseOrSchool = ['COURSE_CENTER', 'SCHOOL', 'IT_SCHOOL', 'LANGUAGE_CENTER'].includes(inst.type)

  const ui = {
    breadHome:       { uz: 'Bosh sahifa',              ru: 'Главная' },
    breadSearch:     { uz: 'Qidiruv',                  ru: 'Поиск' },
    verified:        { uz: 'Tasdiqlangan',              ru: 'Подтверждено' },
    premium:         { uz: 'Premium',                  ru: 'Премиум' },
    reviews:         { uz: 'ta sharh',                 ru: 'отзывов' },
    writeReview:     { uz: 'Sharh yozish',             ru: 'Написать отзыв' },
    reviewsTitle:    { uz: 'Sharhlar',                 ru: 'Отзывы' },
    noReviews:       { uz: "Hali sharh yo'q",          ru: 'Отзывов пока нет' },
    beFirst:         { uz: "Birinchi bo'lib sharh yozing!", ru: 'Оставьте первый отзыв!' },
    anon:            { uz: 'Anonim',                   ru: 'Аноним' },
    user:            { uz: 'Foydalanuvchi',            ru: 'Пользователь' },
    helpful:         { uz: 'kishi foydali topdi',      ru: 'нашли полезным' },
    priceTitle:      { uz: "To'lov",                   ru: 'Оплата' },
    priceFrom:       { uz: "Oylik to'lov",             ru: 'Оплата в месяц' },
    perMonth:        { uz: 'oyiga',                    ru: 'в месяц' },
    contactTitle:    { uz: 'Aloqa',                    ru: 'Контакты' },
    call:            { uz: "Qo'ng'iroq qilish",        ru: 'Позвонить' },
    website:         { uz: 'Veb-sayt',                 ru: 'Сайт' },
    infoTitle:       { uz: "Ma'lumotlar",              ru: 'Информация' },
    founded:         { uz: 'Tashkil etilgan',          ru: 'Основано' },
    students:        { uz: "O'quvchilar soni",         ru: 'Учеников' },
    teachers:        { uz: "O'qituvchilar soni",       ru: 'Преподавателей' },
    languages:       { uz: "O'qitish tillari",         ru: 'Языки обучения' },
    payment:         { uz: "To'lov usullari",          ru: 'Способы оплаты' },
    ratingTitle:     { uz: 'Reyting taqsimoti',        ru: 'Распределение оценок' },
    about:           { uz: 'Muassasa haqida',          ru: 'Об учреждении' },
    address:         { uz: 'Manzil',                   ru: 'Адрес' },
    noDescription:   { uz: "Ta'rif kiritilmagan.",     ru: 'Описание не добавлено.' },
    programs:        { uz: "O'qitiladigan fanlar",     ru: 'Преподаваемые предметы' },
    specializations: { uz: 'Ixtisosliklar',            ru: 'Специализации' },
    achievements:    { uz: 'Muvaffaqiyatlar',          ru: 'Достижения' },
    shifts:          { uz: 'Dars vaqtlari',            ru: 'Расписание' },
  }

  if (!authChecked) return null

  return (
    <main className="min-h-dvh bg-canvas">
      {/* Breadcrumb */}
      <div className="border-b border-line bg-surface px-4 py-3">
        <nav aria-label="breadcrumb" className="mx-auto flex max-w-5xl items-center gap-1.5 text-xs text-mute">
          <Link href="/" className="font-medium transition-colors hover:text-ink">{t(lang, ui.breadHome)}</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <Link href="/search" className="font-medium transition-colors hover:text-ink">{t(lang, ui.breadSearch)}</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="max-w-48 truncate font-semibold text-ink" aria-current="page">{displayName}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-3">

          {/* Left column */}
          <div className="space-y-4 lg:col-span-2">

            {/* Header card */}
            <div className="card p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 dark:bg-primary-900/30">
                  <TypeIcon type={inst.type} className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                  <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                    {typeLabel ? t(lang, typeLabel) : inst.type}
                  </span>
                </div>
                {inst.isVerified && (
                  <div className="verified-badge">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    {t(lang, ui.verified)}
                  </div>
                )}
                {inst.subscription?.plan === 'PREMIUM' && (
                  <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    <Star className="h-3 w-3" aria-hidden />
                    {t(lang, ui.premium)}
                  </span>
                )}
                {isGuest && (
                  <Link
                    href="/auth"
                    className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-100 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-400"
                  >
                    <Lock className="h-3 w-3" aria-hidden />
                    {lang === 'ru' ? 'Войдите для полного доступа' : "To'liq ma'lumot uchun kiring"}
                  </Link>
                )}
              </div>

              <h1 className="mb-1.5 text-2xl font-bold leading-tight text-ink sm:text-3xl">{displayName}</h1>
              {lang === 'uz' && inst.nameRu && (
                <p className="mb-4 text-sm text-faint">{inst.nameRu}</p>
              )}

              {inst.avgRating && inst.reviewCount > 0 && (
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-4xl font-bold tabular-nums text-ink">{inst.avgRating.toFixed(1)}</span>
                  <div>
                    <StarRating rating={inst.avgRating} size="lg" />
                    <button
                      onClick={() => {
                        const id = isGuest ? 'auth-gate-reviews' : 'reviews'
                        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="mt-1 block text-sm text-mute transition-colors hover:text-primary-600"
                    >
                      {inst.reviewCount} {t(lang, ui.reviews)}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick stats */}
            {(() => {
              const stats = [
                inst.details?.foundedYear && {
                  Icon: Calendar, label: t(lang, ui.founded),
                  value: String(inst.details.foundedYear),
                  cls: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10',
                },
                inst.details?.studentCount && {
                  Icon: Users, label: t(lang, ui.students),
                  value: `${formatNum(inst.details.studentCount)}+`,
                  cls: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10',
                },
                inst.details?.teacherCount && {
                  Icon: GraduationCap, label: t(lang, ui.teachers),
                  value: String(inst.details.teacherCount),
                  cls: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10',
                },
                (inst.details?.languages?.length ?? 0) > 0 && {
                  Icon: Globe, label: t(lang, ui.languages),
                  value: (inst.details!.languages ?? []).join(', ').toUpperCase(),
                  cls: 'text-teal-600 bg-teal-50 dark:bg-teal-500/10',
                },
                inst.pricing?.monthlyMin && {
                  Icon: Star, label: t(lang, ui.perMonth),
                  value: isGuest
                    ? `${formatUzs(inst.pricing.monthlyMin)} ${lang === 'ru' ? 'от' : 'dan'}`
                    : formatUzs(inst.pricing.monthlyMin),
                  cls: 'text-accent-600 bg-accent-50 dark:bg-accent-500/10',
                },
              ].filter(Boolean) as { Icon: React.ComponentType<{ className?: string }>; label: string; value: string; cls: string }[]

              if (stats.length === 0) return null
              return (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {stats.map(stat => (
                    <div key={stat.label} className={`flex items-center gap-3 rounded-xl p-4 ${stat.cls}`}>
                      <stat.Icon className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-xs opacity-60">{stat.label}</p>
                        <p className="truncate text-sm font-bold">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* About */}
            <div className="card p-6">
              <h2 className="section-title mb-4">
                <BookOpen className="h-4 w-4" aria-hidden />
                {t(lang, ui.about)}
              </h2>
              {isGuest ? (
                <>
                  {description && (
                    <p className="text-sm leading-relaxed text-mute">
                      {description.slice(0, 120)}
                      <span className="text-faint">…</span>
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3.5 dark:border-orange-500/20 dark:bg-orange-500/5">
                    <Lock className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                    <p className="flex-1 text-sm text-orange-700 dark:text-orange-400">
                      {lang === 'ru'
                        ? 'Полное описание доступно после входа'
                        : "To'liq ta'rif tizimga kirgandan so'ng ko'rinadi"}
                    </p>
                    <Link href="/auth" className="shrink-0 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600">
                      {lang === 'ru' ? 'Войти' : 'Kirish'}
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  {description ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-mute">{description}</p>
                  ) : (
                    <p className="text-sm italic text-faint">{t(lang, ui.noDescription)}</p>
                  )}
                  {inst.details && (
                    inst.details.foundedYear || inst.details.studentCount ||
                    inst.details.teacherCount || (inst.details.languages?.length ?? 0) > 0
                  ) && (
                    <dl className="mt-5 grid grid-cols-2 gap-2.5 border-t border-line pt-5">
                      {inst.details.foundedYear && (
                        <div className="rounded-xl bg-canvas px-4 py-3">
                          <dt className="text-xs text-faint">{t(lang, ui.founded)}</dt>
                          <dd className="mt-0.5 font-bold text-ink">{inst.details.foundedYear}</dd>
                        </div>
                      )}
                      {inst.details.studentCount && (
                        <div className="rounded-xl bg-canvas px-4 py-3">
                          <dt className="text-xs text-faint">{t(lang, ui.students)}</dt>
                          <dd className="mt-0.5 font-bold text-ink">{formatNum(inst.details.studentCount)}+</dd>
                        </div>
                      )}
                      {inst.details.teacherCount && (
                        <div className="rounded-xl bg-canvas px-4 py-3">
                          <dt className="text-xs text-faint">{t(lang, ui.teachers)}</dt>
                          <dd className="mt-0.5 font-bold text-ink">{inst.details.teacherCount}</dd>
                        </div>
                      )}
                      {(inst.details.languages?.length ?? 0) > 0 && (
                        <div className="col-span-2 rounded-xl bg-canvas px-4 py-3 sm:col-span-1">
                          <dt className="mb-2 text-xs text-faint">{t(lang, ui.languages)}</dt>
                          <dd className="flex flex-wrap gap-1.5">
                            {(inst.details.languages ?? []).map(l => (
                              <span key={l} className="rounded-lg bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                                {l.toUpperCase()}
                              </span>
                            ))}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                </>
              )}
            </div>

            {/* Course-specific sections */}
            {!isGuest && isCourseOrSchool && (
              <>
                {(inst.details?.programs?.length ?? 0) > 0 && (
                  <div className="card p-6">
                    <h2 className="section-title mb-4">
                      <BookOpen className="h-4 w-4" aria-hidden />
                      {t(lang, ui.programs)}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.programs ?? []).map(prog => (
                        <span key={prog} className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-500/25 dark:bg-primary-500/10 dark:text-primary-300">
                          {prog}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(inst.details?.specializations?.length ?? 0) > 0 && (
                  <div className="card p-6">
                    <h2 className="section-title mb-4">
                      <Target className="h-4 w-4" aria-hidden />
                      {t(lang, ui.specializations)}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.specializations ?? []).map(spec => (
                        <span key={spec} className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(inst.details?.shifts?.length ?? 0) > 0 && (
                  <div className="card p-6">
                    <h2 className="section-title mb-4">
                      <Clock className="h-4 w-4" aria-hidden />
                      {t(lang, ui.shifts)}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.shifts ?? []).map(shift => (
                        <span key={shift} className="flex items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {shift}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {inst.details?.achievements && (
                  <div className="card border-accent-200 bg-accent-50/30 p-6 dark:border-accent-500/20 dark:bg-accent-500/5">
                    <h2 className="section-title mb-3 text-accent-700 dark:text-accent-400">
                      <Trophy className="h-4 w-4" aria-hidden />
                      {t(lang, ui.achievements)}
                    </h2>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-mute">{inst.details.achievements}</p>
                  </div>
                )}
              </>
            )}

            {/* Rating breakdown */}
            {!isGuest && totalReviews > 0 && (
              <div className="card p-6">
                <h2 className="section-title mb-5">
                  <BarChart2 className="h-4 w-4" aria-hidden />
                  {t(lang, ui.ratingTitle)}
                </h2>
                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingBreakdown[star] ?? 0
                    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="w-4 shrink-0 text-right text-xs font-bold tabular-nums text-mute">{star}</span>
                        <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                        <div className="flex-1 overflow-hidden rounded-full bg-line h-2">
                          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 shrink-0 text-right text-xs tabular-nums text-faint">{count}</span>
                      </div>
                    )
                  })}
                </div>

                {dimAverages && (
                  <div className="mt-5 border-t border-line pt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      {lang === 'ru' ? 'По критериям' : "Mezonlar bo'yicha"}
                    </p>
                    <div className="space-y-2.5">
                      {DIM_DEFS.map(({ key, Icon, label }) => {
                        const avg = dimAverages[key]
                        if (!avg) return null
                        return (
                          <div key={key} className="flex items-center gap-2.5">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                            <span className="w-28 shrink-0 text-xs text-mute">{t(lang, label)}</span>
                            <div className="flex-1 overflow-hidden rounded-full bg-line h-1.5">
                              <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${(avg / 5) * 100}%` }} />
                            </div>
                            <span className="w-7 shrink-0 text-right text-xs font-bold tabular-nums text-primary-600 dark:text-primary-400">{avg}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Write review */}
            {!isGuest && (
              <div id="write-review">
                <WriteReview institutionId={inst.id} institutionName={displayName} />
              </div>
            )}

            {/* Reviews with gate */}
            <div id="auth-gate-reviews">
              <GuestGate
                isGuest={isGuest}
                lang={lang}
                gateType="reviews"
                institutionId={inst.id}
                blurPreview={
                  inst.reviews && inst.reviews.length > 0 ? (
                    <div className="card p-6">
                      <h2 className="section-title mb-5">
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        {t(lang, ui.reviewsTitle)}
                        <span className="badge ml-1 tabular-nums">{inst.reviewCount}</span>
                      </h2>
                      <div className="space-y-3">
                        {inst.reviews.slice(0, 2).map(review => (
                          <div key={review.id} className="rounded-xl border border-line bg-canvas p-4">
                            <div className="mb-2 flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
                                {review.isAnonymous ? '?' : (review.user?.name?.[0]?.toUpperCase() ?? '?')}
                              </div>
                              <StarRating rating={review.overallRating} size="sm" />
                            </div>
                            <p className="line-clamp-2 text-sm leading-relaxed text-mute">{review.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : undefined
                }
              >
                <div id="reviews" className="card p-6">
                  <h2 className="section-title mb-5">
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {t(lang, ui.reviewsTitle)}
                    {inst.reviewCount > 0 && (
                      <span className="badge ml-1 tabular-nums">{inst.reviewCount}</span>
                    )}
                  </h2>
                  {inst.reviews && inst.reviews.length > 0 ? (
                    <div className="space-y-3">
                      {inst.reviews.map(review => (
                        <article key={review.id} className="rounded-xl border border-line bg-canvas p-4">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
                                {review.isAnonymous ? '?' : (review.user?.name?.[0]?.toUpperCase() ?? '?')}
                              </div>
                              <div>
                                <span className="block text-sm font-semibold text-ink">
                                  {review.isAnonymous ? t(lang, ui.anon) : (review.user?.name ?? t(lang, ui.user))}
                                </span>
                                <StarRating rating={review.overallRating} size="sm" />
                              </div>
                            </div>
                            {review.createdAt && (
                              <time className="shrink-0 text-xs text-faint">
                                {new Date(review.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ')}
                              </time>
                            )}
                          </div>
                          {review.title && <p className="mb-1.5 text-sm font-semibold text-ink">{review.title}</p>}
                          <p className="text-sm leading-relaxed text-mute">{review.body}</p>
                          {DIM_DEFS.some(({ key }) => (review[key] ?? 0) > 0) && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {DIM_DEFS.map(({ key, Icon, label }) => {
                                const v = review[key]
                                if (!v) return null
                                return (
                                  <span key={key} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-mute">
                                    <Icon className="h-3 w-3" aria-hidden />
                                    {t(lang, label)}
                                    <span className="font-semibold text-amber-500">{'★'.repeat(v)}</span>
                                  </span>
                                )
                              })}
                            </div>
                          )}
                          {review.helpfulCount > 0 && (
                            <p className="mt-2 flex items-center gap-1 text-xs text-faint">
                              <ThumbsUp className="h-3 w-3" aria-hidden />
                              {review.helpfulCount} {t(lang, ui.helpful)}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas">
                        <MessageCircle className="h-7 w-7 text-faint" aria-hidden />
                      </div>
                      <p className="text-sm font-semibold text-ink">{t(lang, ui.noReviews)}</p>
                      <p className="mt-1 text-xs text-faint">{t(lang, ui.beFirst)}</p>
                    </div>
                  )}
                </div>
              </GuestGate>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <InstActions
              institution={{
                id: inst.id, slug: inst.slug, nameUz: inst.nameUz,
                type: inst.type, avgRating: inst.avgRating, pricing: inst.pricing,
              }}
            />

            {isGuest && <RegisterBanner lang={lang} />}

            {/* Price card — authenticated */}
            {!isGuest && inst.pricing?.monthlyMin && (
              <div className="card p-5">
                <h3 className="section-title mb-4">
                  <Star className="h-4 w-4" aria-hidden />
                  {t(lang, ui.priceTitle)}
                </h3>
                <div className="rounded-xl bg-accent-50 p-4 dark:bg-accent-500/10">
                  <p className="text-xs font-medium text-accent-600 dark:text-accent-400">{t(lang, ui.priceFrom)}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-accent-700 dark:text-accent-300">
                    {formatUzs(inst.pricing.monthlyMin)}
                  </p>
                  {inst.pricing.monthlyMax && inst.pricing.monthlyMax !== inst.pricing.monthlyMin && (
                    <p className="mt-1 text-sm text-accent-600 dark:text-accent-400">— {formatUzs(inst.pricing.monthlyMax)}</p>
                  )}
                  <p className="mt-0.5 text-xs text-accent-500">/ {t(lang, ui.perMonth)}</p>
                </div>
                {(inst.pricing.paymentMethods?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium text-faint">{t(lang, ui.payment)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(inst.pricing.paymentMethods ?? []).map((m: string) => (
                        <span key={m} className="rounded-lg bg-canvas px-2.5 py-1 text-xs font-medium text-mute">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Guest price hint */}
            {isGuest && inst.pricing?.monthlyMin && (
              <div className="card border-accent-100 bg-accent-50/30 p-5 dark:border-accent-500/20 dark:bg-accent-500/5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-500/20">
                    <Star className="h-4 w-4 text-accent-600 dark:text-accent-400" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs text-accent-600 dark:text-accent-400">{t(lang, ui.priceFrom)}</p>
                    <p className="text-lg font-bold tabular-nums text-accent-700 dark:text-accent-300">{formatUzs(inst.pricing.monthlyMin)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-surface/70 px-3 py-2.5 text-xs text-mute">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {lang === 'ru' ? 'Все детали после входа' : "Batafsil ma'lumot kirgandan so'ng"}
                </div>
              </div>
            )}

            {/* Contact card — authenticated */}
            {!isGuest && (
              <div className="card p-5">
                <h3 className="section-title mb-4">
                  <Phone className="h-4 w-4" aria-hidden />
                  {t(lang, ui.contactTitle)}
                </h3>
                <div className="space-y-2">
                  {inst.phone && (
                    <a
                      href={`tel:${inst.phone}`}
                      onClick={() => trackContactClick('phone', inst.id)}
                      className="flex items-center gap-3 rounded-xl bg-accent-600 px-4 py-3.5 font-medium text-white shadow-sm transition-all hover:bg-accent-700 hover:shadow-card active:scale-95"
                    >
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{t(lang, ui.call)}</div>
                        <div className="truncate text-xs opacity-80">{inst.phone}</div>
                      </div>
                    </a>
                  )}
                  {inst.telegram && (
                    <a
                      href={`https://t.me/${inst.telegram.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('telegram', inst.id)}
                      className="flex items-center gap-3 rounded-xl bg-sky-500 px-4 py-3.5 font-medium text-white shadow-sm transition-all hover:bg-sky-600 hover:shadow-card active:scale-95"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Telegram</div>
                        <div className="truncate text-xs opacity-80">@{inst.telegram.replace('@', '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.instagram && (
                    <a
                      href={`https://instagram.com/${inst.instagram.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('instagram', inst.id)}
                      className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3.5 font-medium text-white shadow-sm transition-all hover:opacity-90 hover:shadow-card active:scale-95"
                    >
                      <Globe className="h-4 w-4 shrink-0" aria-hidden />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Instagram</div>
                        <div className="truncate text-xs opacity-80">@{inst.instagram.replace('@', '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.website && (
                    <a
                      href={inst.website.startsWith('http') ? inst.website : `https://${inst.website}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('website', inst.id)}
                      className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3.5 font-medium text-mute transition-all hover:border-primary-200 hover:text-primary-700 dark:hover:border-primary-500/30 dark:hover:text-primary-400"
                    >
                      <Globe className="h-4 w-4 shrink-0" aria-hidden />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{t(lang, ui.website)}</div>
                        <div className="truncate text-xs text-faint">{inst.website.replace(/^https?:\/\//, '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.address && (
                    <div className="flex items-start gap-3 rounded-xl border border-line bg-canvas px-4 py-3.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-faint" aria-hidden />
                      <div>
                        <p className="text-xs font-medium text-faint">{t(lang, ui.address)}</p>
                        <p className="mt-0.5 text-sm leading-snug text-mute">{inst.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Write review CTA */}
            {!isGuest ? (
              <a href="#write-review" className="btn-primary w-full">
                <PencilLine className="h-4 w-4" aria-hidden />
                {t(lang, ui.writeReview)}
              </a>
            ) : (
              <Link href="/auth" className="btn-secondary w-full">
                <PencilLine className="h-4 w-4" aria-hidden />
                {lang === 'ru' ? 'Войдите чтобы оставить отзыв' : "Sharh yozish uchun kiring"}
              </Link>
            )}
          </div>
        </div>
      </div>

      {isGuest && <GuestLeadWidget />}
    </main>
  )
}
