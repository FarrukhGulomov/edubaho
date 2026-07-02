'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import StarRating from '@/components/shared/StarRating'
import InstActions from '@/components/institutions/InstActions'
import ClaimInstitution from '@/components/institutions/ClaimInstitution'
import WriteReview from '@/components/institutions/WriteReview'
import GuestLeadWidget from '@/components/shared/GuestLeadWidget'
import { useLang, t } from '@/contexts/LangContext'
import {
  trackInstitutionView, trackGateShown, trackGateCta, trackContactClick,
} from '@/lib/analytics'
import type { Institution } from './page'

function formatNum(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}
function formatUzs(n: number) { return `${formatNum(n)} so'm` }

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",         ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',          ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',          ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',          ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet',    ru: 'Университет' },
  COURSE_CENTER:   { uz: "O'quv markaz",   ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi',    ru: 'Языковой центр' },
  IT_SCHOOL:       { uz: 'IT maktab',      ru: 'IT школа' },
  TUTORING:        { uz: 'Repetitor',      ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport maktabi',  ru: 'Спортшкола' },
  ARTS_SCHOOL:     { uz: "San'at maktabi", ru: 'Школа искусств' },
}

// Muassasa turi bo'yicha gradient va ikonlar
const CARD_GRADIENTS: Record<string, string> = {
  KINDERGARTEN:    'from-pink-500 to-rose-400',
  SCHOOL:          'from-green-500 to-emerald-400',
  LYCEUM:          'from-teal-600 to-emerald-500',
  COLLEGE:         'from-indigo-500 to-blue-400',
  UNIVERSITY:      'from-amber-500 to-orange-400',
  COURSE_CENTER:   'from-blue-500 to-sky-400',
  LANGUAGE_CENTER: 'from-cyan-500 to-teal-400',
  IT_SCHOOL:       'from-violet-600 to-purple-500',
  TUTORING:        'from-orange-500 to-amber-400',
  SPORTS_SCHOOL:   'from-green-600 to-lime-500',
  ARTS_SCHOOL:     'from-fuchsia-500 to-pink-400',
}

const TYPE_ICONS: Record<string, string> = {
  KINDERGARTEN:    '🎨',
  SCHOOL:          '📚',
  LYCEUM:          '🏆',
  COLLEGE:         '📖',
  UNIVERSITY:      '🎓',
  COURSE_CENTER:   '✏️',
  LANGUAGE_CENTER: '🌐',
  IT_SCHOOL:       '💻',
  TUTORING:        '👨‍🏫',
  SPORTS_SCHOOL:   '⚽',
  ARTS_SCHOOL:     '🎭',
}

function calcRatingBreakdown(reviews: Institution['reviews']) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  if (!reviews) return counts
  for (const r of reviews) counts[r.overallRating] = (counts[r.overallRating] ?? 0) + 1
  return counts
}

// Mezonlar bo'yicha o'rtacha baholar
const DIM_DEFS = [
  { key: 'teacherRating',    icon: '👨‍🏫', label: "O'qituvchilar" },
  { key: 'facilityRating',   icon: '🏫',  label: 'Sharoit' },
  { key: 'valueRating',      icon: '💰',  label: 'Narx/Sifat' },
  { key: 'atmosphereRating', icon: '🌿',  label: 'Muhit' },
  { key: 'serviceRating',    icon: '📞',  label: 'Aloqa' },
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

// ─────────────────────────────────────────────────────────────
// Guest Gate — autentifikatsiya talab qiladigan bo'limlar uchun
// ─────────────────────────────────────────────────────────────
function GuestGate({
  isGuest,
  lang,
  blurPreview,
  children,
  gateType,
  institutionId,
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
    <div className="relative rounded-3xl overflow-hidden" data-gate-type={gateType}>
      {/* Blurred preview content */}
      {blurPreview && (
        <div className="pointer-events-none select-none blur-[3px] opacity-60 saturate-50">
          {blurPreview}
        </div>
      )}

      {/* Overlay */}
      <div className={`${blurPreview ? 'absolute inset-0' : ''} flex items-center justify-center bg-white/80 backdrop-blur-sm`}>
        <div className="mx-4 w-full max-w-sm rounded-3xl border-2 border-primary-100 bg-white p-7 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-3xl shadow-md">
            🔐
          </div>
          <h3 className="mb-2 text-xl font-black text-gray-900">
            {lang === 'ru' ? 'Войдите для просмотра' : "Ko'rish uchun kiring"}
          </h3>
          <p className="mb-5 text-base text-gray-500 leading-relaxed">
            {lang === 'ru'
              ? 'Контакты, цены и отзывы доступны только зарегистрированным пользователям'
              : "Kontaktlar, narxlar va sharhlar faqat ro'yxatdan o'tgan foydalanuvchilarga ko'rinadi"}
          </p>
          <Link
            href="/auth"
            onClick={() => trackGateCta(gateType ?? 'gate', institutionId)}
            className="btn-primary w-full text-base py-4"
          >
            {lang === 'ru' ? 'Зарегистрироваться / Войти' : "Ro'yxatdan o'tish / Kirish"}
          </Link>
          <p className="mt-3 text-sm text-gray-400">
            {lang === 'ru' ? 'Бесплатно · Только номер телефона' : "Bepul · Faqat telefon raqam"}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Registration CTA banner — sahifa o'rtasida bitta ulkan taklif
// ─────────────────────────────────────────────────────────────
function RegisterBanner({ lang }: { lang: 'uz' | 'ru' }) {
  return (
    <div className="overflow-hidden rounded-3xl shadow-lg">
      {/* Gradient header */}
      <div className="relative bg-gradient-to-br from-primary-700 to-sky-500 px-6 py-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm border border-white/25">
            🔐
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-white/80">EDUBAHO.uz</p>
            <h3 className="text-lg font-black text-white leading-tight">
              {lang === 'ru' ? 'Войдите для полного доступа' : "To'liq kirish uchun tizimga kiring"}
            </h3>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="border-2 border-t-0 border-primary-100 bg-white px-6 pb-6 pt-5 rounded-b-3xl">
        <p className="mb-4 text-sm text-gray-500 leading-relaxed">
          {lang === 'ru'
            ? 'Зарегистрируйтесь бесплатно — контакты, цены и все отзывы'
            : "Bepul ro'yxatdan o'ting — kontaktlar, narxlar va barcha sharhlar"}
        </p>

        <ul className="mb-5 space-y-2.5">
          {(lang === 'ru' ? [
            ['📞', 'Контакты: телефон, Telegram, Instagram'],
            ['💰', 'Актуальные цены и способы оплаты'],
            ['💬', 'Все отзывы родителей и учеников'],
            ['✍️', 'Оставить свой отзыв'],
            ['🔖', 'Сохранять и сравнивать учреждения'],
          ] : [
            ['📞', 'Kontaktlar: telefon, Telegram, Instagram'],
            ['💰', "Narxlar va to'lov usullari"],
            ['💬', "Ota-onalar va o'quvchilarning barcha sharhlari"],
            ['✍️', "O'z sharhingizni yozish"],
            ['🔖', 'Muassasalarni saqlash va solishtirish'],
          ]).map(([icon, text]) => (
            <li key={text} className="flex items-center gap-2.5 text-sm text-gray-700">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm">{icon}</span>
              {text}
            </li>
          ))}
        </ul>

        <Link href="/auth" className="btn-primary w-full py-3.5 text-base">
          {lang === 'ru' ? 'Зарегистрироваться бесплатно →' : "Bepul ro'yxatdan o'tish →"}
        </Link>
        <p className="mt-3 text-center text-xs text-gray-400">
          {lang === 'ru' ? 'Только номер телефона · SMS-код · Бесплатно' : 'Faqat telefon raqam · SMS-kod · Bepul'}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Asosiy komponent
// ─────────────────────────────────────────────────────────────
export default function InstitutionDetail({ inst }: { inst: Institution }) {
  const { lang } = useLang()
  const [isGuest, setIsGuest] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const viewTracked = useRef(false)
  const gatesShown = useRef<Set<string>>(new Set())

  // Client-side auth tekshiruvi + sahifa view tracking
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const guest = !token
    setIsGuest(guest)
    setAuthChecked(true)

    // Muassasa ko'rildi
    if (!viewTracked.current) {
      viewTracked.current = true
      trackInstitutionView(inst.id, {
        type: inst.type,
        isGuest: guest,
        hasRating: !!inst.avgRating,
      })
    }
  }, [inst.id, inst.type, inst.avgRating])

  // Gate ko'rinishini kuzatish (intersection observer)
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

    // Gate elementlarini observe qilamiz
    document.querySelectorAll('[data-gate-type]').forEach(el => {
      gateObserver.current?.observe(el)
    })
    return () => gateObserver.current?.disconnect()
  }, [authChecked, isGuest, inst.id])

  const typeLabel      = TYPE_LABELS[inst.type]
  const typeIcon       = TYPE_ICONS[inst.type] ?? '🏫'
  const bannerGradient = CARD_GRADIENTS[inst.type] ?? 'from-primary-700 to-sky-500'
  const displayName    = lang === 'ru' && inst.nameRu ? inst.nameRu : inst.nameUz
  const cityDisplayName = inst.city
    ? (lang === 'ru' && inst.city.nameRu ? inst.city.nameRu : inst.city.nameUz)
    : null
  const description = lang === 'ru' && inst.details?.descriptionRu
    ? inst.details.descriptionRu
    : inst.details?.descriptionUz

  const ratingBreakdown = calcRatingBreakdown(inst.reviews)
  const dimAverages = calcDimAverages(inst.reviews)
  const totalReviews = inst.reviews?.length ?? 0
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
    shifts:          { uz: 'Dars vaqtlari',            ru: 'Расpisanie' },
    previewDesc:     { uz: 'To\'liq ma\'lumot uchun tizimga kiring', ru: 'Войдите для полной информации' },
  }

  // Auth tekshiruvi tugamaguncha skeleton ko'rsatmaymiz (flash oldini olish)
  if (!authChecked) return null

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── To'liq rang gradient hero banner ─── */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${bannerGradient} text-white`}>
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        {/* Glow orblari */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

        <div className="relative mx-auto max-w-5xl px-4">
          {/* Breadcrumb — banner ichida */}
          <nav className="flex items-center gap-1.5 py-4 text-sm text-white/70">
            <Link href="/" className="hover:text-white transition-colors font-medium">{t(lang, ui.breadHome)}</Link>
            <span className="text-white/40">›</span>
            <Link href="/search" className="hover:text-white transition-colors font-medium">{t(lang, ui.breadSearch)}</Link>
            <span className="text-white/40">›</span>
            <span className="text-white/90 font-semibold max-w-48 truncate">{displayName}</span>
          </nav>

          {/* Muassasa ma'lumotlari */}
          <div className="flex flex-col gap-5 pb-8 sm:flex-row sm:items-end">
            {/* Tur ikonasi */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/25 bg-white/20 text-5xl shadow-lg backdrop-blur-sm">
              {typeIcon}
            </div>

            {/* Nom va teglar */}
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-white/25 bg-white/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                  {typeLabel ? t(lang, typeLabel) : inst.type}
                </span>
                {inst.isVerified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/30 px-3 py-1.5 text-sm font-bold text-emerald-100">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    {t(lang, ui.verified)}
                  </span>
                )}
                {inst.subscription?.plan === 'PREMIUM' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/30 px-3 py-1.5 text-sm font-bold text-amber-100">
                    ⭐ {t(lang, ui.premium)}
                  </span>
                )}
                {isGuest && (
                  <Link href="/auth" className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-500/30 px-3 py-1.5 text-sm font-bold text-orange-100 transition-colors hover:bg-orange-500/40">
                    🔐 {lang === 'ru' ? 'Войдите для полного доступа' : "To'liq ma'lumot uchun kiring"}
                  </Link>
                )}
              </div>

              <h1 className="text-2xl font-black leading-tight text-white sm:text-4xl">{displayName}</h1>
              {lang === 'uz' && inst.nameRu && (
                <p className="mt-1 text-base text-white/60">{inst.nameRu}</p>
              )}
              {cityDisplayName && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-white/70">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {cityDisplayName}
                </div>
              )}
            </div>

            {/* Reyting bloki */}
            {inst.avgRating && inst.reviewCount > 0 ? (
              <button
                onClick={() => {
                  if (isGuest) document.getElementById('auth-gate-reviews')?.scrollIntoView({ behavior: 'smooth' })
                  else document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="flex shrink-0 flex-col items-center rounded-3xl border border-white/20 bg-white/15 px-6 py-4 text-center backdrop-blur-sm transition-all hover:bg-white/25"
              >
                <span className="text-5xl font-black text-yellow-300">{inst.avgRating.toFixed(1)}</span>
                <StarRating rating={inst.avgRating} size="lg" />
                <span className="mt-1 text-sm text-white/70">{inst.reviewCount} {t(lang, ui.reviews)}</span>
              </button>
            ) : (
              <div className="flex shrink-0 flex-col items-center rounded-3xl border border-white/15 bg-white/10 px-6 py-4 text-center">
                <span className="mb-1 text-3xl">💬</span>
                <span className="text-sm text-white/70">{t(lang, ui.noReviews)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-3">

          {/* ── Left column ─── */}
          <div className="lg:col-span-2 space-y-4">

            {/* ════════════════════════════════════════
                1. YO'NALISHLAR — Programs & Specializations
                ════════════════════════════════════════ */}
            {((inst.details?.programs?.length ?? 0) > 0 ||
              (inst.details?.specializations?.length ?? 0) > 0) && (
              <div className="rounded-3xl bg-white p-6 shadow-md border border-gray-100">
                <h2 className="mb-4 flex items-center gap-2.5 text-xl font-black text-gray-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-xl">📚</span>
                  {lang === 'ru' ? 'Направления и курсы' : "Yo'nalishlar va kurslar"}
                </h2>

                {(inst.details?.programs?.length ?? 0) > 0 && (
                  <>
                    {(inst.details?.specializations?.length ?? 0) > 0 && (
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                        {t(lang, ui.programs)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.programs ?? []).map(prog => (
                        <span key={prog} className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700">
                          {prog}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {(inst.details?.specializations?.length ?? 0) > 0 && (
                  <>
                    <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                      {t(lang, ui.specializations)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.specializations ?? []).map(spec => (
                        <span key={spec} className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* O'qitish tillari */}
                {(inst.details?.languages?.length ?? 0) > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-50 pt-4">
                    <span className="text-xs font-semibold text-gray-500">
                      {t(lang, ui.languages)}:
                    </span>
                    {(inst.details!.languages ?? []).map(l => (
                      <span key={l} className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                        {l.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Mehmon foydalanuvchi uchun qo'shimcha ma'lumot chaqiruvi */}
                {isGuest && (
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
                    <span className="shrink-0 text-xl">🔓</span>
                    <p className="flex-1 text-sm font-medium text-primary-700">
                      {lang === 'ru'
                        ? 'Войдите чтобы увидеть все курсы и детали'
                        : "Barcha kurslarni ko'rish uchun tizimga kiring"}
                    </p>
                    <Link href="/auth" className="shrink-0 rounded-xl bg-primary-600 px-3 py-2 text-sm font-bold text-white hover:bg-primary-700 transition-colors">
                      {lang === 'ru' ? 'Войти' : 'Kirish'}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════
                2. NATIJA KO'RSATKICHLARI — Achievements
                ════════════════════════════════════════ */}
            {inst.details?.achievements && (
              <div className="overflow-hidden rounded-3xl shadow-md">
                {/* Sarlavha */}
                <div className="relative bg-gradient-to-br from-emerald-600 to-green-500 px-6 py-4">
                  <div className="pointer-events-none absolute inset-0 opacity-[0.08]"
                    style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                  <h2 className="relative flex items-center gap-2.5 text-xl font-black text-white">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-xl">🏆</span>
                    {t(lang, ui.achievements)}
                  </h2>
                  <p className="relative mt-1 text-sm text-emerald-100">
                    {lang === 'ru' ? 'Результаты и достижения учеников' : "O'quvchilar natijalari va yutuqlari"}
                  </p>
                </div>
                {/* Matn */}
                <div className="border border-t-0 border-emerald-100 bg-white px-6 py-5 rounded-b-3xl">
                  <p className="whitespace-pre-line text-base leading-relaxed text-gray-700">
                    {inst.details.achievements}
                  </p>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════
                3. O'QITUVCHILAR SIFATI
                ════════════════════════════════════════ */}
            {(inst.details?.teacherCount || (inst.details?.shifts?.length ?? 0) > 0) && (
              <div className="rounded-3xl bg-white p-6 shadow-md border border-gray-100">
                <h2 className="mb-4 flex items-center gap-2.5 text-xl font-black text-gray-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-xl">👨‍🏫</span>
                  {lang === 'ru' ? "Качество преподавания" : "O'qituvchilar sifati"}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {inst.details?.teacherCount && (
                    <div className="flex items-center gap-3 rounded-2xl bg-violet-50 p-4">
                      <span className="text-3xl">👨‍🏫</span>
                      <div>
                        <p className="text-xs text-violet-500 font-medium">{t(lang, ui.teachers)}</p>
                        <p className="text-xl font-black text-violet-700">{inst.details.teacherCount}</p>
                      </div>
                    </div>
                  )}
                  {inst.details?.foundedYear && (
                    <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
                      <span className="text-3xl">📅</span>
                      <div>
                        <p className="text-xs text-blue-500 font-medium">{t(lang, ui.founded)}</p>
                        <p className="text-xl font-black text-blue-700">{inst.details.foundedYear}</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Dars vaqtlari */}
                {(inst.details?.shifts?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                      {t(lang, ui.shifts)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.shifts ?? []).map(shift => (
                        <span key={shift} className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700">
                          🕐 {shift}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════
                4. O'QUVCHILAR SONI
                ════════════════════════════════════════ */}
            {inst.details?.studentCount && (
              <div className="rounded-3xl bg-gradient-to-br from-cyan-50 to-sky-50 border border-cyan-100 p-6 shadow-md">
                <h2 className="mb-4 flex items-center gap-2.5 text-xl font-black text-gray-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-xl">👥</span>
                  {t(lang, ui.students)}
                </h2>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black text-cyan-600">
                    {formatNum(inst.details.studentCount)}+
                  </span>
                  <span className="mb-1 text-base text-cyan-500">
                    {lang === 'ru' ? 'учеников обучается' : "o'quvchi tahsil olmoqda"}
                  </span>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════
                5. NARXI — Pricing (inline, auth bo'lganda)
                ════════════════════════════════════════ */}
            {!isGuest && inst.pricing?.monthlyMin && (
              <div className="overflow-hidden rounded-3xl shadow-md">
                <div className="relative bg-gradient-to-br from-emerald-500 to-teal-500 px-6 py-4">
                  <div className="pointer-events-none absolute inset-0 opacity-[0.08]"
                    style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                  <h2 className="relative flex items-center gap-2.5 text-xl font-black text-white">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-xl">💰</span>
                    {t(lang, ui.priceTitle)}
                  </h2>
                </div>
                <div className="border border-t-0 border-emerald-100 bg-white px-6 py-5 rounded-b-3xl">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{t(lang, ui.priceFrom)}</p>
                      <p className="text-4xl font-black text-emerald-700">
                        {formatUzs(inst.pricing.monthlyMin)}
                      </p>
                      {inst.pricing.monthlyMax && inst.pricing.monthlyMax !== inst.pricing.monthlyMin && (
                        <p className="mt-0.5 text-base text-emerald-500">
                          — {formatUzs(inst.pricing.monthlyMax)} / {t(lang, ui.perMonth)}
                        </p>
                      )}
                    </div>
                  </div>
                  {(inst.pricing.paymentMethods?.length ?? 0) > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-50 pt-4">
                      <span className="text-xs text-gray-400 font-semibold">{t(lang, ui.payment)}:</span>
                      {(inst.pricing.paymentMethods ?? []).map(m => (
                        <span key={m} className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Narx hint mehmon uchun */}
            {isGuest && inst.pricing?.monthlyMin && (
              <div className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                <span className="text-3xl">💰</span>
                <div className="flex-1">
                  <p className="text-sm text-emerald-600 font-semibold">{t(lang, ui.priceFrom)}</p>
                  <p className="text-2xl font-black text-emerald-700">{formatUzs(inst.pricing.monthlyMin)}</p>
                </div>
                <Link href="/auth" className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
                  {lang === 'ru' ? 'Полная цена →' : "To'liq narx →"}
                </Link>
              </div>
            )}

            {/* ════════════════════════════════════════
                6. JOYLASHUV VA FORMAT
                ════════════════════════════════════════ */}
            {(inst.address || inst.phone || inst.phone2 || inst.website) && (
              <div className="rounded-3xl bg-white p-6 shadow-md border border-gray-100">
                <h2 className="mb-4 flex items-center gap-2.5 text-xl font-black text-gray-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-xl">📍</span>
                  {lang === 'ru' ? 'Расположение и формат' : "Joylashuv va format"}
                </h2>

                <div className="space-y-3">
                  {inst.address && (
                    <div className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3.5 border border-gray-100">
                      <span className="mt-0.5 text-xl shrink-0">📍</span>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold mb-1">{t(lang, ui.address)}</p>
                        <p className="text-base font-medium text-gray-800 leading-snug">{inst.address}</p>
                      </div>
                    </div>
                  )}

                  {/* Format ko'rsatkichlari */}
                  <div className="flex flex-wrap gap-2">
                    {inst.type === 'IT_SCHOOL' || inst.type === 'LANGUAGE_CENTER' || inst.type === 'COURSE_CENTER' ? (
                      <>
                        <span className="flex items-center gap-1.5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700">
                          🏫 {lang === 'ru' ? 'Офлайн' : 'Offline'}
                        </span>
                        <span className="flex items-center gap-1.5 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700">
                          💻 {lang === 'ru' ? 'Онлайн' : 'Online'}
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700">
                        🏫 {lang === 'ru' ? 'Очное обучение' : "Offline ta'lim"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════
                7. MUASSASA HAQIDA — About
                ════════════════════════════════════════ */}
            <div className="rounded-3xl bg-white p-6 shadow-md border border-gray-100">
              <h2 className="mb-4 flex items-center gap-2.5 text-xl font-black text-gray-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-xl">📖</span>
                {t(lang, ui.about)}
              </h2>

              {isGuest ? (
                <>
                  {description && (
                    <p className="text-base leading-relaxed text-gray-700">
                      {description.slice(0, 160)}
                      <span className="text-gray-400">…</span>
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4">
                    <span className="shrink-0 text-2xl">🔐</span>
                    <p className="flex-1 text-base font-medium text-orange-700">
                      {lang === 'ru'
                        ? 'Полное описание доступно после входа'
                        : "To'liq ta'rif tizimga kirgandan so'ng ko'rinadi"}
                    </p>
                    <Link href="/auth" className="ml-auto shrink-0 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors">
                      {lang === 'ru' ? 'Войти' : 'Kirish'}
                    </Link>
                  </div>
                </>
              ) : (
                description ? (
                  <p className="whitespace-pre-line text-base leading-relaxed text-gray-700">{description}</p>
                ) : (
                  <p className="italic text-base text-gray-400">{t(lang, ui.noDescription)}</p>
                )
              )}
            </div>

            {/* ════════════════════════════════════════
                8. REYTING — Rating breakdown
                ════════════════════════════════════════ */}

            {/* Rating breakdown — faqat auth bo'lganda */}
            {!isGuest && totalReviews > 0 && (
              <div className="rounded-3xl bg-white p-6 shadow-md border border-gray-100">
                <h2 className="mb-5 font-black text-gray-900 text-xl flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-xl">📊</span>
                  {t(lang, ui.ratingTitle)}
                </h2>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingBreakdown[star] ?? 0
                    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="w-5 text-base font-black text-gray-700 text-right shrink-0">{star}</span>
                        <span className="text-yellow-400 text-lg shrink-0">★</span>
                        <div className="flex-1 rounded-full bg-gray-100 h-3 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-7 text-sm text-gray-500 text-right shrink-0">{count}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Mezonlar bo'yicha o'rtacha baholar */}
                {dimAverages && (
                  <div className="mt-5 border-t border-gray-100 pt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Mezonlar bo&apos;yicha</p>
                    <div className="space-y-2.5">
                      {DIM_DEFS.map(({ key, icon, label }) => {
                        const avg = dimAverages[key]
                        if (!avg) return null
                        const pct = (avg / 5) * 100
                        return (
                          <div key={key} className="flex items-center gap-2.5">
                            <span className="w-6 text-center text-base shrink-0">{icon}</span>
                            <span className="w-28 text-sm font-medium text-gray-600 shrink-0">{label}</span>
                            <div className="flex-1 rounded-full bg-gray-100 h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-sm font-bold text-primary-600 text-right shrink-0">{avg}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Write review — faqat auth bo'lganda */}
            {!isGuest && (
              <div id="write-review">
                <WriteReview institutionId={inst.id} institutionName={displayName} />
              </div>
            )}

            {/* Reviews — GATE bilan */}
            <div id="auth-gate-reviews">
              <GuestGate
                isGuest={isGuest}
                lang={lang}
                gateType="reviews"
                institutionId={inst.id}
                blurPreview={
                  inst.reviews && inst.reviews.length > 0 ? (
                    <div className="rounded-3xl bg-white p-6 shadow-md border border-gray-100">
                      <h2 className="mb-5 text-xl font-black text-gray-900 flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-xl">💬</span>
                        {t(lang, ui.reviewsTitle)}
                        <span className="ml-1 rounded-full bg-primary-100 px-2.5 py-1 text-sm font-black text-primary-700">
                          {inst.reviewCount}
                        </span>
                      </h2>
                      <div className="space-y-4">
                        {inst.reviews.slice(0, 2).map(review => (
                          <div key={review.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                            <div className="mb-3 flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-base font-black text-white">
                                {review.isAnonymous ? '?' : (review.user?.name?.[0]?.toUpperCase() ?? '?')}
                              </div>
                              <StarRating rating={review.overallRating} size="sm" />
                            </div>
                            <p className="text-base text-gray-600 leading-relaxed line-clamp-2">{review.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : undefined
                }
              >
                {/* Auth bo'lganda ko'rinadigan to'liq sharhlar */}
                <div id="reviews" className="rounded-3xl bg-white p-6 shadow-md border border-gray-100">
                  <h2 className="mb-5 text-xl font-black text-gray-900 flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-xl">💬</span>
                    {t(lang, ui.reviewsTitle)}
                    {inst.reviewCount > 0 && (
                      <span className="ml-1 rounded-full bg-primary-100 px-2.5 py-1 text-sm font-black text-primary-700">
                        {inst.reviewCount}
                      </span>
                    )}
                  </h2>
                  {inst.reviews && inst.reviews.length > 0 ? (
                    <div className="space-y-4">
                      {inst.reviews.map(review => {
                        const initials = review.isAnonymous
                          ? '?'
                          : (review.user?.name?.[0]?.toUpperCase() ?? '?')
                        return (
                          <div key={review.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                            {/* Review header */}
                            <div className="flex items-center justify-between gap-3 border-b border-gray-50 bg-gray-50/80 px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-black text-white shadow-sm">
                                  {initials}
                                </div>
                                <div>
                                  <span className="block text-sm font-bold text-gray-800">
                                    {review.isAnonymous ? t(lang, ui.anon) : (review.user?.name ?? t(lang, ui.user))}
                                  </span>
                                  <StarRating rating={review.overallRating} size="sm" />
                                </div>
                              </div>
                              {review.createdAt && (
                                <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs text-gray-400 border border-gray-100">
                                  {new Date(review.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ')}
                                </span>
                              )}
                            </div>
                            {/* Review body */}
                            <div className="px-5 py-4">
                              {review.title && (
                                <p className="mb-1.5 text-base font-bold text-gray-800">{review.title}</p>
                              )}
                              <p className="text-base leading-relaxed text-gray-600">{review.body}</p>
                              {DIM_DEFS.some(({ key }) => (review[key] ?? 0) > 0) && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {DIM_DEFS.map(({ key, icon, label }) => {
                                    const v = review[key]
                                    if (!v) return null
                                    return (
                                      <span key={key} className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                        <span className="font-black text-yellow-500">{'★'.repeat(v)}</span>
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              {review.helpfulCount > 0 && (
                                <p className="mt-3 text-xs text-gray-400">
                                  👍 {review.helpfulCount} {t(lang, ui.helpful)}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-100 text-4xl">💬</div>
                      <p className="text-lg font-bold text-gray-600">{t(lang, ui.noReviews)}</p>
                      <p className="mt-1 text-base text-gray-400">{t(lang, ui.beFirst)}</p>
                    </div>
                  )}
                </div>
              </GuestGate>
            </div>
          </div>

          {/* ── Right column (sidebar) ─── */}
          <div className="space-y-4">

            {/* Save / Compare — hammaga, lekin action auth kerak */}
            <InstActions
              institution={{
                id: inst.id, slug: inst.slug, nameUz: inst.nameUz,
                type: inst.type, avgRating: inst.avgRating, pricing: inst.pricing,
              }}
            />

            {/* Guest — Ro'yxatdan o'tish CTA (sidebar) */}
            {isGuest && <RegisterBanner lang={lang} />}

            {/* Hamkorlar uchun: muassasa egaligi so'rovi */}
            <ClaimInstitution institutionId={inst.id} isVerified={inst.isVerified} />

            {/* Price card — faqat auth bo'lganda */}
            {!isGuest && inst.pricing?.monthlyMin && (
              <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-md">
                <h3 className="mb-4 font-black text-gray-900 text-lg flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-xl">💰</span>
                  {t(lang, ui.priceTitle)}
                </h3>
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-5 border border-emerald-100">
                  <p className="text-sm text-emerald-600 font-semibold mb-1.5">{t(lang, ui.priceFrom)}</p>
                  <p className="text-3xl font-black text-emerald-700 leading-none">
                    {formatUzs(inst.pricing.monthlyMin)}
                  </p>
                  {inst.pricing.monthlyMax && inst.pricing.monthlyMax !== inst.pricing.monthlyMin && (
                    <p className="mt-1.5 text-base text-emerald-600">— {formatUzs(inst.pricing.monthlyMax)}</p>
                  )}
                  <p className="mt-1 text-sm text-emerald-500">/ {t(lang, ui.perMonth)}</p>
                </div>
                {(inst.pricing.paymentMethods?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-bold text-gray-500">{t(lang, ui.payment)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(inst.pricing.paymentMethods ?? []).map((m: string) => (
                        <span key={m} className="rounded-xl bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Guest — narx hint */}
            {isGuest && inst.pricing?.monthlyMin && (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">💰</span>
                  <div>
                    <p className="text-sm text-emerald-600 font-semibold">{t(lang, ui.priceFrom)}</p>
                    <p className="text-2xl font-black text-emerald-700">{formatUzs(inst.pricing.monthlyMin)}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/70 px-4 py-3.5 text-base text-emerald-700 font-medium flex items-center gap-2">
                  <span>🔐</span>
                  <span>
                    {lang === 'ru'
                      ? 'Все детали после входа'
                      : "Batafsil ma'lumot kirgandan so'ng"}
                  </span>
                </div>
              </div>
            )}

            {/* Contact card — faqat auth bo'lganda */}
            {!isGuest && <>
              <div className="rounded-3xl bg-white p-5 shadow-md border border-gray-100">
                <h3 className="mb-4 font-black text-gray-900 text-lg flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-xl">📞</span>
                  {t(lang, ui.contactTitle)}
                </h3>
                <div className="space-y-2.5">
                  {inst.phone && (
                    <a
                      href={`tel:${inst.phone}`}
                      onClick={() => trackContactClick('phone', inst.id)}
                      className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-4 font-bold text-white shadow-sm transition-all hover:shadow-md hover:opacity-95 active:scale-95"
                    >
                      <span className="text-2xl shrink-0">📞</span>
                      <div className="min-w-0">
                        <div className="text-base font-bold">{t(lang, ui.call)}</div>
                        <div className="text-sm font-normal opacity-90 truncate">{inst.phone}</div>
                      </div>
                    </a>
                  )}
                  {inst.telegram && (
                    <a
                      href={`https://t.me/${inst.telegram.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('telegram', inst.id)}
                      className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-4 font-bold text-white shadow-sm transition-all hover:shadow-md hover:opacity-95 active:scale-95"
                    >
                      <span className="text-2xl shrink-0">✈️</span>
                      <div className="min-w-0">
                        <div className="text-base font-bold">Telegram</div>
                        <div className="text-sm font-normal opacity-90 truncate">@{inst.telegram.replace('@', '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.instagram && (
                    <a
                      href={`https://instagram.com/${inst.instagram.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('instagram', inst.id)}
                      className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-4 font-bold text-white shadow-sm transition-all hover:shadow-md hover:opacity-95 active:scale-95"
                    >
                      <span className="text-2xl shrink-0">📸</span>
                      <div className="min-w-0">
                        <div className="text-base font-bold">Instagram</div>
                        <div className="text-sm font-normal opacity-90 truncate">@{inst.instagram.replace('@', '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.website && (
                    <a
                      href={inst.website.startsWith('http') ? inst.website : `https://${inst.website}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('website', inst.id)}
                      className="flex items-center gap-3 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-4 font-semibold text-gray-700 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                    >
                      <span className="text-2xl shrink-0">🌐</span>
                      <div className="min-w-0">
                        <div className="text-base font-bold">{t(lang, ui.website)}</div>
                        <div className="text-sm text-gray-400 truncate">{inst.website.replace(/^https?:\/\//, '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.address && (
                    <div className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-4 border border-gray-100">
                      <span className="mt-0.5 text-2xl shrink-0">📍</span>
                      <div>
                        <p className="text-sm text-gray-400 font-semibold mb-1">{t(lang, ui.address)}</p>
                        <p className="text-base text-gray-700 leading-snug">{inst.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>}

            {/* Sharh yozish tugmasi — auth bo'lganda */}
            {!isGuest && (
              <a
                href="#write-review"
                className="btn-primary w-full text-base py-4"
              >
                ✍️ {t(lang, ui.writeReview)}
              </a>
            )}

            {/* Guest — Sharh yozish CTA */}
            {isGuest && (
              <Link
                href="/auth"
                className="btn-secondary w-full text-base py-4"
              >
                ✍️ {lang === 'ru' ? 'Войдите чтобы оставить отзыв' : "Sharh yozish uchun kiring"}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mehmon foydalanuvchilar uchun kontakt ma'lumoti to'plovchi widget */}
      {isGuest && <GuestLeadWidget />}
    </main>
  )
}
