'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Target, PencilLine, School, Palette,
  Clock, Wallet, Globe, MapPin, BadgeCheck, Lightbulb, AlertCircle,
  Search, RotateCcw, Medal, Lock, ArrowRight, Info, Building2, Shuffle,
  Wifi, Sparkles, Star, ArrowLeftRight,
} from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { RatingHint } from '@/components/shared/StarRating'
import { useLang, t } from '@/contexts/LangContext'
import { matchApi, geoApi, authApi, type MatchItem, type MatchInsights } from '@/lib/api'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/telegram'
import { GOAL_SUGGESTIONS } from '@/lib/matchConstants'
import { institutionsRu } from '@/lib/plural'
import { priceFrom } from '@/lib/price'
import { explanationLabel, pickCaveat } from '@/lib/matchExplain'
import { useCompare, useSaved } from '@/hooks/useCompare'

/**
 * EduFit — "Menga mosini top" wizard'i
 *
 * 4 qadamli anketa → har bir muassasa uchun shaxsiy moslik balli (0-100)
 * va NEGA mos kelishining shaffof sabablari.
 */

type Step = 'goal' | 'format' | 'city' | 'budget' | 'results'

interface CityOption {
  id: string
  nameUz: string
  nameRu?: string | null
  region?: { nameUz: string; nameRu?: string | null } | null
}

// MVP doirasida faqat o'quv markazlar bilan ishlaymiz — Maktab va Bog'cha
// hozircha disabled ("Tez orada"), lekin UI'da ko'rinib turadi
const TYPE_OPTIONS = [
  { value: 'COURSE_CENTER', Icon: PencilLine, uz: "O'quv markaz", ru: 'Учебный центр', disabled: false },
  { value: 'SCHOOL',        Icon: School,     uz: 'Maktab',       ru: 'Школа',         disabled: true },
  { value: 'KINDERGARTEN',  Icon: Palette,    uz: "Bog'cha",      ru: 'Детский сад',   disabled: true },
]

// EduFit: joylashuv & format mosligi — onlayn tanlansa shahar bosqichi
// butunlay o'tkazib yuboriladi (butun O'zbekiston bo'yicha eng yaxshi
// onlayn markazlar taklif qilinadi, shahar cheklovi qo'yilmaydi)
const FORMAT_OPTIONS = [
  { value: 'offline', Icon: Building2, uz: 'Offlayn (yuzma-yuz)',        ru: 'Офлайн (очно)' },
  { value: 'online',  Icon: Wifi,      uz: 'Onlayn',                     ru: 'Онлайн' },
  { value: 'hybrid',  Icon: Shuffle,   uz: 'Ikkalasi ham (moslashuvchan)', ru: 'И то, и другое (гибрид)' },
  { value: '',        Icon: Clock,     uz: 'Farqi yo\'q',                ru: 'Не важно' },
]

const BUDGET_OPTIONS = [
  { value: 500_000,    uz: "500 ming so'mgacha",   ru: 'До 500 тыс. сум' },
  { value: 1_000_000,  uz: "1 mln so'mgacha",      ru: 'До 1 млн сум' },
  { value: 2_000_000,  uz: "2 mln so'mgacha",      ru: 'До 2 млн сум' },
  { value: 5_000_000,  uz: "5 mln so'mgacha",      ru: 'До 5 млн сум' },
  { value: 0,          uz: 'Farqi yo\'q',           ru: 'Не важно' },
]

const STEPS: Exclude<Step, 'results'>[] = ['goal', 'format', 'city', 'budget']

/** UZS format: 1 500 000 so'm (loyiha standarti — bo'shliq ajratuvchi) */
function fmtUzs(n: number) {
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
}

/**
 * useSearchParams() App Router'da Suspense chegarasini talab qiladi —
 * sahifa 'use client' bo'lib to'liq dinamik render qilingani uchun bu
 * SEO/statik generatsiyaga ta'sir qilmaydi (boshqa faqat-klient
 * sahifalarda ham shu yondashuv ishlatiladi).
 */
export default function MatchPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600" />
      </div>
    }>
      <MatchPageInner />
    </Suspense>
  )
}

function MatchPageInner() {
  const { lang } = useLang()
  const uz = lang === 'uz'
  const router = useRouter()
  const searchParams = useSearchParams()

  // MVP doirasida faqat O'quv markaz bilan ishlaymiz — tur tanlash qadami
  // olib tashlangan (bosh sahifa hero'si ham shu tarzda ishlaydi), shuning
  // uchun tur doim COURSE_CENTER va wizard to'g'ridan-to'g'ri maqsad
  // savolidan boshlanadi
  const [step, setStep]         = useState<Step>('goal')
  const [type, setType]         = useState('COURSE_CENTER')
  const [goal, setGoal]         = useState('')
  const [format, setFormat]     = useState<string | null>(null)
  const [cityId, setCityId]     = useState('')
  const [cities, setCities]     = useState<CityOption[]>([])
  const [budget, setBudget]     = useState<number | null>(null)
  // "Qo'shimcha aniqlashtirish" paneli (natijalar sahifasida) — shift/
  // language/age matchService.ts'da to'liq ballanadi (scoreSchedule/
  // scoreLanguage/scoreAge), lekin wizard ularni ILGARI HECH QACHON
  // so'ramagan, shuning uchun bu 3 ta komponent doim neytral bo'lib
  // qolardi (UX audit topilmasi, P1-9)
  const [shift, setShift]       = useState<string | null>(null)
  const [language, setLanguage] = useState<string | null>(null)
  const [age, setAge]           = useState<number | null>(null)
  const [results, setResults]   = useState<MatchItem[]>([])
  const [resultsMeta, setResultsMeta] = useState<{
    total?: number
    locationRelaxed?: boolean
    usedRegionFallback?: boolean
    noSpecializationMatch?: boolean
    belowThreshold?: boolean
  }>({})
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showRefine, setShowRefine] = useState(false)
  // Avtomatik keyingi qadamga o'tilganda fokus yangi savol sarlavhasiga
  // ko'chmasdi — ekran o'quvchi foydalanuvchisi o'zgarishni sezmasdi
  // (UX audit topilmasi, P1-5)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Live insight: anketa to'ldirilayotganda real DB ma'lumotiga asoslangan
  // aniq raqamlar (soxta emas) — foydalanuvchi hali "Ko'rish"ni bosmasdan
  const [insights, setInsights] = useState<MatchInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  // Profil onboarding rejimi: ?next=/profile bilan kelingan bo'lsa —
  // wizard tugagach (yoki o'tkazib yuborilganda) o'sha yerga qaytariladi
  // va bajarilgani profilda saqlanadi (bir marta ko'rsatish uchun)
  const [next, setNext] = useState<string | null>(null)

  // Bir marta: analytics + shaharlar ro'yxati
  useEffect(() => {
    track('match_started', { category: 'engagement' })
    geoApi.cities().then((r) => setCities(r.data as CityOption[])).catch(() => {})
  }, [])

  // Ilgari anketaning javoblari faqat komponent state'ida saqlanardi —
  // muassasa sahifasiga o'tib "Orqaga" bosilganda hammasi 1-qadamga
  // qaytardi (UX audit topilmasi, P0-4). Endi URL query parametrlari
  // (goal/format/cityId/budget/step) — yagona haqiqat manbai: brauzer
  // tarixi orqali qaytilganda shu effekt qayta ishga tushib, holatni
  // TIKLAYDI va natijalar kerak bo'lsa qayta so'raladi (deterministik —
  // xuddi shu parametrlar bilan keshlanmagan, lekin arzon so'rov).
  const lastRunKeyRef = useRef<string | null>(null)

  function matchKey(
    g: string, f: string | null, c: string, b: number | null,
    sh: string | null = shift, la: string | null = language, ag: number | null = age,
  ) {
    return JSON.stringify({ type, g, f, c, b, sh, la, ag })
  }

  function pushParams(patch: Record<string, string | undefined>) {
    const p = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') p.delete(k)
      else p.set(k, v)
    }
    router.push(`/match?${p.toString()}`)
  }

  useEffect(() => {
    const urlGoal = searchParams.get('goal') ?? ''
    const urlFormat = searchParams.get('format') || null
    const urlCityId = searchParams.get('cityId') ?? ''
    const urlBudgetRaw = searchParams.get('budget')
    const urlBudget = urlBudgetRaw ? Number(urlBudgetRaw) : null
    const urlStep = searchParams.get('step') as Step | null
    const urlType = searchParams.get('type')
    const urlNext = searchParams.get('next')
    const urlShift = searchParams.get('shift') || null
    const urlLanguage = searchParams.get('language') || null
    const urlAgeRaw = searchParams.get('age')
    const urlAge = urlAgeRaw ? Number(urlAgeRaw) : null

    // Deep-link: bosh sahifadagi hero'da tur allaqachon tanlangan bo'lsa
    // (?type=SCHOOL) — shu turga o'rnatamiz (hozircha faqat COURSE_CENTER
    // aktiv, boshqalari kelajak uchun)
    if (urlType && TYPE_OPTIONS.some((o) => o.value === urlType && !o.disabled)) {
      setType(urlType)
    }
    // Faqat ichki yo'llar qabul qilinadi (open-redirect himoyasi) —
    // auth/page.tsx'dagi bir xil qoida
    if (urlNext && urlNext.startsWith('/') && !urlNext.startsWith('//')) setNext(urlNext)

    setGoal(urlGoal)
    setFormat(urlFormat)
    setCityId(urlCityId)
    setBudget(urlBudget != null && Number.isFinite(urlBudget) ? urlBudget : null)
    setShift(urlShift)
    setLanguage(urlLanguage)
    setAge(urlAge != null && Number.isFinite(urlAge) ? urlAge : null)

    if (urlStep === 'goal' || urlStep === 'format' || urlStep === 'city' || urlStep === 'budget' || urlStep === 'results') {
      setStep(urlStep)
    } else if (urlGoal && !urlStep) {
      // Eski uslubdagi chuqur havola (?type=...&goal=IELTS, step'siz) —
      // avvalgidek to'g'ridan-to'g'ri formatga o'tkazamiz
      setStep('format')
    } else {
      setStep('goal')
    }

    if (urlStep === 'results') {
      const key = matchKey(urlGoal, urlFormat, urlCityId, urlBudget, urlShift, urlLanguage, urlAge)
      if (lastRunKeyRef.current !== key) {
        lastRunKeyRef.current = key
        runMatch(urlBudget, {
          goal: urlGoal, format: urlFormat, cityId: urlCityId,
          shift: urlShift, language: urlLanguage, age: urlAge,
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Natijalar ro'yxatidagi scroll pozitsiyasini saqlash/tiklash — xuddi
  // shu texnika /search'da ishlatiladi (SearchResults.tsx)
  useEffect(() => {
    if (step !== 'results' || loading) return
    const key = `edu_match_scroll:${searchParams.toString()}`
    try {
      const saved = sessionStorage.getItem(key)
      if (saved != null) {
        const y = parseInt(saved, 10)
        if (!Number.isNaN(y)) requestAnimationFrame(() => window.scrollTo(0, y))
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loading])

  useEffect(() => {
    if (step !== 'results') return
    const key = `edu_match_scroll:${searchParams.toString()}`
    let raf = 0
    function onScroll() {
      if (raf) return
      raf = requestAnimationFrame(() => {
        try { sessionStorage.setItem(key, String(window.scrollY)) } catch { /* ignore */ }
        raf = 0
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, searchParams])

  // Qadam o'zgarganda (avtomatik ilgarilash yoki chip orqali qaytish)
  // fokusni yangi savol sarlavhasiga ko'chiradi
  useEffect(() => {
    if (step !== 'results') headingRef.current?.focus()
  }, [step])

  // Live insight panel: tur tanlangandan keyin har bir qadamda (maqsad,
  // format, shahar, byudjet) foydalanuvchiga real DB'dan hisoblangan aniq
  // raqamlar ko'rsatiladi — 400ms debounce bilan (har harf bosilganda emas)
  useEffect(() => {
    if (!type || step === 'results') {
      setInsights(null)
      return
    }
    let cancelled = false
    setInsightsLoading(true)
    const timer = setTimeout(() => {
      matchApi
        .insights({ type, goal: goal || undefined, cityId: cityId || undefined, budget: budget || undefined, format: format || undefined })
        .then((r) => { if (!cancelled) setInsights(r.data) })
        .catch(() => { if (!cancelled) setInsights(null) })
        .finally(() => { if (!cancelled) setInsightsLoading(false) })
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [type, goal, cityId, budget, format, step])

  // Onboarding bajarilgani/o'tkazib yuborilganini profilda saqlaydi.
  // Mavjud PATCH /auth/profile endpoint'i qayta ishlatiladi — yangi API yo'q.
  function markOnboardingDone() {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    authApi
      .updateProfile(token, { matchOnboardingCompletedAt: new Date().toISOString() })
      .catch(() => {})
  }

  function handleSkip() {
    if (next) {
      markOnboardingDone()
      router.replace(next)
    }
  }

  // Onlayn format tanlansa — shahar bosqichi umuman kerak emas, chunki
  // onlayn markaz istalgan shahardan foydalanuvchiga bir xil darajada mos
  const activeSteps = format === 'online' ? STEPS.filter((s) => s !== 'city') : STEPS
  const stepIndex = step === 'results' ? -1 : activeSteps.indexOf(step)

  /**
   * `overrides` — URL'dan holat tiklanayotganda ishlatiladi: shu
   * chaqiruvning O'ZIDA yuqorida `setGoal`/`setFormat`/`setCityId`
   * chaqirilgan bo'lsa ham, React state yangilanishi ASINXRON bo'lgani
   * uchun `goal`/`format`/`cityId` closure'da hali ESKI qiymatlarni
   * ko'rsatadi — shuning uchun to'g'ridan-to'g'ri qiymat uzatiladi.
   */
  async function runMatch(
    finalBudget: number | null,
    overrides?: {
      goal?: string; format?: string | null; cityId?: string
      shift?: string | null; language?: string | null; age?: number | null
    },
  ) {
    const effGoal     = overrides?.goal ?? goal
    const effFormat   = overrides && 'format' in overrides ? overrides.format ?? null : format
    const effCityId   = overrides?.cityId ?? cityId
    const effShift    = overrides && 'shift' in overrides ? overrides.shift ?? null : shift
    const effLanguage = overrides && 'language' in overrides ? overrides.language ?? null : language
    const effAge      = overrides && 'age' in overrides ? overrides.age ?? null : age

    setLoading(true)
    setError('')
    setStep('results')
    try {
      const prefs = {
        type,
        goal:     effGoal || undefined,
        cityId:   effCityId || undefined,
        budget:   finalBudget || undefined,
        format:   effFormat || undefined,
        shift:    effShift || undefined,
        language: effLanguage || undefined,
        age:      effAge || undefined,
      }
      const res = await matchApi.find(prefs)
      setResults(res.data)
      setResultsMeta(res.meta)
      haptic('success')
      // Admin Lead CRM'da "Ta'lim profili" bo'limi shu voqeaning eng
      // so'nggisidan o'qiladi (apps/api/src/services/leadService.ts)
      track('match_completed', {
        category: 'engagement',
        properties: {
          type, goal: effGoal, budget: finalBudget, resultCount: res.data.length,
          cityId: effCityId || undefined, format: effFormat || undefined,
        },
      })
      // Oxirgi ishlatilgan afzalliklarni saqlaymiz — Profil sahifasidagi
      // shaxsiy tavsiyalar bloki shu saqlangan so'rovni qayta ishlatadi
      // (yangi API/DB shart emas, mavjud /match endpointi qayta chaqiriladi)
      try {
        localStorage.setItem('edu_last_match', JSON.stringify(prefs))
      } catch {
        // localStorage mavjud bo'lmasa jim o'tkazamiz
      }
      // Onboarding rejimida — natija olingani "bajarildi" hisoblanadi,
      // lekin foydalanuvchi natijalarni ko'rib bo'lgach o'zi profilga o'tadi
      // (pastdagi CTA orqali) — bu yerda darhol majburiy yo'naltirmaymiz
      if (next) markOnboardingDone()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t(lang, { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка' }))
    } finally {
      setLoading(false)
    }
  }

  const ui = {
    title:     { uz: 'Menga mosini top', ru: 'Подобрать для меня' },
    subtitle:  { uz: '4 ta savolga javob bering — sizga eng mos muassasalarni hisoblab beramiz', ru: 'Ответьте на 4 вопроса — мы рассчитаем самые подходящие для вас заведения' },
    qType:     { uz: 'Nima qidiryapsiz?', ru: 'Что вы ищете?' },
    qGoal:     { uz: 'Maqsadingiz nima?', ru: 'Какая у вас цель?' },
    qGoalHint: { uz: 'Masalan: IELTS, Frontend, matematika... (ixtiyoriy)', ru: 'Например: IELTS, Frontend, математика... (необязательно)' },
    qFormat:   { uz: "Qanday formatda o'qishni istaysiz?", ru: 'В каком формате хотите учиться?' },
    qCity:     { uz: 'Qaysi shaharda?', ru: 'В каком городе?' },
    qBudget:   { uz: 'Oylik byudjetingiz?', ru: 'Ваш месячный бюджет?' },
    back:      { uz: '← Orqaga', ru: '← Назад' },
    results:   { uz: 'Sizga mos natijalar', ru: 'Подходящие вам результаты' },
    matchPct:  { uz: 'moslik', ru: 'совпадение' },
    confidence:{ uz: 'ishonchlilik', ru: 'достоверность' },
    why:       { uz: 'Nega bu tavsiya?', ru: 'Почему эта рекомендация?' },
    hide:      { uz: 'Yopish', ru: 'Скрыть' },
    empty:     { uz: 'Afsuski, mos muassasa topilmadi. Boshqa tur yoki shahar bilan urinib ko\'ring.', ru: 'К сожалению, ничего не найдено. Попробуйте другой тип или город.' },
    // Yo'nalish (maqsad) endi QATTIQ filtr — hech qachon yumshatilmaydi,
    // shuning uchun bu bannerlar faqat JOYLASHUV yumshatilganini bildiradi
    relaxedRegion:   { uz: "Siz tanlagan shaharda topilmadi — shu viloyatdagi natijalarni ko'rsatmoqdamiz", ru: 'В выбранном городе не найдено — показываем результаты по всей области' },
    relaxedCity:     { uz: 'Siz tanlagan shaharda topilmadi — boshqa shaharlardagi natijalarni ko\'rsatmoqdamiz', ru: 'В выбранном городе не найдено — показываем результаты из других городов' },
    emptySpecialization: {
      uz: "Joriy afzalliklaringiz asosida yuqori darajada mos ta'lim markazlari topilmadi — siz tanlagan yo'nalishni o'qitadigan muassasa hozircha yo'q. Boshqa yo'nalish yoki shahar bilan urinib ko'ring.",
      ru: 'Не найдено высоко подходящих центров по текущим предпочтениям — учреждений с выбранным направлением пока нет. Попробуйте другое направление или город.',
    },
    emptyBelowThreshold: {
      uz: "Joriy afzalliklaringiz asosida yuqori darajada mos ta'lim markazlari topilmadi. Filtrlarni o'zgartirib ko'ring.",
      ru: 'Не найдено высоко подходящих центров по текущим предпочтениям. Попробуйте изменить фильтры.',
    },
    restart:   { uz: 'Qaytadan boshlash', ru: 'Начать заново' },
    anyCity:   { uz: 'Farqi yo\'q / Online', ru: 'Не важно / Онлайн' },
    reviews:   { uz: 'sharh', ru: 'отзывов' },
    seeMore:   { uz: 'Batafsil →', ru: 'Подробнее →' },
    priceNotProvided: { uz: "Narx ko'rsatilmagan", ru: 'Цена не указана' },
    compare:   { uz: 'Solishtir', ru: 'Сравнить' },
    compared:  { uz: 'Tanlandi', ru: 'Выбрано' },
    save:      { uz: 'Saqlash', ru: 'Сохранить' },
    saved:     { uz: 'Saqlandi', ru: 'Сохранено' },
    notSpecified: { uz: 'Belgilanmagan', ru: 'Не указано' },
    editAnswers:  { uz: 'Javoblarni tahrirlash', ru: 'Изменить ответы' },
    refineTitle:  { uz: "Qo'shimcha aniqlashtirish", ru: 'Дополнительное уточнение' },
    qShift:    { uz: 'Qulay vaqt', ru: 'Удобное время' },
    qLanguage: { uz: "O'qitish tili", ru: 'Язык обучения' },
    qAge:      { uz: "O'quvchi yoshi", ru: 'Возраст ученика' },
    anyValue:  { uz: 'Farqi yo\'q', ru: 'Не важно' },
  }

  // Har bir qadamning sarlavhasi — "Step X / 4 · {savol}" matni va
  // "Javoblarni tahrirlash" chip'lari uchun (P1-5/P1-9, UX audit topilmasi)
  const STEP_LABELS: Record<Exclude<Step, 'results'>, { uz: string; ru: string }> = {
    goal: ui.qGoal, format: ui.qFormat, city: ui.qCity, budget: ui.qBudget,
  }

  function jumpToStep(s: Exclude<Step, 'results'>) {
    setStep(s)
    pushParams({ step: s })
  }

  /** Berilgan qadamda foydalanuvchi TANLAGAN qiymatning ko'rinadigan matni */
  function chipText(s: Exclude<Step, 'results'>): string {
    if (s === 'goal') return goal.trim() || t(lang, ui.notSpecified)
    if (s === 'format') {
      const opt = FORMAT_OPTIONS.find((o) => o.value === (format ?? ''))
      return opt ? (uz ? opt.uz : opt.ru) : t(lang, ui.anyValue)
    }
    if (s === 'city') {
      if (!cityId) return t(lang, ui.anyCity)
      const c = cities.find((c) => c.id === cityId)
      return c ? (uz ? c.nameUz : (c.nameRu ?? c.nameUz)) : t(lang, ui.anyCity)
    }
    const opt = BUDGET_OPTIONS.find((b) => (b.value || null) === budget)
    return opt ? (uz ? opt.uz : opt.ru) : t(lang, ui.anyValue)
  }

  /**
   * Natijalar sahifasidagi "Qo'shimcha aniqlashtirish" paneli — shift/
   * language/age'ni o'zgartirib, moslikni qayta hisoblaydi. Wizard bu
   * savollarni umuman bermaydi, lekin backend ularni to'liq ballaydi
   * (P1-9, UX audit topilmasi).
   */
  function refineMatch(patch: { shift?: string | null; language?: string | null; age?: number | null }) {
    const nextShift    = 'shift' in patch ? patch.shift ?? null : shift
    const nextLanguage = 'language' in patch ? patch.language ?? null : language
    const nextAge      = 'age' in patch ? patch.age ?? null : age
    setShift(nextShift)
    setLanguage(nextLanguage)
    setAge(nextAge)
    lastRunKeyRef.current = matchKey(goal, format, cityId, budget, nextShift, nextLanguage, nextAge)
    runMatch(budget, { shift: nextShift, language: nextLanguage, age: nextAge })
    pushParams({ shift: nextShift ?? '', language: nextLanguage ?? '', age: nextAge ? String(nextAge) : '' })
  }

  function advanceToFormat(g: string) {
    setStep('format')
    pushParams({ goal: g, step: 'format' })
  }

  function goBack() {
    if (step === 'results') {
      setStep('budget')
      pushParams({ step: 'budget' })
      return
    }
    const i = activeSteps.indexOf(step)
    if (i > 0) {
      const prevStep = activeSteps[i - 1]
      setStep(prevStep)
      pushParams({ step: prevStep })
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {/* Profil onboarding rejimi — nega so'ralayotgani tushuntiriladi + o'tkazib yuborish */}
        {next && step !== 'results' && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
            <p className="text-sm text-primary-800">
              {uz
                ? 'Profilingizni ochishdan oldin — sizga eng mos muassasalarni topamiz'
                : 'Прежде чем открыть профиль — подберём для вас подходящие заведения'}
            </p>
            <button
              onClick={handleSkip}
              className="tap-center shrink-0 whitespace-nowrap text-sm font-semibold text-primary-600 hover:underline"
            >
              {uz ? 'Keyinroq' : 'Позже'}
            </button>
          </div>
        )}

        {/* Sarlavha */}
        <div className="mb-6 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            <Target className="h-7 w-7 shrink-0 text-primary-600 sm:h-8 sm:w-8" strokeWidth={1.75} /> {t(lang, ui.title)}
          </h1>
          {step !== 'results' && (
            <p className="mt-2 text-sm text-gray-500">{t(lang, ui.subtitle)}</p>
          )}
        </div>

        {/* Progress bar — avval faqat rangli chiziqlar edi, "qaysi
            qadamdaman" matni yo'q edi (UX audit topilmasi, P1-5) */}
        {step !== 'results' && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold text-gray-400">
              {uz ? `${stepIndex + 1}-qadam / ${activeSteps.length}` : `Шаг ${stepIndex + 1} из ${activeSteps.length}`}
              {' · '}{t(lang, STEP_LABELS[step])}
            </p>
            <div
              className="flex gap-1.5"
              role="progressbar"
              aria-valuenow={stepIndex + 1}
              aria-valuemin={1}
              aria-valuemax={activeSteps.length}
              aria-label={uz ? "Anketa bosqichi" : 'Шаг анкеты'}
            >
              {activeSteps.map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= stepIndex ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Javob berilgan qadamlarni tahrirlashga imkon beruvchi chip'lar —
            avval faqat "← Orqaga" bitta qadam orqaga qaytarardi, oldingi
            javoblarni yo'qotmasdan to'g'ridan-to'g'ri o'sha qadamga
            o'tib bo'lmasdi (UX audit topilmasi, P1-9) */}
        {step !== 'results' && stepIndex > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {activeSteps.slice(0, stepIndex).map((s) => (
              <button
                key={s}
                onClick={() => jumpToStep(s)}
                className="flex items-center gap-1 whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
              >
                {chipText(s)}
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}

        {/* Live insight: real DB'ga asoslangan aniq raqamlar */}
        {step !== 'results' && (
          <InsightsCard insights={insights} loading={insightsLoading} uz={uz} hasGoal={!!goal.trim()} />
        )}

        {/* ── 1. Maqsad ── */}
        {step === 'goal' && (
          <div className="space-y-4">
            <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-gray-900 outline-none">{t(lang, ui.qGoal)}</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => {
                  // Erkin matn kiritilganda Enter — pastdagi ko'rinadigan
                  // tugma bilan bir xil vazifa. Tanlangan yo'nalish bo'yicha
                  // hech qanday muassasa topilmasa o'tkazilmaydi
                  if (e.key === 'Enter' && !(goal.trim() && insights?.matchingCount === 0)) {
                    e.preventDefault()
                    advanceToFormat(goal)
                  }
                }}
                placeholder={t(lang, ui.qGoalHint)}
                maxLength={100}
                className="input flex-1"
              />
              {goal.trim() && (
                <button
                  onClick={() => advanceToFormat(goal)}
                  disabled={insights?.matchingCount === 0}
                  aria-label={uz ? 'Davom etish' : 'Продолжить'}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                >
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                </button>
              )}
            </div>
            {(GOAL_SUGGESTIONS[type] ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(GOAL_SUGGESTIONS[type] ?? []).map((g) => (
                  <button
                    key={g.value}
                    // Pill bosilishi — o'zi to'liq va aniq tanlov, qo'shimcha
                    // "Davom etish" tugmasi kerak emas, darhol keyingi qadamga o'tadi
                    onClick={() => { setGoal(g.value); advanceToFormat(g.value) }}
                    aria-pressed={goal === g.value}
                    className={`tap-center rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                      goal === g.value
                        ? 'border-primary-500 bg-primary-600 text-white'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-primary-400'
                    }`}
                  >
                    {t(lang, g.label)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 2b. O'qish formati ── */}
        {step === 'format' && (
          <div className="space-y-4">
            <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-gray-900 outline-none">{t(lang, ui.qFormat)}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {FORMAT_OPTIONS.map((o) => {
                const val = o.value || 'any'
                return (
                  <button
                    key={val}
                    onClick={() => {
                      const nextFormat = o.value || null
                      const nextStep = nextFormat === 'online' ? 'budget' : 'city'
                      setFormat(nextFormat)
                      // Onlayn tanlansa — shahar so'ralmaydi, to'g'ridan-to'g'ri byudjetga o'tamiz
                      setStep(nextStep)
                      pushParams({ format: nextFormat ?? '', step: nextStep })
                    }}
                    aria-pressed={format === o.value}
                    className={`flex items-center gap-2.5 rounded-xl border bg-white px-4 py-3 text-left font-semibold shadow-sm transition-colors hover:border-primary-300 ${
                      format === o.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <o.Icon className="h-5 w-5 shrink-0 text-primary-500" strokeWidth={1.75} />
                    <span className="text-sm">{uz ? o.uz : o.ru}</span>
                  </button>
                )
              })}
            </div>
            <WizardNav onBack={goBack} backLabel={t(lang, ui.back)} />
          </div>
        )}

        {/* ── 3. Shahar ── */}
        {step === 'city' && (
          <div className="space-y-4">
            <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-gray-900 outline-none">{t(lang, ui.qCity)}</h2>
            <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2">
              <button
                onClick={() => { setCityId(''); setStep('budget'); pushParams({ cityId: '', step: 'budget' }) }}
                aria-pressed={cityId === ''}
                className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-gray-600 hover:bg-primary-50"
              >
                <Globe className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t(lang, ui.anyCity)}
              </button>
              {cities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCityId(c.id); setStep('budget'); pushParams({ cityId: c.id, step: 'budget' }) }}
                  aria-pressed={cityId === c.id}
                  className={`flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                    cityId === c.id ? 'bg-primary-100 text-primary-700' : 'text-gray-800 hover:bg-primary-50'
                  }`}
                >
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {uz ? c.nameUz : (c.nameRu ?? c.nameUz)}
                  {c.region && (
                    <span className="text-xs font-normal text-gray-400">
                      {uz ? c.region.nameUz : (c.region.nameRu ?? c.region.nameUz)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <WizardNav onBack={goBack} backLabel={t(lang, ui.back)} />
          </div>
        )}

        {/* ── 4. Byudjet ── */}
        {step === 'budget' && (
          <div className="space-y-4">
            <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-gray-900 outline-none">{t(lang, ui.qBudget)}</h2>
            <div className="space-y-2">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => {
                    const val = b.value || null
                    // pushParams URL'ni yangilaydi va shu orqali qayta ishga
                    // tushadigan tiklash effektiga oldindan "bu allaqachon
                    // ishga tushirilgan" deb belgilab qo'yamiz — aks holda
                    // bitta bosishda so'rov ikki marta yuborilardi
                    lastRunKeyRef.current = matchKey(goal, format, cityId, val)
                    setBudget(val)
                    runMatch(val)
                    pushParams({ budget: val ? String(val) : '', step: 'results' })
                  }}
                  aria-pressed={budget === (b.value || null)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border bg-white px-5 py-3.5 text-left font-semibold shadow-sm transition-colors hover:border-primary-300 ${
                    budget === (b.value || null) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <Wallet className="h-4 w-4 shrink-0 text-primary-500" strokeWidth={1.75} /> {uz ? b.uz : b.ru}
                </button>
              ))}
            </div>
            <WizardNav onBack={goBack} backLabel={t(lang, ui.back)} />
          </div>
        )}

        {/* ── Natijalar ── */}
        {step === 'results' && (
          <div className="space-y-4">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600" />
                <p className="text-sm font-semibold text-gray-500">
                  {uz ? 'Moslik hisoblanmoqda...' : 'Рассчитываем совпадение...'}
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} /> {error}
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{t(lang, ui.results)}</h2>
                    {results.length > 0 && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        {uz
                          ? `Yuqori moslikdagi ${resultsMeta.total ?? results.length} ta muassasadan ${results.length} tasi ko'rsatilmoqda`
                          : `Показано ${results.length} из ${resultsMeta.total ?? results.length} учреждений с высоким совпадением`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // "Qaytadan boshlash" — YAGONA harakat hammasini
                      // tozalaydi (avvalgi barcha tanlovlar VA URL parametrlari;
                      // faqat tur COURSE_CENTER bo'lib qoladi — MVP'da yagona
                      // aktiv tur, "next" onboarding konteksti saqlanadi)
                      setStep('goal')
                      setResults([])
                      setResultsMeta({})
                      setGoal('')
                      setFormat(null)
                      setCityId('')
                      setBudget(null)
                      setShift(null)
                      setLanguage(null)
                      setAge(null)
                      lastRunKeyRef.current = null
                      router.push(next ? `/match?next=${encodeURIComponent(next)}` : '/match')
                    }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {t(lang, ui.restart)}
                  </button>
                </div>

                {/* "Javoblarni tahrirlash" — bitta javobni "Qaytadan
                    boshlash"siz o'zgartirish imkonini beradi (P1-9) */}
                <div className="flex flex-wrap gap-1.5">
                  {activeSteps.map((s) => (
                    <button
                      key={s}
                      onClick={() => jumpToStep(s)}
                      className="flex items-center gap-1 whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
                    >
                      {chipText(s)}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>

                {/* Onboarding rejimida — natijalarni ko'rgach profilga o'tish */}
                {next && (
                  <Link
                    href={next}
                    className="btn-primary flex w-full items-center justify-center gap-2 py-3"
                  >
                    {uz ? 'Profilimga o\'tish' : 'Перейти в профиль'} <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
                  </Link>
                )}

                {/* Ilgari bu ma'lumot-taqdim etish bannerlari HAR DOIM,
                    hech qanday forma to'ldirmasdan turib ko'rsatilardi —
                    bu yerda hali hech qanday ma'lumot yig'ilmaydi, shuning
                    uchun chalg'ituvchi/noto'g'ri edi. Haqiqiy rozilik endi
                    aynan ma'lumot yuborilishidan oldin — TrialBookingWidget'da
                    (institution sahifasi) so'raladi (P1-10, UX audit topilmasi) */}

                {results.length === 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
                    <div className="mb-3 flex justify-center">
                      <Search className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
                    </div>
                    <p className="text-gray-500">
                      {t(lang, resultsMeta.noSpecializationMatch
                        ? ui.emptySpecialization
                        : resultsMeta.belowThreshold
                          ? ui.emptyBelowThreshold
                          : ui.empty)}
                    </p>
                  </div>
                )}

                {/* Joylashuv yumshatilgan bo'lsa (aynan shaharga mos topilmasa)
                    — buni shaffof aytamiz, jim aralashtirmaymiz. Yo'nalish
                    (maqsad) esa QATTIQ filtr — hech qachon yumshatilmaydi */}
                {results.length > 0 && resultsMeta.locationRelaxed && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                    <p>
                      {t(lang, resultsMeta.usedRegionFallback ? ui.relaxedRegion : ui.relaxedCity)}
                    </p>
                  </div>
                )}

                {/* Qo'shimcha aniqlashtirish — shift/language/age. Wizard
                    bularni hech qachon so'ramaydi, lekin backend ularni
                    to'liq ballaydi (P1-9) */}
                <div className="rounded-2xl border border-gray-200 bg-white">
                  <button
                    onClick={() => setShowRefine((v) => !v)}
                    aria-expanded={showRefine}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
                  >
                    {t(lang, ui.refineTitle)}
                    <span className="text-xs font-normal text-gray-400">{showRefine ? '−' : '+'}</span>
                  </button>
                  {showRefine && (
                    <div className="grid grid-cols-1 gap-3 border-t border-gray-100 px-4 py-3 sm:grid-cols-3">
                      <label className="text-xs font-semibold text-gray-600">
                        {t(lang, ui.qShift)}
                        <select
                          value={shift ?? ''}
                          onChange={(e) => refineMatch({ shift: e.target.value || null })}
                          className="input mt-1 w-full text-sm"
                        >
                          <option value="">{t(lang, ui.anyValue)}</option>
                          <option value="morning">{uz ? 'Ertalabki' : 'Утреннее'}</option>
                          <option value="afternoon">{uz ? 'Tushki' : 'Дневное'}</option>
                          <option value="evening">{uz ? 'Kechki' : 'Вечернее'}</option>
                          <option value="weekend">{uz ? 'Hafta oxiri' : 'Выходные'}</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        {t(lang, ui.qLanguage)}
                        <select
                          value={language ?? ''}
                          onChange={(e) => refineMatch({ language: e.target.value || null })}
                          className="input mt-1 w-full text-sm"
                        >
                          <option value="">{t(lang, ui.anyValue)}</option>
                          <option value="uz">O&apos;zbek</option>
                          <option value="ru">Rus</option>
                          <option value="en">Ingliz</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        {t(lang, ui.qAge)}
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={age ?? ''}
                          onChange={(e) => refineMatch({ age: e.target.value ? Number(e.target.value) : null })}
                          placeholder={t(lang, ui.anyValue)}
                          className="input mt-1 w-full text-sm"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {results.map((r, idx) => (
                  <MatchResultCard
                    key={r.institution.id}
                    r={r}
                    idx={idx}
                    lang={lang}
                    uz={uz}
                    expanded={expanded === r.institution.id}
                    onToggleExpanded={() => setExpanded(expanded === r.institution.id ? null : r.institution.id)}
                    hasBudget={!!budget}
                    ui={ui}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

/**
 * Live insight paneli — anketa to'ldirilayotganda real DB'dan hisoblangan
 * aniq raqamlarni ko'rsatadi (nechta muassasa mos keladi, narx oralig'i,
 * aynan qaysi dasturlar topildi). Hech narsa o'ylab topilmaydi.
 */
function InsightsCard({ insights, loading, uz, hasGoal }: {
  insights: MatchInsights | null
  loading: boolean
  uz: boolean
  hasGoal: boolean
}) {
  if (!insights) {
    if (!loading) return null
    return (
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-400">
        <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
        {uz ? 'Hisoblanmoqda...' : 'Считаем...'}
      </div>
    )
  }

  const zeroMatches = hasGoal && insights.matchingCount === 0
  const names = insights.sampleInstitutions.map((s) => uz ? s.nameUz : (s.nameRu ?? s.nameUz))

  return (
    <div className={`mb-5 rounded-xl border px-4 py-3.5 transition-opacity ${loading ? 'opacity-60' : ''} ${
      zeroMatches ? 'border-amber-200 bg-amber-50' : 'border-primary-100 bg-primary-50/70'
    }`}>
      <div
        className={`flex items-center gap-2 text-sm font-bold ${zeroMatches ? 'text-amber-700' : 'text-primary-700'}`}
        aria-live="polite"
      >
        <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {zeroMatches
          ? (uz ? "Bu yo'nalish bo'yicha hozircha muassasa yo'q" : 'По этому направлению пока нет учреждений')
          : (uz
              ? `${insights.matchingCount} ta muassasa mos keladi`
              : `${insights.matchingCount === 1 ? 'Подходит' : 'Подходят'} ${institutionsRu(insights.matchingCount)}`)}
      </div>

      {zeroMatches ? (
        <p className="mt-1 text-xs text-amber-700">
          {uz ? 'Boshqa fan yoki kalit so\'z bilan urinib ko\'ring' : 'Попробуйте другой предмет или ключевое слово'}
        </p>
      ) : (
        <>
          {(insights.priceRange.min != null || insights.avgRating != null) && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-primary-800">
              {insights.priceRange.min != null && (
                <span className="flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  {fmtUzs(insights.priceRange.min)}
                  {insights.priceRange.max != null && insights.priceRange.max !== insights.priceRange.min
                    ? ` – ${fmtUzs(insights.priceRange.max)}` : ''}
                  {uz ? '/oy' : '/мес'}
                </span>
              )}
              {insights.avgRating != null && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" strokeWidth={1.75} />
                  {insights.avgRating.toFixed(1)}
                </span>
              )}
              {insights.withinBudgetCount != null && (
                <span>
                  {uz
                    ? `${insights.withinBudgetCount} tasi byudjetingizga mos`
                    : `${insights.withinBudgetCount} в вашем бюджете`}
                </span>
              )}
            </div>
          )}

          {insights.matchedPrograms.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {insights.matchedPrograms.map((p) => (
                <span key={p} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-primary-700 shadow-sm">
                  {p}
                </span>
              ))}
            </div>
          ) : insights.matchedCategory && (
            <p className="mt-1.5 text-xs text-primary-700">
              {uz ? `Toifa: ${insights.matchedCategory.labelUz}` : `Категория: ${insights.matchedCategory.labelRu}`}
            </p>
          )}

          {names.length > 0 && (
            <p className="mt-1.5 truncate text-[11px] text-primary-600">
              {uz ? 'Masalan: ' : 'Например: '}{names.join(', ')}
            </p>
          )}

          {insights.locationRelaxed && (
            <p className="mt-1.5 text-[11px] text-amber-700">
              {uz
                ? 'Tanlangan shaharda topilmadi — boshqa shaharlar hisobga olindi'
                : 'В выбранном городе не найдено — учтены другие города'}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function WizardNav({ onBack, onNext, nextLabel, backLabel, nextDisabled }: {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  backLabel?: string
  /** Masalan: tanlangan yo'nalish bo'yicha hech qanday muassasa topilmasa — davom etishning ma'nosi yo'q */
  nextDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <button onClick={onBack} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
          {backLabel ?? '← Orqaga'}
        </button>
      ) : <span />}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="btn-primary px-6 py-3"
        >
          {nextLabel ?? 'Keyingisi →'}
        </button>
      )}
    </div>
  )
}

/**
 * Bitta natija kartasi. Avval bu inline results.map() ichida edi — endi
 * alohida komponent, chunki UX audit topilmalari bir nechta narsani bir
 * vaqtda tuzatishni talab qildi: (1) moslik institution ASOSIY shahri
 * emas, FILIALI orqali topilgan bo'lsa buni ko'rsatish, (2) narxni
 * "dan boshlab"/"ko'rsatilmagan" sifatida halol ko'rsatish (aniq kurs
 * narxi DBda umuman yo'q), (3) Solishtir/Saqlash tugmalari, (4) bitta
 * halol eslatma (trade-off) qatori.
 */
function MatchResultCard({ r, idx, lang, uz, expanded, onToggleExpanded, hasBudget, ui }: {
  r: MatchItem
  idx: number
  lang: 'uz' | 'ru'
  uz: boolean
  expanded: boolean
  onToggleExpanded: () => void
  /** Foydalanuvchi byudjet tanlaganmi — narx ma'lumoti yo'qligi shu holatda eslatma sifatida ko'rsatiladi */
  hasBudget: boolean
  ui: Record<string, { uz: string; ru: string }>
}) {
  const { toggle, isSelected } = useCompare()
  const { toggleSave, isSaved } = useSaved()
  const compared = isSelected(r.institution.id)
  const saved = isSaved(r.institution.id)

  const branch = r.institution.matchedBranch
  const branchCity = branch?.city ? (uz ? branch.city.nameUz : (branch.city.nameRu ?? branch.city.nameUz)) : null
  const branchName = branch ? (uz ? branch.nameUz : (branch.nameRu ?? branch.nameUz)) : null
  const institutionCity = r.institution.city ? (uz ? r.institution.city.nameUz : (r.institution.city.nameRu ?? r.institution.city.nameUz)) : null
  const price = priceFrom(r.institution.pricing ?? null, lang)
  const caveat = pickCaveat(r.match.components, hasBudget)
  const reasons = (uz ? r.match.topReasonsUz : r.match.topReasonsRu).slice(0, 2)

  function compareItem() {
    return {
      id: r.institution.id, slug: r.institution.slug,
      nameUz: r.institution.nameUz, nameRu: r.institution.nameRu ?? undefined,
      type: r.institution.type, avgRating: r.institution.avgRating ?? undefined,
      pricing: r.institution.pricing ? { monthlyMin: r.institution.pricing.monthlyMin ?? undefined } : undefined,
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        {/* Moslik foizi */}
        <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl font-bold text-white ${
          r.match.score >= 80 ? 'bg-emerald-500' : r.match.score >= 60 ? 'bg-amber-500' : 'bg-gray-400'
        }`}>
          <span className="text-xl leading-none">{r.match.score}%</span>
          <span className="mt-0.5 text-[9px] font-semibold opacity-80">{t(lang, ui.matchPct)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {idx === 0 && r.match.score >= 70 && (
              <span title="Eng yaxshi moslik">
                <Medal className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} />
              </span>
            )}
            <Link
              href={`/institutions/${r.institution.slug}`}
              onClick={() => track('match_result_click', {
                category: 'engagement',
                institutionId: r.institution.id,
                properties: { score: r.match.score, position: idx + 1 },
              })}
              className="truncate font-semibold text-gray-900 hover:text-primary-600"
            >
              {uz ? r.institution.nameUz : (r.institution.nameRu ?? r.institution.nameUz)}
            </Link>
            {r.institution.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary-500" strokeWidth={2} />}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {r.institution.avgRating != null && (
              <RatingHint rating={r.institution.avgRating} count={r.institution.reviewCount} lang={lang} />
            )}
            {r.institution.deliveryMode === 'ONLINE' ? (
              <span className="flex items-center gap-1 font-semibold text-sky-600">
                <Wifi className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {uz ? 'Onlayn' : 'Онлайн'}
              </span>
            ) : (branchCity ?? institutionCity) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                {branchCity ? (
                  <>
                    {branchCity}{branchName ? ` — ${branchName} ${uz ? 'filiali' : 'филиал'}` : ` (${uz ? 'filial' : 'филиал'})`}
                  </>
                ) : institutionCity}
                {r.institution.deliveryMode === 'HYBRID' && (
                  <span className="ml-1 text-sky-500">+ {uz ? 'onlayn' : 'онлайн'}</span>
                )}
              </span>
            )}
            {/* Narx — hech qachon aniq kurs narxi sifatida emas, "dan
                boshlab" (priceFrom) yoki mavjud bo'lmasa ochiq aytiladi */}
            <span className={`flex items-center gap-1 font-semibold ${price ? 'text-emerald-600' : 'text-gray-400'}`}>
              <Wallet className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              {price ? price.short : t(lang, ui.priceNotProvided)}
            </span>
          </div>

          {/* Top sabablar (2 tagacha) */}
          {reasons.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {reasons.map((reason) => (
                <span key={reason} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <BadgeCheck className="h-3 w-3 shrink-0" strokeWidth={2} /> {reason}
                </span>
              ))}
            </div>
          )}

          {/* Bitta halol eslatma — soxta ijobiy taassurot qoldirmaslik uchun */}
          {caveat && (
            <p className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-700">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
              {uz ? caveat.reasonUz : caveat.reasonRu}
            </p>
          )}

          {/* Solishtirish / Saqlash */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => toggle(compareItem())}
              aria-pressed={compared}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                compared ? 'bg-primary-50 text-primary-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {compared ? t(lang, ui.compared) : t(lang, ui.compare)}
            </button>
            <button
              onClick={() => toggleSave(compareItem())}
              aria-pressed={saved}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                saved ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Star className="h-3.5 w-3.5 shrink-0" fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
              {saved ? t(lang, ui.saved) : t(lang, ui.save)}
            </button>
          </div>
        </div>
      </div>

      {/* Breakdown (nega bu tavsiya) + aniq CTA */}
      <div className="border-t border-gray-100 px-5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-600"
          >
            {expanded
              ? t(lang, ui.hide)
              : <><Lightbulb className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {t(lang, ui.why)}</>}
          </button>
          {/* Sahifaga o'tish uchun ko'rinadigan CTA — faqat nom-havola yetarli emas */}
          <Link
            href={`/institutions/${r.institution.slug}`}
            onClick={() => track('match_result_click', {
              category: 'engagement',
              institutionId: r.institution.id,
              properties: { score: r.match.score, position: idx + 1 },
            })}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100"
          >
            {uz ? "Ko'rish" : 'Смотреть'} →
          </Link>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 pb-2">
            {r.match.components.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs font-semibold text-gray-600">
                  {uz ? c.labelUz : c.labelRu}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${
                      c.score >= 70 ? 'bg-emerald-400' : c.score >= 45 ? 'bg-amber-400' : 'bg-red-300'
                    }`}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
                <span className={`w-24 shrink-0 text-right text-[10px] font-bold uppercase tracking-wide ${
                  !c.hasData ? 'text-gray-400' : c.score >= 70 ? 'text-emerald-600' : c.score >= 45 ? 'text-amber-600' : 'text-red-500'
                }`}>
                  {explanationLabel(c, lang)}
                </span>
                <span className="w-40 shrink-0 truncate text-right text-[11px] text-gray-400">
                  {uz ? c.reasonUz : c.reasonRu}
                </span>
              </div>
            ))}
            <p className="pt-1 text-right text-[10px] text-gray-300">
              {t(lang, ui.confidence)}: {r.match.confidence}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
