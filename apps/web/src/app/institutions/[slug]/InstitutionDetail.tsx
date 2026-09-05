'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import {
  ChevronRight, MapPin, BadgeCheck, Sparkles, Lock, BookOpen, Trophy,
  Users2, GraduationCap, Palette, Laptop, Globe2, UserCheck, Dumbbell,
  PencilLine, Wallet, Info, BarChart3, MessageCircle, Phone, Send,
  Instagram, Globe, Clock, ThumbsUp, Star, Award, Building2,
} from 'lucide-react'
import StarRating, { RatingHint } from '@/components/shared/StarRating'
import InstActions from '@/components/institutions/InstActions'
import ClaimInstitution from '@/components/institutions/ClaimInstitution'
import TrialBookingWidget from '@/components/institutions/TrialBookingWidget'
import WriteReview from '@/components/institutions/WriteReview'
import GuestLeadWidget from '@/components/shared/GuestLeadWidget'
import VerificationBadge from '@/components/shared/VerificationBadge'
import { formatStudentRange } from '@/lib/studentRange'
import { formatUzs, priceFrom } from '@/lib/price'
import { reviewsRu } from '@/lib/plural'
import { useLang, t } from '@/contexts/LangContext'
import { authHref } from '@/lib/authHref'
import { institutionsApi } from '@/lib/api'
import {
  trackInstitutionView, trackGateShown, trackGateCta, trackContactClick,
} from '@/lib/analytics'
import type { Institution } from './page'


/** Manzil uchun Google Maps havolasi \u2014 koordinata bo'lsa aniq nuqta, bo'lmasa matn qidiruv */
function mapsUrl(inst: { address?: string; lat?: number; lng?: number }): string | null {
  if (!inst.address) return null
  if (inst.lat != null && inst.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${inst.lat},${inst.lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inst.address)}`
}

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

// O'qitish tili kodlari → tushunarli nom (xom "UZ"/"RU" ko'rsatmaslik uchun)
const LANGUAGE_NAMES: Record<string, { uz: string; ru: string }> = {
  UZ: { uz: "O'zbek tili",  ru: 'Узбекский' },
  RU: { uz: 'Rus tili',     ru: 'Русский' },
  EN: { uz: 'Ingliz tili',  ru: 'Английский' },
}

// Muassasa turi bo'yicha ikonka (lucide) — bitta izchil aksent rangda
const TYPE_ICONS: Record<string, typeof BookOpen> = {
  KINDERGARTEN:    Palette,
  SCHOOL:          BookOpen,
  LYCEUM:          Trophy,
  COLLEGE:         GraduationCap,
  UNIVERSITY:      GraduationCap,
  COURSE_CENTER:   PencilLine,
  LANGUAGE_CENTER: Globe2,
  IT_SCHOOL:       Laptop,
  TUTORING:        UserCheck,
  SPORTS_SCHOOL:   Dumbbell,
  ARTS_SCHOOL:     Palette,
}

function calcRatingBreakdown(reviews: Institution['reviews']) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  if (!reviews) return counts
  for (const r of reviews) counts[r.overallRating] = (counts[r.overallRating] ?? 0) + 1
  return counts
}

// Mezonlar bo'yicha o'rtacha baholar
const DIM_DEFS = [
  { key: 'teacherRating',    Icon: UserCheck,     label: "O'qituvchilar" },
  { key: 'facilityRating',   Icon: BookOpen,      label: 'Sharoit' },
  { key: 'valueRating',      Icon: Wallet,        label: 'Narx/Sifat' },
  { key: 'atmosphereRating', Icon: Sparkles,      label: 'Muhit' },
  { key: 'serviceRating',    Icon: Phone,         label: 'Aloqa' },
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
  next,
}: {
  isGuest: boolean
  lang: 'uz' | 'ru'
  blurPreview?: React.ReactNode
  children: React.ReactNode
  gateType?: string
  institutionId?: string
  next?: string
}) {
  if (!isGuest) return <>{children}</>

  return (
    <div className="relative rounded-2xl overflow-hidden" data-gate-type={gateType}>
      {/* Xira ko'rsatilgan namuna — o'qib bo'lmaydi, shuning uchun ekran
          o'quvchisiga ham berilmaydi (aks holda tushunarsiz shovqin bo'lardi).
          Nima ekani overlay matnida aniq aytiladi. */}
      {blurPreview && (
        <div
          aria-hidden="true"
          className="pointer-events-none select-none blur-[3px] opacity-60 saturate-50"
        >
          {blurPreview}
        </div>
      )}

      {/* Overlay — RegisterBanner'dan (sidebar) YENGILROQ: bu faqat shu bo'lim
          (masalan, sharhlar) uchun kontekstual eslatma, ikkinchi to'liq sotuv
          taklifi emas — shuning uchun qisqa, bitta CTA, ortiqcha izohsiz */}
      <div className={`${blurPreview ? 'absolute inset-0' : ''} flex items-center justify-center bg-white/80 backdrop-blur-sm`}>
        <div className="mx-4 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Lock className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h3 className="mb-1.5 text-base font-bold text-gray-900">
            {t(lang, { uz: 'Sharhlardan namunalar', ru: 'Примеры отзывов' })}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-500">
            {t(lang, {
              uz: "Barcha sharhlarni ko'rish uchun tizimga kiring.",
              ru: 'Войдите, чтобы посмотреть все отзывы.',
            })}
          </p>
          <Link
            href={authHref(next)}
            onClick={() => trackGateCta(gateType ?? 'gate', institutionId)}
            className="btn-primary w-full text-sm py-2.5"
          >
            {t(lang, { uz: 'Kirish', ru: 'Войти' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Registration CTA banner — sahifa o'rtasida bitta ulkan taklif
// ─────────────────────────────────────────────────────────────
function RegisterBanner({ lang, next }: { lang: 'uz' | 'ru'; next?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Phone className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h3 className="font-semibold leading-tight text-gray-900">
          {t(lang, {
            uz: "Kontaktlarni va batafsil ma'lumotlarni ko'ring",
            ru: 'Посмотрите контакты и подробную информацию',
          })}
        </h3>
      </div>

      {/* BITTA qisqa izoh — ilgari bu yerda 5 punktli ro'yxat bor edi va
          yana 4 joyda xuddi shu kirish taklifi takrorlanardi */}
      <p className="mb-4 text-sm leading-relaxed text-gray-500">
        {t(lang, {
          uz: "Telefon, Telegram, Instagram, to'lov usullari va barcha sharhlarni ko'rish uchun bepul ro'yxatdan o'ting.",
          ru: 'Зарегистрируйтесь бесплатно, чтобы увидеть телефон, Telegram, Instagram, способы оплаты и все отзывы.',
        })}
      </p>

      <Link href={authHref(next)} className="btn-primary w-full py-3 text-base">
        {t(lang, { uz: "Bepul ro'yxatdan o'tish", ru: 'Зарегистрироваться бесплатно' })}
      </Link>
      <p className="mt-3 text-center text-xs text-gray-400">
        {t(lang, { uz: 'Telegram yoki Google · Bepul', ru: 'Telegram или Google · Бесплатно' })}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Asosiy komponent
// ─────────────────────────────────────────────────────────────
export default function InstitutionDetail({ inst: initialInst }: { inst: Institution }) {
  const { lang } = useLang()
  // SSR'dagi `inst` prop doim mehmon (guest) ko'rinishida keladi — bu sahifa
  // ISR bilan keshlanadi, shuning uchun server hech qachon shu fetch orqali
  // haqiqiy bog'lanish ma'lumotini yubormaydi (aks holda bitta foydalanuvchi
  // ko'rgan telefon raqami keshdan HAMMAGA ko'rinib qolardi). Ro'yxatdan
  // o'tgan foydalanuvchi uchun quyida token bilan qayta so'rov yuborilib,
  // faqat shu holatda haqiqiy telefon/telegram/... state'ga qo'shiladi.
  const [inst, setInst] = useState(initialInst)
  const [isGuest, setIsGuest] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  // Login'dan keyin shu sahifaga qaytish uchun barcha gate havolalariga beriladi
  const instPath = `/institutions/${initialInst.slug}`
  const viewTracked = useRef(false)
  const gatesShown = useRef<Set<string>>(new Set())

  // Client-side auth tekshiruvi + sahifa view tracking
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const guest = !token
    setIsGuest(guest)
    setAuthChecked(true)

    // Ro'yxatdan o'tgan bo'lsa — bog'lanish ma'lumotlarini token bilan qayta yuklaymiz
    if (token) {
      institutionsApi.get(initialInst.slug, token)
        .then(({ data }) => setInst((prev) => ({ ...prev, ...(data as Partial<Institution>) })))
        .catch(() => {
          // Xato bo'lsa — mehmon ko'rinishida qoladi (gate ko'rsatiladi), sahifa buzilmaydi
        })
    }

    // Muassasa ko'rildi
    if (!viewTracked.current) {
      viewTracked.current = true
      trackInstitutionView(initialInst.id, {
        type: initialInst.type,
        isGuest: guest,
        hasRating: !!initialInst.avgRating,
      })
    }
  }, [initialInst.id, initialInst.type, initialInst.avgRating, initialInst.slug])

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
  const TypeIcon       = TYPE_ICONS[inst.type] ?? BookOpen
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
    students:        { uz: 'Markazda tahsil olayotganlar', ru: 'Обучаются в центре' },
    teachers:        { uz: "O'qituvchilar soni",       ru: 'Преподавателей' },
    languages:       { uz: "O'qitish tillari",         ru: 'Языки обучения' },
    payment:         { uz: "To'lov usullari",          ru: 'Способы оплаты' },
    ratingTitle:     { uz: 'Reyting taqsimoti',        ru: 'Распределение оценок' },
    about:           { uz: 'Muassasa haqida',          ru: 'Об учреждении' },
    address:         { uz: 'Manzil',                   ru: 'Адрес' },
    branches:        { uz: 'Filiallar',                ru: 'Филиалы' },
    mainBranch:      { uz: 'Asosiy',                   ru: 'Основной' },
    noDescription:   { uz: "Ta'rif kiritilmagan.",     ru: 'Описание не добавлено.' },
    programs:        { uz: "O'qitiladigan fanlar",     ru: 'Преподаваемые предметы' },
    specializations: { uz: 'Ixtisosliklar',            ru: 'Специализации' },
    achievements:    { uz: 'Muvaffaqiyatlar',          ru: 'Достижения' },
    shifts:          { uz: 'Dars vaqtlari',            ru: 'Расписание занятий' },
    previewDesc:     { uz: 'To\'liq ma\'lumot uchun tizimga kiring', ru: 'Войдите для полной информации' },
  }

  // Auth tekshiruvi tugamaguncha skeleton ko'rsatmaymiz (flash oldini olish)
  if (!authChecked) return null

  return (
    <main className="flex-1 bg-gray-50">
      {/* ── Toza, minimalistik hero — gradient/dekor yo'q ─── */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 py-4 text-sm text-gray-500" aria-label={t(lang, ui.breadHome)}>
            {/* inline-flex items-center: global `a { min-height: 44px }` (touch target)
                blockifies bu linklarni flex item sifatida — shu sabab matn markazlashtirilishi
                uchun har bir link o'zi ham flex konteyner bo'lishi kerak, aks holda matn
                44px balandlikdagi qutining yuqorisiga yopishib qoladi (span bilan solishtirganda
                pastroq ko'rinadi) */}
            <Link href="/" className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-md px-1 leading-none hover:text-gray-900 transition-colors">{t(lang, ui.breadHome)}</Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <Link href="/search" className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-md px-1 leading-none hover:text-gray-900 transition-colors">{t(lang, ui.breadSearch)}</Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <span className="min-w-0 flex-1 truncate font-medium leading-none text-gray-900">{displayName}</span>
          </nav>

          {/* Muassasa ma'lumotlari */}
          <div className="flex flex-col gap-5 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              {/* Tur ikonasi */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <TypeIcon className="h-8 w-8" strokeWidth={1.6} />
              </div>

              {/* Nom va teglar */}
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {typeLabel ? t(lang, typeLabel) : inst.type}
                  </span>
                  <VerificationBadge level={inst.verificationLevel} lang={lang} size="sm" />
                  {(inst.accreditations?.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      <Award className="h-3.5 w-3.5" strokeWidth={2} />
                      {lang === 'ru' ? 'Есть лицензия/документы' : 'Litsenziya/hujjatlar mavjud'}
                    </span>
                  )}
                  {inst.subscription?.plan === 'PREMIUM' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                      {t(lang, ui.premium)}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">{displayName}</h1>
                {/* Ruscha nom faqat farq qilsa ko'rsatiladi — bir xil nomni ikki marta chiqarmaymiz */}
                {lang === 'uz' && inst.nameRu && inst.nameRu !== inst.nameUz && (
                  <p className="mt-0.5 text-sm text-gray-400">{inst.nameRu}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {cityDisplayName && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {cityDisplayName}
                    </span>
                  )}
                  {/* Reyting — ataylab TINCH ko'rsatiladi: baholar foydalanuvchilar
                      tomonidan qo'yilgan taxminiy ko'rsatkich, asosiy parametr emas.
                      Batafsil ma'lumot sahifaning pastidagi sharhlar bo'limida. */}
                  {inst.avgRating && inst.reviewCount > 0 && (
                    <button
                      onClick={() => {
                        if (isGuest) document.getElementById('auth-gate-reviews')?.scrollIntoView({ behavior: 'smooth' })
                        else document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="-m-1.5 rounded-md p-1.5 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                      <RatingHint rating={inst.avgRating} count={inst.reviewCount} lang={lang} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-3">

          {/* ── Left column ─── */}
          <div className="lg:col-span-2 space-y-4">

            {/* ════════════════════════════════════════
                0. RASMLAR — Photo gallery
                ════════════════════════════════════════ */}
            {inst.media && inst.media.length > 0 && (() => {
              const extraThumbs = inst.media.slice(1, 5)
              const extraCount = inst.media.length - 5
              return (
                <div className="flex gap-1.5 overflow-hidden rounded-2xl" style={{ height: '320px' }}>
                  <div className="relative h-full flex-1">
                    <Image
                      src={inst.media[0].url}
                      alt={displayName}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      priority
                      className="object-cover"
                    />
                  </div>
                  {/* Qo'shimcha rasmlar — flex ustun, sonidan qat'i nazar (1-4 ta)
                      bo'sh joy qoldirmasdan barobar taqsimlanadi */}
                  {extraThumbs.length > 0 && (
                    <div className="hidden h-full w-64 shrink-0 flex-col gap-1.5 sm:flex">
                      {extraThumbs.map((m, i) => {
                        const isLast = i === extraThumbs.length - 1
                        return (
                          <div key={m.id} className="relative flex-1">
                            <Image
                              src={m.thumbnailUrl || m.url}
                              alt={m.caption || `${displayName} — ${i + 2}`}
                              fill
                              sizes="256px"
                              className="object-cover"
                            />
                            {isLast && extraCount > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-bold text-white">
                                +{extraCount}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ════════════════════════════════════════
                1. YO'NALISHLAR — Programs & Specializations
                ════════════════════════════════════════ */}
            {((inst.details?.programs?.length ?? 0) > 0 ||
              (inst.details?.specializations?.length ?? 0) > 0) && (
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-gray-900">
                  <span className="icon-chip"><BookOpen className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
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
                        <span key={prog} className="min-w-0 max-w-full [overflow-wrap:anywhere] rounded-lg border border-primary-100 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700">
                          {prog}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {(inst.details?.specializations?.length ?? 0) > 0 && (
                  <>
                    <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {t(lang, ui.specializations)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.specializations ?? []).map(spec => (
                        <span key={spec} className="min-w-0 max-w-full [overflow-wrap:anywhere] rounded-lg border border-orange-100 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* O'qitish tillari */}
                {(inst.details?.languages?.length ?? 0) > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                    <span className="text-xs font-semibold text-gray-500">
                      {t(lang, ui.languages)}:
                    </span>
                    {(inst.details!.languages ?? []).map(l => (
                      <span key={l} className="min-w-0 max-w-full [overflow-wrap:anywhere] rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">
                        {/* Xom kod (UZ/RU/EN) o'rniga tushunarli nom */}
                        {LANGUAGE_NAMES[l.toUpperCase()]?.[lang] ?? l.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* ════════════════════════════════════════
                2. NATIJA KO'RSATKICHLARI — Achievements
                ════════════════════════════════════════ */}
            {inst.details?.achievements && (
              <div className="card p-6">
                <h2 className="mb-1 flex items-center gap-3 text-lg font-semibold text-gray-900">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Trophy className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  {t(lang, ui.achievements)}
                </h2>
                <p className="mb-3 ml-12 text-sm text-gray-400">
                  {lang === 'ru' ? 'Результаты и достижения учеников' : "O'quvchilar natijalari va yutuqlari"}
                </p>
                <p className="whitespace-pre-line text-base leading-relaxed text-gray-700">
                  {inst.details.achievements}
                </p>
              </div>
            )}

            {/* ════════════════════════════════════════
                3. O'QITUVCHILAR SIFATI
                ════════════════════════════════════════ */}
            {(inst.details?.teacherCount || (inst.details?.shifts?.length ?? 0) > 0) && (
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-gray-900">
                  <span className="icon-chip"><UserCheck className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                  {t(lang, { uz: 'Markaz haqida raqamlarda', ru: 'Центр в цифрах' })}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {inst.details?.teacherCount && (
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                        <UserCheck className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">{t(lang, ui.teachers)}</p>
                        <p className="text-xl font-bold text-gray-900">{inst.details.teacherCount}</p>
                      </div>
                    </div>
                  )}
                  {inst.details?.foundedYear && (
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                        <Info className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <div>
                        {/* "Tashkil etilgan / 2010" ikkiga bo'lingan yorliq
                            g'aliz o'qilardi — endi butun jumla sifatida */}
                        <p className="text-xs font-medium text-gray-500">{t(lang, ui.founded)}</p>
                        <p className="text-base font-bold text-gray-900">
                          {t(lang, {
                            uz: `${inst.details.foundedYear}-yilda tashkil etilgan`,
                            ru: `Основан в ${inst.details.foundedYear} году`,
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Dars vaqtlari */}
                {(inst.details?.shifts?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {t(lang, ui.shifts)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(inst.details!.shifts ?? []).map(shift => (
                        <span key={shift} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700">
                          <Clock className="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
                          {shift}
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
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-gray-900">
                  <span className="icon-chip"><Users2 className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                  {t(lang, ui.students)}
                </h2>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatStudentRange(inst.details.studentCount)}
                  </span>
                  <span className="mb-1 text-base text-gray-500">
                    {lang === 'ru' ? 'учеников обучается' : "o'quvchi tahsil olmoqda"}
                  </span>
                </div>
                {/* Bu ko'rsatkich markazning o'zi taqdim etadi — davlat reestridan
                    tekshirib bo'lmaydi, shuning uchun aniq raqam emas, oraliq
                    sifatida ko'rsatiladi va manbasi ochiq aytiladi (foydalanuvchi
                    ishonchini yolg'ondan oshirmaslik uchun) */}
                <p className="mt-1.5 text-xs text-gray-400">
                  {lang === 'ru'
                    ? '* данные предоставлены самим учебным центром'
                    : "* ma'lumot o'quv markazining o'zi tomonidan taqdim etilgan"}
                </p>
              </div>
            )}

            {/* Narx — faqat sidebar'da ko'rsatiladi (takrorlanmaslik uchun) */}

            {/* ════════════════════════════════════════
                6. JOYLASHUV VA FORMAT
                ════════════════════════════════════════ */}
            {(inst.address || inst.phone || inst.phone2 || inst.website || (inst.branches?.length ?? 0) > 0) && (
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-gray-900">
                  <span className="icon-chip"><MapPin className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                  {lang === 'ru' ? 'Расположение и формат' : "Joylashuv va format"}
                </h2>

                <div className="space-y-3">
                  {inst.address && (
                    <a
                      href={mapsUrl(inst) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackContactClick('address', inst.id)}
                      className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3.5 transition-colors hover:bg-primary-50"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                      <div>
                        <p className="text-xs text-gray-400 font-semibold mb-1">{t(lang, ui.address)}</p>
                        <p className="text-base font-medium text-primary-700 underline decoration-primary-200 underline-offset-2 leading-snug">{inst.address}</p>
                      </div>
                    </a>
                  )}

                  {/* Format ko'rsatkichi — muassasa admin panelida belgilagan haqiqiy deliveryMode */}
                  <div className="flex flex-wrap gap-2">
                    {(inst.deliveryMode === 'ONLINE' || inst.deliveryMode === 'HYBRID') && (
                      <span className="flex items-center gap-1.5 rounded-lg border border-primary-100 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700">
                        <Laptop className="h-3.5 w-3.5" strokeWidth={2} /> {lang === 'ru' ? 'Онлайн' : 'Online'}
                      </span>
                    )}
                    {(inst.deliveryMode === 'OFFLINE' || inst.deliveryMode === 'HYBRID' || !inst.deliveryMode) && (
                      <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700">
                        <BookOpen className="h-3.5 w-3.5 text-gray-400" strokeWidth={2} /> {t(lang, { uz: "Oflayn ta'lim", ru: 'Офлайн-обучение' })}
                      </span>
                    )}
                  </div>

                  {/* Filiallar — bir xil muassasaning boshqa shaharlardagi bo'limlari */}
                  {inst.branches && inst.branches.length > 0 && (
                    <div className="mt-1">
                      <p className="mb-2 text-xs font-semibold text-gray-400">{t(lang, ui.branches)}</p>
                      <div className="space-y-2">
                        {inst.branches.map((b) => (
                          <div key={b.id} className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                {(lang === 'ru' ? b.nameRu : b.nameUz) || b.city.nameUz}
                                {b.isMain && (
                                  <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                                    {t(lang, ui.mainBranch)}
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-sm text-gray-500">
                                {(lang === 'ru' ? b.city.nameRu : b.city.nameUz) ?? b.city.nameUz}
                                {b.address ? ` — ${b.address}` : ''}
                              </p>
                              {b.phone && <p className="text-sm text-gray-500">{b.phone}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════
                7. MUASSASA HAQIDA — About
                ════════════════════════════════════════ */}
            <div className="card p-6">
              <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-gray-900">
                <span className="icon-chip"><Info className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
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
                  {/* Faqat izoh, tugmasiz — asosiy "kirish" chaqiruvi sidebar'da bitta joyda */}
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
                    <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                    {t(lang, {
                      uz: "To'liq ma'lumotni ko'rish uchun tizimga kiring",
                      ru: 'Войдите, чтобы посмотреть полную информацию',
                    })}
                  </p>
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
              <div className="card p-6">
                <h2 className="mb-1 font-semibold text-gray-900 text-lg flex items-center gap-3">
                  <span className="icon-chip"><BarChart3 className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                  {t(lang, ui.ratingTitle)}
                </h2>
                {/* Reyting HAQIQIY sharhlardan hisoblanadi — nechta sharhga
                    asoslangani aniq aytiladi ("taxminiy ko'rsatkich" degan
                    noaniq ibora o'rniga) */}
                <p className="mb-5 ml-12 text-xs text-gray-400">
                  {t(lang, {
                    uz: `${totalReviews} ta foydalanuvchi sharhi asosida`,
                    ru: `На основе ${reviewsRu(totalReviews)} пользователей`,
                  })}
                </p>
                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingBreakdown[star] ?? 0
                    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="w-3 text-sm font-semibold text-gray-600 text-right shrink-0">{star}</span>
                        <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" strokeWidth={0} />
                        <div className="flex-1 rounded-full bg-gray-100 h-2 overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
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
                      {DIM_DEFS.map(({ key, Icon, label }) => {
                        const avg = dimAverages[key]
                        if (!avg) return null
                        const pct = (avg / 5) * 100
                        return (
                          <div key={key} className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                            <span className="w-28 text-sm font-medium text-gray-600 shrink-0">{label}</span>
                            <div className="flex-1 rounded-full bg-gray-100 h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-sm font-semibold text-primary-600 text-right shrink-0">{avg}</span>
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
                next={instPath}
                blurPreview={
                  inst.reviews && inst.reviews.length > 0 ? (
                    <div className="card p-6">
                      <h2 className="mb-5 text-lg font-semibold text-gray-900 flex items-center gap-3">
                        <span className="icon-chip"><MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                        {t(lang, ui.reviewsTitle)}
                        <span className="ml-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-sm font-semibold text-primary-700">
                          {inst.reviewCount}
                        </span>
                      </h2>
                      <div className="space-y-4">
                        {inst.reviews.slice(0, 2).map(review => (
                          <div key={review.id} className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                            <div className="mb-3 flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-base font-semibold text-white">
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
                <div id="reviews" className="card p-6">
                  <h2 className="mb-5 text-lg font-semibold text-gray-900 flex items-center gap-3">
                    <span className="icon-chip"><MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                    {t(lang, ui.reviewsTitle)}
                    {inst.reviewCount > 0 && (
                      <span className="ml-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-sm font-semibold text-primary-700">
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
                          <div key={review.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                            {/* Review header */}
                            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
                                  {initials}
                                </div>
                                <div>
                                  <span className="block text-sm font-semibold text-gray-800">
                                    {review.isAnonymous ? t(lang, ui.anon) : (review.user?.name ?? t(lang, ui.user))}
                                  </span>
                                  <StarRating rating={review.overallRating} size="sm" />
                                </div>
                              </div>
                              {review.createdAt && (
                                <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-xs text-gray-400 border border-gray-100">
                                  {new Date(review.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ')}
                                </span>
                              )}
                            </div>
                            {/* Review body */}
                            <div className="px-5 py-4">
                              {review.title && (
                                <p className="mb-1.5 text-base font-semibold text-gray-800">{review.title}</p>
                              )}
                              <p className="text-base leading-relaxed text-gray-600">{review.body}</p>
                              {review.outcomeText && review.isVerified && (
                                <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                                  <Award className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                  {lang === 'ru' ? 'Подтверждённый результат: ' : 'Tasdiqlangan natija: '}
                                  {review.outcomeText}
                                </div>
                              )}
                              {DIM_DEFS.some(({ key }) => (review[key] ?? 0) > 0) && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {DIM_DEFS.map(({ key, Icon, label }) => {
                                    const v = review[key]
                                    if (!v) return null
                                    return (
                                      <span key={key} className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                                        <Icon className="h-3 w-3" strokeWidth={2} />
                                        <span>{label}</span>
                                        <span className="text-amber-500">{'★'.repeat(v)}</span>
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              {review.helpfulCount > 0 && (
                                <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                                  <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2} />
                                  {review.helpfulCount} {t(lang, ui.helpful)}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
                        <MessageCircle className="h-7 w-7" strokeWidth={1.5} />
                      </div>
                      <p className="text-lg font-semibold text-gray-600">{t(lang, ui.noReviews)}</p>
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

            {/* UTP#2 — bepul probnoy darsga bron (mehmon ham, auth bo'lgan ham ko'radi).
                Faqat admin shu muassasada probnoy dars xizmatini yoqqan bo'lsa chiqadi. */}
            {inst.trialLessonEnabled && (
              <TrialBookingWidget institutionId={inst.id} institutionName={displayName} />
            )}

            {/* Guest — Ro'yxatdan o'tish CTA (sidebar) */}
            {isGuest && <RegisterBanner lang={lang} next={instPath} />}

            {/* Hamkorlar uchun: muassasa egaligi so'rovi */}
            <ClaimInstitution institutionId={inst.id} isClaimed={inst.verificationLevel !== 'UNVERIFIED'} />

            {/* Price card — faqat auth bo'lganda */}
            {!isGuest && inst.pricing?.monthlyMin && (
              <div className="card p-5">
                <h3 className="mb-4 font-semibold text-gray-900 text-base flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Wallet className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  {t(lang, ui.priceTitle)}
                </h3>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-600 font-medium mb-1">{t(lang, ui.priceFrom)}</p>
                  <p className="text-2xl font-bold text-emerald-700 leading-none">
                    {formatUzs(inst.pricing.monthlyMin)}
                  </p>
                  {inst.pricing.monthlyMax && inst.pricing.monthlyMax !== inst.pricing.monthlyMin && (
                    <p className="mt-1.5 text-sm text-emerald-600">— {formatUzs(inst.pricing.monthlyMax)}</p>
                  )}
                  <p className="mt-1 text-xs text-emerald-500">/ {t(lang, ui.perMonth)}</p>
                </div>
                {(inst.pricing.paymentMethods?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-gray-500">{t(lang, ui.payment)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(inst.pricing.paymentMethods ?? []).map((m: string) => (
                        <span key={m} className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Guest — narx hint */}
            {isGuest && inst.pricing?.monthlyMin && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
                    <Wallet className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-emerald-600">{t(lang, ui.priceFrom)}</p>
                    {/* Davri aniq: "Oyiga ... dan" — shunchaki summa chalkash edi */}
                    <p className="text-2xl font-bold text-emerald-700">
                      {priceFrom(inst.pricing, lang)?.full ?? formatUzs(inst.pricing.monthlyMin)}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-emerald-700">
                  {t(lang, {
                    uz: "To'lov usullari va chegirmalar ro'yxatdan o'tgandan so'ng ko'rinadi.",
                    ru: 'Способы оплаты и скидки доступны после регистрации.',
                  })}
                </p>
              </div>
            )}

            {/* Contact card — faqat auth bo'lganda */}
            {!isGuest && (
              <div className="card p-5">
                <h3 className="mb-4 font-semibold text-gray-900 text-base flex items-center gap-3">
                  <span className="icon-chip"><Phone className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                  {t(lang, ui.contactTitle)}
                </h3>
                <div className="space-y-2">
                  {inst.phone && (
                    <a
                      href={`tel:${inst.phone}`}
                      onClick={() => trackContactClick('phone', inst.id)}
                      className="flex items-center gap-3 rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      <Phone className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{t(lang, ui.call)}</div>
                        <div className="text-sm font-normal opacity-90 truncate">{inst.phone}</div>
                      </div>
                    </a>
                  )}
                  {inst.telegram && (
                    <a
                      href={`https://t.me/${inst.telegram.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('telegram', inst.id)}
                      className="flex items-center gap-3 rounded-xl bg-sky-500 px-4 py-3.5 font-semibold text-white transition-colors hover:bg-sky-600"
                    >
                      <Send className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Telegram</div>
                        <div className="text-sm font-normal opacity-90 truncate">@{inst.telegram.replace('@', '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.instagram && (
                    <a
                      href={`https://instagram.com/${inst.instagram.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('instagram', inst.id)}
                      className="flex items-center gap-3 rounded-xl bg-pink-600 px-4 py-3.5 font-semibold text-white transition-colors hover:bg-pink-700"
                    >
                      <Instagram className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Instagram</div>
                        <div className="text-sm font-normal opacity-90 truncate">@{inst.instagram.replace('@', '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.website && (
                    <a
                      href={inst.website.startsWith('http') ? inst.website : `https://${inst.website}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackContactClick('website', inst.id)}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 font-medium text-gray-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                    >
                      <Globe className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={1.75} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{t(lang, ui.website)}</div>
                        <div className="text-xs text-gray-400 truncate">{inst.website.replace(/^https?:\/\//, '')}</div>
                      </div>
                    </a>
                  )}
                  {inst.address && (
                    <a
                      href={mapsUrl(inst) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackContactClick('address', inst.id)}
                      className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3.5 transition-colors hover:bg-primary-50"
                    >
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" strokeWidth={1.75} />
                      <div>
                        <p className="text-xs text-gray-400 font-semibold mb-1">{t(lang, ui.address)}</p>
                        <p className="text-sm text-primary-700 underline decoration-primary-200 underline-offset-2 leading-snug">{inst.address}</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Sharh yozish tugmasi — auth bo'lganda */}
            {!isGuest && (
              <a
                href="#write-review"
                className="btn-primary w-full text-base py-3.5"
              >
                <PencilLine className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {t(lang, ui.writeReview)}
              </a>
            )}

          </div>
        </div>
      </div>

      {/* Mehmon foydalanuvchilar uchun kontakt ma'lumoti to'plovchi widget */}
      {isGuest && <GuestLeadWidget />}
    </main>
  )
}
