'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Target, PencilLine, School, Palette,
  Clock, Wallet, Globe, MapPin, BadgeCheck, Lightbulb, AlertCircle,
  Search, RotateCcw, Medal, Lock, ArrowRight, Info, Building2, Shuffle,
  Wifi, Sparkles, Star,
} from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { RatingHint } from '@/components/shared/StarRating'
import { useLang, t } from '@/contexts/LangContext'
import { matchApi, geoApi, authApi, type MatchItem, type MatchInsights } from '@/lib/api'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/telegram'
import { GOAL_SUGGESTIONS } from '@/lib/matchConstants'

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

const STEPS: Step[] = ['goal', 'format', 'city', 'budget']

/** UZS format: 1 500 000 so'm (loyiha standarti — bo'shliq ajratuvchi) */
function fmtUzs(n: number) {
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
}

export default function MatchPage() {
  const { lang } = useLang()
  const uz = lang === 'uz'
  const router = useRouter()

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
  // Live insight: anketa to'ldirilayotganda real DB ma'lumotiga asoslangan
  // aniq raqamlar (soxta emas) — foydalanuvchi hali "Ko'rish"ni bosmasdan
  const [insights, setInsights] = useState<MatchInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  // Profil onboarding rejimi: ?next=/profile bilan kelingan bo'lsa —
  // wizard tugagach (yoki o'tkazib yuborilganda) o'sha yerga qaytariladi
  // va bajarilgani profilda saqlanadi (bir marta ko'rsatish uchun)
  const [next, setNext] = useState<string | null>(null)

  useEffect(() => {
    track('match_started', { category: 'engagement' })
    geoApi.cities().then((r) => setCities(r.data as CityOption[])).catch(() => {})

    const params = new URLSearchParams(window.location.search)

    // Deep-link: bosh sahifadagi hero'da tur allaqachon tanlangan bo'lsa
    // (?type=SCHOOL) — shu turga o'rnatamiz (hozircha faqat COURSE_CENTER
    // aktiv, boshqalari kelajak uchun). Agar maqsad ham kiritilgan bo'lsa
    // (?type=...&goal=IELTS) — "maqsad" qadamini ham takrorlamasdan
    // to'g'ridan-to'g'ri formatdan davom etamiz
    const preType = params.get('type')
    const preGoal = params.get('goal')
    if (preType && TYPE_OPTIONS.some((o) => o.value === preType && !o.disabled)) {
      setType(preType)
    }
    if (preGoal?.trim()) {
      setGoal(preGoal.trim())
      setStep('format')
    }

    // Faqat ichki yo'llar qabul qilinadi (open-redirect himoyasi) —
    // auth/page.tsx'dagi bir xil qoida
    const n = params.get('next')
    if (n && n.startsWith('/') && !n.startsWith('//')) setNext(n)
  }, [])

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
  const stepIndex = activeSteps.indexOf(step)

  async function runMatch(finalBudget: number | null) {
    setLoading(true)
    setError('')
    setStep('results')
    try {
      const prefs = {
        type,
        goal:   goal || undefined,
        cityId: cityId || undefined,
        budget: finalBudget || undefined,
        format: format || undefined,
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
          type, goal, budget: finalBudget, resultCount: res.data.length,
          cityId: cityId || undefined, format: format || undefined,
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
    next:      { uz: 'Keyingisi →', ru: 'Далее →' },
    skip:      { uz: "O'tkazib yuborish", ru: 'Пропустить' },
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
  }

  function goBack() {
    if (step === 'results') { setStep('budget'); return }
    const i = activeSteps.indexOf(step)
    if (i > 0) setStep(activeSteps[i - 1])
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
              className="shrink-0 whitespace-nowrap text-sm font-semibold text-primary-600 hover:underline"
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

        {/* Progress bar */}
        {step !== 'results' && (
          <div className="mb-8 flex gap-1.5">
            {activeSteps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              />
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
            <h2 className="text-lg font-bold text-gray-900">{t(lang, ui.qGoal)}</h2>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t(lang, ui.qGoalHint)}
              maxLength={100}
              className="input"
            />
            {(GOAL_SUGGESTIONS[type] ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(GOAL_SUGGESTIONS[type] ?? []).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                      goal === g
                        ? 'border-primary-500 bg-primary-600 text-white'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-primary-400'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
            <WizardNav
              onNext={() => setStep('format')}
              nextLabel={t(lang, goal ? ui.next : ui.skip)}
              nextDisabled={!!goal.trim() && insights?.matchingCount === 0}
            />
          </div>
        )}

        {/* ── 2b. O'qish formati ── */}
        {step === 'format' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{t(lang, ui.qFormat)}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {FORMAT_OPTIONS.map((o) => {
                const val = o.value || 'any'
                return (
                  <button
                    key={val}
                    onClick={() => {
                      const next = o.value || null
                      setFormat(next)
                      // Onlayn tanlansa — shahar so'ralmaydi, to'g'ridan-to'g'ri byudjetga o'tamiz
                      setStep(next === 'online' ? 'budget' : 'city')
                    }}
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
            <h2 className="text-lg font-bold text-gray-900">{t(lang, ui.qCity)}</h2>
            <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2">
              <button
                onClick={() => { setCityId(''); setStep('budget') }}
                className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-gray-600 hover:bg-primary-50"
              >
                <Globe className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t(lang, ui.anyCity)}
              </button>
              {cities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCityId(c.id); setStep('budget') }}
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
            <h2 className="text-lg font-bold text-gray-900">{t(lang, ui.qBudget)}</h2>
            <div className="space-y-2">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => { const val = b.value || null; setBudget(val); runMatch(val) }}
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
                      // "Qaytadan boshlash" — chinakam nol nuqtadan boshlaydi
                      // (avvalgi barcha tanlovlar tozalanadi, faqat tur
                      // COURSE_CENTER bo'lib qoladi — MVP'da yagona aktiv tur)
                      setStep('goal')
                      setResults([])
                      setResultsMeta({})
                      setGoal('')
                      setFormat(null)
                      setCityId('')
                      setBudget(null)
                    }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {t(lang, ui.restart)}
                  </button>
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

                {results.length > 0 && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-800">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                    <p>
                      {uz
                        ? "Muassasa bilan bog'lanish uchun ma'lumotlaringiz (ism, telefon) siz qiziqish bildirgan ta'lim muassasasiga taqdim etilishi mumkin."
                        : 'Для связи с учреждением ваши данные (имя, телефон) могут быть переданы выбранному учебному заведению.'}
                    </p>
                  </div>
                )}

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

                {results.map((r, idx) => (
                  <div key={r.institution.id} className="card overflow-hidden">
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
                          ) : r.institution.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                              {uz ? r.institution.city.nameUz : (r.institution.city.nameRu ?? r.institution.city.nameUz)}
                              {r.institution.deliveryMode === 'HYBRID' && (
                                <span className="ml-1 text-sky-500">+ {uz ? 'onlayn' : 'онлайн'}</span>
                              )}
                            </span>
                          )}
                          {/* Narx — byudjet so'ralgani uchun natijada ham ko'rsatamiz */}
                          {r.institution.pricing?.monthlyMin && (
                            <span className="flex items-center gap-1 font-semibold text-emerald-600">
                              <Wallet className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                              {fmtUzs(r.institution.pricing.monthlyMin)}{uz ? '/oy' : '/мес'}
                            </span>
                          )}
                        </div>

                        {/* Top sabablar */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {(uz ? r.match.topReasonsUz : r.match.topReasonsRu).map((reason) => (
                            <span key={reason} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              <BadgeCheck className="h-3 w-3 shrink-0" strokeWidth={2} /> {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown (nega bu tavsiya) + aniq CTA */}
                    <div className="border-t border-gray-100 px-5 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => setExpanded(expanded === r.institution.id ? null : r.institution.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary-600"
                        >
                          {expanded === r.institution.id
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

                      {expanded === r.institution.id && (
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
      <div className={`flex items-center gap-2 text-sm font-bold ${zeroMatches ? 'text-amber-700' : 'text-primary-700'}`}>
        <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {zeroMatches
          ? (uz ? "Bu yo'nalish bo'yicha hozircha muassasa yo'q" : 'По этому направлению пока нет учреждений')
          : (uz
              ? `${insights.matchingCount} ta muassasa mos keladi`
              : `Подходит ${insights.matchingCount} учреждений`)}
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
