'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Target, PencilLine, School, Trophy, Sunrise, Sun, Sunset, Calendar,
  Clock, Wallet, Globe, MapPin, BadgeCheck, Lightbulb, AlertCircle,
  Search, RotateCcw, Medal,
} from 'lucide-react'
import Header from '@/components/shared/Header'
import StarRating from '@/components/shared/StarRating'
import { useLang, t } from '@/contexts/LangContext'
import { matchApi, geoApi, type MatchItem } from '@/lib/api'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/telegram'

/**
 * EduFit — "Menga mosini top" wizard'i
 *
 * 5 qadamli anketa → har bir muassasa uchun shaxsiy moslik balli (0-100)
 * va NEGA mos kelishining shaffof sabablari.
 */

type Step = 'type' | 'goal' | 'city' | 'budget' | 'time' | 'results'

interface CityOption {
  id: string
  nameUz: string
  nameRu?: string | null
  region?: { nameUz: string; nameRu?: string | null } | null
}

// Faqat haqiqiy ma'lumoti bor turlar — aks holda user 5 savolga javob berib
// bo'sh natija oladi (bosh sahifa/qidiruv filtrlari bilan bir xil siyosat)
const TYPE_OPTIONS = [
  { value: 'COURSE_CENTER', Icon: PencilLine, uz: "O'quv markaz", ru: 'Учебный центр' },
  { value: 'SCHOOL',        Icon: School,     uz: 'Maktab',       ru: 'Школа' },
  { value: 'LYCEUM',        Icon: Trophy,     uz: 'Litsey',       ru: 'Лицей' },
]

const GOAL_SUGGESTIONS: Record<string, string[]> = {
  COURSE_CENTER: ['IELTS', 'Ingliz tili', 'Frontend', 'Python', 'Matematika', 'DTM tayyorlov'],
  SCHOOL:        ['Prezident maktabi', 'Xususiy maktab', 'Ingliz tili'],
  LYCEUM:        ['Matematika (olimpiada)', 'Fizika', 'Kimyo'],
}

const BUDGET_OPTIONS = [
  { value: 500_000,    uz: "500 ming so'mgacha",   ru: 'До 500 тыс. сум' },
  { value: 1_000_000,  uz: "1 mln so'mgacha",      ru: 'До 1 млн сум' },
  { value: 2_000_000,  uz: "2 mln so'mgacha",      ru: 'До 2 млн сум' },
  { value: 5_000_000,  uz: "5 mln so'mgacha",      ru: 'До 5 млн сум' },
  { value: 0,          uz: 'Farqi yo\'q',           ru: 'Не важно' },
]

const SHIFT_OPTIONS = [
  { value: 'morning',   Icon: Sunrise, uz: 'Ertalab',      ru: 'Утром' },
  { value: 'afternoon', Icon: Sun,     uz: 'Tushdan keyin', ru: 'Днём' },
  { value: 'evening',   Icon: Sunset,  uz: 'Kechqurun',    ru: 'Вечером' },
  { value: 'weekend',   Icon: Calendar, uz: 'Hafta oxiri',  ru: 'Выходные' },
  { value: '',          Icon: Clock,   uz: 'Farqi yo\'q',   ru: 'Не важно' },
]

const STEPS: Step[] = ['type', 'goal', 'city', 'budget', 'time']

export default function MatchPage() {
  const { lang } = useLang()
  const uz = lang === 'uz'

  const [step, setStep]         = useState<Step>('type')
  const [type, setType]         = useState('')
  const [goal, setGoal]         = useState('')
  const [cityId, setCityId]     = useState('')
  const [cities, setCities]     = useState<CityOption[]>([])
  const [budget, setBudget]     = useState<number | null>(null)
  const [shift, setShift]       = useState<string | null>(null)
  const [age, setAge]           = useState('')
  const [results, setResults]   = useState<MatchItem[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    track('match_started', { category: 'engagement' })
    geoApi.cities().then((r) => setCities(r.data as CityOption[])).catch(() => {})
  }, [])

  const stepIndex = STEPS.indexOf(step)

  async function runMatch(finalShift: string | null) {
    setLoading(true)
    setError('')
    setStep('results')
    try {
      const res = await matchApi.find({
        type,
        goal:   goal || undefined,
        cityId: cityId || undefined,
        budget: budget || undefined,
        shift:  finalShift || undefined,
        age:    age ? Number(age) : undefined,
      })
      setResults(res.data)
      haptic('success')
      track('match_completed', {
        category: 'engagement',
        properties: { type, goal, budget, shift: finalShift, resultCount: res.data.length },
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t(lang, { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка' }))
    } finally {
      setLoading(false)
    }
  }

  const ui = {
    title:     { uz: 'Menga mosini top', ru: 'Подобрать для меня' },
    subtitle:  { uz: '5 ta savolga javob bering — sizga eng mos muassasalarni hisoblab beramiz', ru: 'Ответьте на 5 вопросов — мы рассчитаем самые подходящие для вас заведения' },
    qType:     { uz: 'Nima qidiryapsiz?', ru: 'Что вы ищете?' },
    qGoal:     { uz: 'Maqsadingiz nima?', ru: 'Какая у вас цель?' },
    qGoalHint: { uz: 'Masalan: IELTS, Frontend, matematika... (ixtiyoriy)', ru: 'Например: IELTS, Frontend, математика... (необязательно)' },
    qCity:     { uz: 'Qaysi shaharda?', ru: 'В каком городе?' },
    qBudget:   { uz: 'Oylik byudjetingiz?', ru: 'Ваш месячный бюджет?' },
    qTime:     { uz: 'Qachon o\'qiy olasiz?', ru: 'Когда вы можете учиться?' },
    qAge:      { uz: "O'quvchi yoshi (ixtiyoriy)", ru: 'Возраст ученика (необязательно)' },
    next:      { uz: 'Keyingisi →', ru: 'Далее →' },
    skip:      { uz: "O'tkazib yuborish", ru: 'Пропустить' },
    back:      { uz: '← Orqaga', ru: '← Назад' },
    results:   { uz: 'Sizga mos natijalar', ru: 'Подходящие вам результаты' },
    matchPct:  { uz: 'moslik', ru: 'совпадение' },
    confidence:{ uz: 'ishonchlilik', ru: 'достоверность' },
    why:       { uz: 'Nega bu tavsiya?', ru: 'Почему эта рекомендация?' },
    hide:      { uz: 'Yopish', ru: 'Скрыть' },
    empty:     { uz: 'Afsuski, mos muassasa topilmadi. Boshqa tur yoki shahar bilan urinib ko\'ring.', ru: 'К сожалению, ничего не найдено. Попробуйте другой тип или город.' },
    restart:   { uz: 'Qaytadan boshlash', ru: 'Начать заново' },
    anyCity:   { uz: 'Farqi yo\'q / Online', ru: 'Не важно / Онлайн' },
    reviews:   { uz: 'sharh', ru: 'отзывов' },
    seeMore:   { uz: 'Batafsil →', ru: 'Подробнее →' },
  }

  function goBack() {
    if (step === 'results') { setStep('time'); return }
    const i = STEPS.indexOf(step)
    if (i > 0) setStep(STEPS[i - 1])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-8">
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
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* ── 1. Tur ── */}
        {step === 'type' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => { haptic('light'); setType(o.value); setStep('goal') }}
                className={`flex flex-col items-center gap-2 rounded-2xl border bg-white p-5 shadow-sm transition-colors hover:border-primary-300 ${
                  type === o.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <o.Icon className="h-7 w-7 text-primary-500" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-gray-800">{uz ? o.uz : o.ru}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── 2. Maqsad ── */}
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
              onBack={goBack}
              onNext={() => setStep('city')}
              nextLabel={t(lang, goal ? ui.next : ui.skip)}
              backLabel={t(lang, ui.back)}
            />
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
                  onClick={() => { setBudget(b.value || null); setStep('time') }}
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

        {/* ── 5. Vaqt + yosh ── */}
        {step === 'time' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900">{t(lang, ui.qTime)}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {SHIFT_OPTIONS.map((s) => {
                // '' qiymati "Farqi yo'q" degani — 'any' sifatida saqlanadi
                const val = s.value || 'any'
                return (
                  <button
                    key={val}
                    onClick={() => setShift(val)}
                    className={`flex items-center gap-2.5 rounded-xl border bg-white px-4 py-3 font-semibold shadow-sm transition-colors hover:border-primary-300 ${
                      shift === val ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <s.Icon className="h-5 w-5 shrink-0 text-primary-500" strokeWidth={1.75} />
                    <span className="text-sm">{uz ? s.uz : s.ru}</span>
                  </button>
                )
              })}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-600">{t(lang, ui.qAge)}</label>
              <input
                type="number"
                min={1}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="18"
                className="input w-32 px-4 py-2.5"
              />
            </div>

            <div className="flex items-center justify-between">
              <button onClick={goBack} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
                {t(lang, ui.back)}
              </button>
              <button
                onClick={() => runMatch(shift === 'any' ? null : shift)}
                className="btn-primary inline-flex items-center gap-2 px-8"
              >
                <Target className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {uz ? 'Natijani ko\'rish' : 'Показать результат'}
              </button>
            </div>
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
                  <h2 className="text-lg font-bold text-gray-900">{t(lang, ui.results)}</h2>
                  <button
                    onClick={() => { setStep('type'); setResults([]) }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {t(lang, ui.restart)}
                  </button>
                </div>

                {results.length === 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
                    <div className="mb-3 flex justify-center">
                      <Search className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
                    </div>
                    <p className="text-gray-500">{t(lang, ui.empty)}</p>
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
                            <span className="flex items-center gap-1">
                              <StarRating rating={r.institution.avgRating} size="sm" />
                              ({r.institution.reviewCount} {t(lang, ui.reviews)})
                            </span>
                          )}
                          {r.institution.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                              {uz ? r.institution.city.nameUz : (r.institution.city.nameRu ?? r.institution.city.nameUz)}
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

                    {/* Breakdown (nega bu tavsiya) */}
                    <div className="border-t border-gray-100 px-5 py-2.5">
                      <button
                        onClick={() => setExpanded(expanded === r.institution.id ? null : r.institution.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary-600"
                      >
                        {expanded === r.institution.id
                          ? t(lang, ui.hide)
                          : <><Lightbulb className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {t(lang, ui.why)}</>}
                      </button>

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
    </div>
  )
}

function WizardNav({ onBack, onNext, nextLabel, backLabel }: {
  onBack: () => void
  onNext?: () => void
  nextLabel?: string
  backLabel?: string
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button onClick={onBack} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
        {backLabel ?? '← Orqaga'}
      </button>
      {onNext && (
        <button
          onClick={onNext}
          className="btn-primary px-6 py-3"
        >
          {nextLabel ?? 'Keyingisi →'}
        </button>
      )}
    </div>
  )
}
