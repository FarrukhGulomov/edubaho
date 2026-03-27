'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import StarRating from '@/components/shared/StarRating'
import InstActions from '@/components/institutions/InstActions'
import WriteReview from '@/components/institutions/WriteReview'
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

function calcRatingBreakdown(reviews: Institution['reviews']) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  if (!reviews) return counts
  for (const r of reviews) counts[r.overallRating] = (counts[r.overallRating] ?? 0) + 1
  return counts
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
    <div className="relative rounded-2xl overflow-hidden" data-gate-type={gateType}>
      {/* Blurred preview content */}
      {blurPreview && (
        <div className="pointer-events-none select-none blur-[3px] opacity-60 saturate-50">
          {blurPreview}
        </div>
      )}

      {/* Overlay */}
      <div className={`${blurPreview ? 'absolute inset-0' : ''} flex items-center justify-center bg-white/80 backdrop-blur-sm`}>
        <div className="mx-4 w-full max-w-sm rounded-2xl border border-primary-100 bg-white p-6 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-2xl shadow-sm">
            🔐
          </div>
          <h3 className="mb-1.5 text-base font-black text-gray-900">
            {lang === 'ru' ? 'Войдите для просмотра' : "Ko'rish uchun kiring"}
          </h3>
          <p className="mb-4 text-sm text-gray-500 leading-relaxed">
            {lang === 'ru'
              ? 'Контакты, цены и отзывы доступны только зарегистрированным пользователям'
              : "Kontaktlar, narxlar va sharhlar faqat ro'yxatdan o'tgan foydalanuvchilarga ko'rinadi"}
          </p>
          <Link
            href="/auth"
            onClick={() => trackGateCta(gateType ?? 'gate', institutionId)}
            className="block w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-95"
          >
            {lang === 'ru' ? 'Зарегистрироваться / Войти' : "Ro'yxatdan o'tish / Kirish"}
          </Link>
          <p className="mt-2 text-xs text-gray-400">
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
    <div className="rounded-2xl border-2 border-primary-100 bg-gradient-to-br from-primary-50 via-white to-blue-50 p-6 shadow-card">
      {/* Top badge */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-xl shadow-sm">
          🎓
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary-600">EduReyting.uz</p>
          <p className="text-xs text-gray-500">
            {lang === 'ru' ? "O'zbekiston ta'lim platformasi" : "O'zbekiston ta'lim platformasi"}
          </p>
        </div>
      </div>

      <h3 className="mb-2 text-xl font-black text-gray-900 leading-snug">
        {lang === 'ru'
          ? 'Хотите знать больше?'
          : "Ko'proq bilmoqchimisiz?"}
      </h3>
      <p className="mb-5 text-sm text-gray-600 leading-relaxed">
        {lang === 'ru'
          ? 'Зарегистрируйтесь бесплатно и получите доступ к контактам, ценам, отзывам и возможности оставить свой отзыв'
          : "Bepul ro'yxatdan o'ting va kontaktlar, narxlar, sharhlar hamda o'z sharhingizni yozish imkoniyatiga ega bo'ling"}
      </p>

      {/* Benefits list */}
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
          ['💬', 'Ota-onalar va o\'quvchilarning barcha sharhlari'],
          ['✍️', 'O\'z sharhingizni yozish'],
          ['🔖', 'Muassasalarni saqlash va solishtirish'],
        ]).map(([icon, text]) => (
          <li key={text} className="flex items-center gap-2.5 text-sm text-gray-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm">{icon}</span>
            {text}
          </li>
        ))}
      </ul>

      <Link
        href="/auth"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-95"
      >
        {lang === 'ru' ? 'Зарегистрироваться бесплатно →' : "Bepul ro'yxatdan o'tish →"}
      </Link>
      <p className="mt-2 text-center text-xs text-gray-400">
        {lang === 'ru' ? 'Только номер телефона · SMS-код' : 'Faqat telefon raqam · SMS-kod'}
      </p>
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

  const typeLabel = TYPE_LABELS[inst.type]
  const displayName = lang === 'ru' && inst.nameRu ? inst.nameRu : inst.nameUz
  const description = lang === 'ru' && inst.details?.descriptionRu
    ? inst.details.descriptionRu
    : inst.details?.descriptionUz

  const ratingBreakdown = calcRatingBreakdown(inst.reviews)
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
    shifts:          { uz: 'Dars vaqtlari',            ru: 'Расpisanie' },
    previewDesc:     { uz: 'To\'liq ma\'lumot uchun tizimga kiring', ru: 'Войдите для полной информации' },
  }

  // Auth tekshiruvi tugamaguncha skeleton ko'rsatmaymiz (flash oldini olish)
  if (!authChecked) return null

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Breadcrumb ─── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <nav className="mx-auto flex max-w-5xl items-center gap-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-primary-600 transition-colors">{t(lang, ui.breadHome)}</Link>
          <span className="text-gray-300">›</span>
          <Link href="/search" className="hover:text-primary-600 transition-colors">{t(lang, ui.breadSearch)}</Link>
          <span className="text-gray-300">›</span>
          <span className="font-semibold text-gray-800 max-w-48 truncate">{displayName}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-3">

          {/* ── Left column ─── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Header card — HAMMAGA KO'RINADI */}
            <div className="rounded-2xl bg-white p-6 shadow-card border border-gray-100">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="badge bg-primary-50 text-primary-700 text-xs">
                  {typeLabel ? t(lang, typeLabel) : inst.type}
                </span>
                {inst.isVerified && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    {t(lang, ui.verified)}
                  </span>
                )}
                {inst.subscription?.plan === 'PREMIUM' && (
                  <span className="badge bg-amber-50 text-amber-700 text-xs">⭐ {t(lang, ui.premium)}</span>
                )}
                {/* Guest badge */}
                {isGuest && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">
                    🔐 {lang === 'ru' ? 'Войдите для полного доступа' : "To'liq ma'lumot uchun kiring"}
                  </span>
                )}
              </div>

              <h1 className="mb-1 text-2xl font-black text-gray-900 leading-tight sm:text-3xl">{displayName}</h1>
              {lang === 'uz' && inst.nameRu && (
                <p className="mb-3 text-sm text-gray-400">{inst.nameRu}</p>
              )}

              {/* Rating — HAMMAGA KO'RINADI */}
              {inst.avgRating && inst.reviewCount > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-gray-900">{inst.avgRating.toFixed(1)}</span>
                  <div>
                    <StarRating rating={inst.avgRating} size="lg" />
                    <button
                      onClick={() => {
                        if (isGuest) {
                          document.getElementById('auth-gate-reviews')?.scrollIntoView({ behavior: 'smooth' })
                        } else {
                          document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })
                        }
                      }}
                      className="mt-0.5 block text-sm text-gray-500 hover:text-primary-600 transition-colors"
                    >
                      {inst.reviewCount} {t(lang, ui.reviews)}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick stats — HAMMAGA KO'RINADI (asosiy raqamlar) */}
            {(() => {
              const stats = [
                inst.details?.foundedYear && {
                  icon: '📅', label: t(lang, ui.founded),
                  value: String(inst.details.foundedYear),
                  color: 'bg-blue-50 text-blue-700',
                },
                inst.details?.studentCount && {
                  icon: '👥', label: t(lang, ui.students),
                  value: `${formatNum(inst.details.studentCount)}+`,
                  color: 'bg-cyan-50 text-cyan-700',
                },
                inst.details?.teacherCount && {
                  icon: '👨‍🏫', label: t(lang, ui.teachers),
                  value: String(inst.details.teacherCount),
                  color: 'bg-violet-50 text-violet-700',
                },
                (inst.details?.languages?.length ?? 0) > 0 && {
                  icon: '🌐', label: t(lang, ui.languages),
                  value: (inst.details!.languages ?? []).join(', ').toUpperCase(),
                  color: 'bg-teal-50 text-teal-700',
                },
                // Narx: faqat "dan X so'm" ko'rsatiladi, to'liq ma'lumot uchun auth kerak
                inst.pricing?.monthlyMin && {
                  icon: '💰', label: t(lang, ui.perMonth),
                  value: isGuest
                    ? `${formatUzs(inst.pricing.monthlyMin)} ${lang === 'ru' ? 'от' : 'dan'}`
                    : formatUzs(inst.pricing.monthlyMin),
                  color: 'bg-emerald-50 text-emerald-700',
                },
              ].filter(Boolean) as { icon: string; label: string; value: string; color: string }[]

              if (stats.length === 0) return null
              return (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {stats.map(stat => (
                    <div key={stat.label} className={`flex items-center gap-3 rounded-2xl p-4 ${stat.color}`}>
                      <span className="text-2xl shrink-0">{stat.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs opacity-70 leading-tight">{stat.label}</p>
                        <p className="font-black text-sm leading-snug truncate">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* About — PREVIEW + GATE */}
            <div className="rounded-2xl bg-white p-6 shadow-card border border-gray-100">
              <h2 className="mb-4 text-lg font-black text-gray-900 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-base">📖</span>
                {t(lang, ui.about)}
              </h2>

              {isGuest ? (
                <>
                  {/* Preview — dastlabki 120 ta belgi */}
                  {description && (
                    <p className="text-gray-700 leading-relaxed">
                      {description.slice(0, 120)}
                      <span className="text-gray-400">…</span>
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
                    <span className="text-lg">🔐</span>
                    <p className="text-sm text-orange-700 font-medium">
                      {lang === 'ru'
                        ? 'Полное описание доступно после входа'
                        : "To'liq ta'rif tizimga kirgandan so'ng ko'rinadi"}
                    </p>
                    <Link href="/auth" className="ml-auto shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 transition-colors">
                      {lang === 'ru' ? 'Войти' : 'Kirish'}
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  {description ? (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{description}</p>
                  ) : (
                    <p className="text-gray-400 text-sm italic">{t(lang, ui.noDescription)}</p>
                  )}

                  {inst.details && (
                    inst.details.foundedYear || inst.details.studentCount ||
                    inst.details.teacherCount || (inst.details.languages?.length ?? 0) > 0
                  ) && (
                    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-50 pt-5">
                      {inst.details.foundedYear && (
                        <div className="rounded-xl bg-gray-50 px-4 py-3">
                          <dt className="text-xs text-gray-400 mb-1">{t(lang, ui.founded)}</dt>
                          <dd className="font-black text-gray-900">{inst.details.foundedYear}</dd>
                        </div>
                      )}
                      {inst.details.studentCount && (
                        <div className="rounded-xl bg-gray-50 px-4 py-3">
                          <dt className="text-xs text-gray-400 mb-1">{t(lang, ui.students)}</dt>
                          <dd className="font-black text-gray-900">{formatNum(inst.details.studentCount)}+</dd>
                        </div>
                      )}
                      {inst.details.teacherCount && (
                        <div className="rounded-xl bg-gray-50 px-4 py-3">
                          <dt className="text-xs text-gray-400 mb-1">{t(lang, ui.teachers)}</dt>
                          <dd className="font-black text-gray-900">{inst.details.teacherCount}</dd>
                        </div>
                      )}
                      {(inst.details.languages?.length ?? 0) > 0 && (
                        <div className="rounded-xl bg-gray-50 px-4 py-3 col-span-2 sm:col-span-1">
                          <dt className="text-xs text-gray-400 mb-2">{t(lang, ui.languages)}</dt>
                          <dd className="flex flex-wrap gap-1.5">
                            {(inst.details.languages ?? []).map(l => (
                              <span key={l} className="rounded-lg bg-primary-100 px-2.5 py-0.5 text-xs font-black text-primary-700">
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

            {/* Course-specific sections — faqat auth bo'lganda */}
            {!isGuest && isCourseOrSchool && (
              <>
                {(inst.details?.programs?.length ?? 0) > 0 && (
                  <div className="rounded-2xl bg-white p-6 shadow-card border border-gray-100">
                    <h2 className="mb-4 text-lg font-black text-gray-900 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-base">📚</span>
                      {t(lang, ui.programs)}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.programs ?? []).map(prog => (
                        <span key={prog} className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700">
                          {prog}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(inst.details?.specializations?.length ?? 0) > 0 && (
                  <div className="rounded-2xl bg-white p-6 shadow-card border border-gray-100">
                    <h2 className="mb-4 text-lg font-black text-gray-900 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-base">🎯</span>
                      {t(lang, ui.specializations)}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.specializations ?? []).map(spec => (
                        <span key={spec} className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(inst.details?.shifts?.length ?? 0) > 0 && (
                  <div className="rounded-2xl bg-white p-6 shadow-card border border-gray-100">
                    <h2 className="mb-4 text-lg font-black text-gray-900 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-base">🕐</span>
                      {t(lang, ui.shifts)}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.shifts ?? []).map(shift => (
                        <span key={shift} className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                          🕐 {shift}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {inst.details?.achievements && (
                  <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 p-6 shadow-card">
                    <h2 className="mb-3 text-lg font-black text-emerald-900 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-base">🏆</span>
                      {t(lang, ui.achievements)}
                    </h2>
                    <p className="text-emerald-800 leading-relaxed whitespace-pre-line text-sm">{inst.details.achievements}</p>
                  </div>
                )}
              </>
            )}

            {/* Rating breakdown — faqat auth bo'lganda */}
            {!isGuest && totalReviews > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-card border border-gray-100">
                <h2 className="mb-5 font-black text-gray-900 text-lg flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-base">📊</span>
                  {t(lang, ui.ratingTitle)}
                </h2>
                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingBreakdown[star] ?? 0
                    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="w-4 text-sm font-black text-gray-700 text-right shrink-0">{star}</span>
                        <span className="text-yellow-400 shrink-0">★</span>
                        <div className="flex-1 rounded-full bg-gray-100 h-2 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-xs text-gray-500 text-right shrink-0">{count}</span>
                      </div>
                    )
                  })}
                </div>
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
                    <div className="rounded-2xl bg-white p-6 shadow-card border border-gray-100">
                      <h2 className="mb-5 text-lg font-black text-gray-900 flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-base">💬</span>
                        {t(lang, ui.reviewsTitle)}
                        <span className="ml-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-sm font-black text-primary-700">
                          {inst.reviewCount}
                        </span>
                      </h2>
                      <div className="space-y-4">
                        {inst.reviews.slice(0, 2).map(review => (
                          <div key={review.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <div className="mb-2 flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-black text-white">
                                {review.isAnonymous ? '?' : (review.user?.name?.[0]?.toUpperCase() ?? '?')}
                              </div>
                              <StarRating rating={review.overallRating} size="sm" />
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{review.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : undefined
                }
              >
                {/* Auth bo'lganda ko'rinadigan to'liq sharhlar */}
                <div id="reviews" className="rounded-2xl bg-white p-6 shadow-card border border-gray-100">
                  <h2 className="mb-5 text-lg font-black text-gray-900 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-base">💬</span>
                    {t(lang, ui.reviewsTitle)}
                    {inst.reviewCount > 0 && (
                      <span className="ml-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-sm font-black text-primary-700">
                        {inst.reviewCount}
                      </span>
                    )}
                  </h2>
                  {inst.reviews && inst.reviews.length > 0 ? (
                    <div className="space-y-4">
                      {inst.reviews.map(review => (
                        <div key={review.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-black text-white">
                                {review.isAnonymous ? '?' : (review.user?.name?.[0]?.toUpperCase() ?? '?')}
                              </div>
                              <div>
                                <span className="block font-bold text-gray-800 text-sm">
                                  {review.isAnonymous ? t(lang, ui.anon) : (review.user?.name ?? t(lang, ui.user))}
                                </span>
                                <StarRating rating={review.overallRating} size="sm" />
                              </div>
                            </div>
                            {review.createdAt && (
                              <span className="shrink-0 text-xs text-gray-400">
                                {new Date(review.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ')}
                              </span>
                            )}
                          </div>
                          {review.title && <p className="mb-1 font-bold text-gray-800 text-sm">{review.title}</p>}
                          <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>
                          {review.helpfulCount > 0 && (
                            <p className="mt-2 text-xs text-gray-400">👍 {review.helpfulCount} {t(lang, ui.helpful)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl">💬</div>
                      <p className="font-bold text-gray-600">{t(lang, ui.noReviews)}</p>
                      <p className="mt-1 text-sm text-gray-400">{t(lang, ui.beFirst)}</p>
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

            {/* Price card — faqat auth bo'lganda */}
            {!isGuest && inst.pricing?.monthlyMin && (
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-card">
                <h3 className="mb-4 font-black text-gray-900 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-sm">💰</span>
                  {t(lang, ui.priceTitle)}
                </h3>
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 p-4 border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-semibold mb-1">{t(lang, ui.priceFrom)}</p>
                  <p className="text-2xl font-black text-emerald-700 leading-none">
                    {formatUzs(inst.pricing.monthlyMin)}
                  </p>
                  {inst.pricing.monthlyMax && inst.pricing.monthlyMax !== inst.pricing.monthlyMin && (
                    <p className="mt-1 text-sm text-emerald-600">— {formatUzs(inst.pricing.monthlyMax)}</p>
                  )}
                  <p className="mt-0.5 text-xs text-emerald-500">/ {t(lang, ui.perMonth)}</p>
                </div>
                {(inst.pricing.paymentMethods?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-bold text-gray-500">{t(lang, ui.payment)}</p>
                    <div className="flex flex-wrap gap-1">
                      {(inst.pricing.paymentMethods ?? []).map((m: string) => (
                        <span key={m} className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Guest — narx hint */}
            {isGuest && inst.pricing?.monthlyMin && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-lg">💰</span>
                  <div>
                    <p className="text-xs text-emerald-600 font-semibold">{t(lang, ui.priceFrom)}</p>
                    <p className="text-xl font-black text-emerald-700">{formatUzs(inst.pricing.monthlyMin)}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-white/70 px-3 py-2.5 text-sm text-emerald-700 font-medium flex items-center gap-2">
                  <span>🔐</span>
                  <span>
                    {lang === 'ru'
                      ? 'Все детали после входа'
                      : "Batafsil ma'lumot kirgandan so'ng"}
                  </span>
                </div>
              </div>
            )}

            {/* Contact card — GATE bilan */}
            <GuestGate
              isGuest={isGuest}
              lang={lang}
              gateType="contacts"
              institutionId={inst.id}
              blurPreview={
                <div className="rounded-2xl bg-white p-5 shadow-card border border-gray-100">
                  <h3 className="mb-4 font-black text-gray-900 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-sm">📞</span>
                    {t(lang, ui.contactTitle)}
                  </h3>
                  <div className="space-y-2">
                    {/* Blurred mock buttons */}
                    <div className="h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500" />
                    {inst.telegram && <div className="h-14 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500" />}
                    {inst.address && <div className="h-14 rounded-xl bg-gray-100" />}
                  </div>
                </div>
              }
            >
              <div className="rounded-2xl bg-white p-5 shadow-card border border-gray-100">
                <h3 className="mb-4 font-black text-gray-900 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-sm">📞</span>
                  {t(lang, ui.contactTitle)}
                </h3>
                <div className="space-y-2">
                  {inst.phone && (
                    <a
                      href={`tel:${inst.phone}`}
                      onClick={() => trackContactClick('phone', inst.id)}
                      className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3.5 font-bold text-white shadow-sm transition-all hover:shadow-md hover:opacity-95 active:scale-95"
                    >
                      <span className="text-xl shrink-0">📞</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{t(lang, ui.call)}</div>
                        <div className="text-xs font-normal opacity-90 truncate">{inst.phone}</div>
                      </div>
                    </a>
                  )}
                  {inst.telegram && (
                    <a
                      href={`https://t.me/${inst.telegram.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('telegram', inst.id)}
                      className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-3.5 font-bold text-white shadow-sm transition-all hover:shadow-md hover:opacity-95 active:scale-95"
                    >
                      <span className="text-xl shrink-0">✈️</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold">Telegram</div>
                        <div className="text-xs font-normal opacity-90 truncate">@{inst.telegram.replace('@', '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.instagram && (
                    <a
                      href={`https://instagram.com/${inst.instagram.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('instagram', inst.id)}
                      className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3.5 font-bold text-white shadow-sm transition-all hover:shadow-md hover:opacity-95 active:scale-95"
                    >
                      <span className="text-xl shrink-0">📸</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold">Instagram</div>
                        <div className="text-xs font-normal opacity-90 truncate">@{inst.instagram.replace('@', '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.website && (
                    <a
                      href={inst.website.startsWith('http') ? inst.website : `https://${inst.website}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('website', inst.id)}
                      className="flex items-center gap-3 rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 font-semibold text-gray-700 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                    >
                      <span className="text-xl shrink-0">🌐</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{t(lang, ui.website)}</div>
                        <div className="text-xs text-gray-400 truncate">{inst.website.replace(/^https?:\/\//, '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.address && (
                    <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
                      <span className="mt-0.5 text-xl shrink-0">📍</span>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold mb-0.5">{t(lang, ui.address)}</p>
                        <p className="text-sm text-gray-700 leading-snug">{inst.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GuestGate>

            {/* Sharh yozish tugmasi — auth bo'lganda */}
            {!isGuest && (
              <a
                href="#write-review"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 py-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95"
              >
                ✍️ {t(lang, ui.writeReview)}
              </a>
            )}

            {/* Guest — Sharh yozish CTA */}
            {isGuest && (
              <Link
                href="/auth"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary-200 bg-white py-4 text-sm font-bold text-primary-600 shadow-sm transition-all hover:bg-primary-50 hover:border-primary-400"
              >
                ✍️ {lang === 'ru' ? 'Войдите чтобы оставить отзыв' : "Sharh yozish uchun kiring"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
