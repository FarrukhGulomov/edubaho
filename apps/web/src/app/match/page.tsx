'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

const TYPE_OPTIONS = [
  { value: 'COURSE_CENTER',   icon: '✏️', uz: "O'quv markaz",   ru: 'Учебный центр' },
  { value: 'LANGUAGE_CENTER', icon: '🌐', uz: 'Til markazi',     ru: 'Языковой центр' },
  { value: 'IT_SCHOOL',       icon: '💻', uz: 'IT maktab',       ru: 'IT школа' },
  { value: 'SCHOOL',          icon: '📚', uz: 'Maktab',          ru: 'Школа' },
  { value: 'KINDERGARTEN',    icon: '🎨', uz: "Bog'cha",         ru: 'Детский сад' },
  { value: 'UNIVERSITY',      icon: '🎓', uz: 'Universitet',     ru: 'Университет' },
  { value: 'LYCEUM',          icon: '🏆', uz: 'Litsey',          ru: 'Лицей' },
  { value: 'SPORTS_SCHOOL',   icon: '⚽', uz: 'Sport maktabi',   ru: 'Спортшкола' },
  { value: 'ARTS_SCHOOL',     icon: '🎭', uz: "San'at maktabi",  ru: 'Школа искусств' },
]

const GOAL_SUGGESTIONS: Record<string, string[]> = {
  LANGUAGE_CENTER: ['IELTS', 'Ingliz tili', 'Rus tili', 'Koreys tili', 'Nemis tili'],
  IT_SCHOOL:       ['Frontend', 'Backend', 'Python', 'Grafik dizayn', 'Kiberxavfsizlik'],
  COURSE_CENTER:   ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'DTM tayyorlov'],
  SCHOOL:          ['Prezident maktabi', 'Xususiy maktab', 'Ingliz tili'],
}

const BUDGET_OPTIONS = [
  { value: 500_000,    uz: "500 ming so'mgacha",   ru: 'До 500 тыс. сум' },
  { value: 1_000_000,  uz: "1 mln so'mgacha",      ru: 'До 1 млн сум' },
  { value: 2_000_000,  uz: "2 mln so'mgacha",      ru: 'До 2 млн сум' },
  { value: 5_000_000,  uz: "5 mln so'mgacha",      ru: 'До 5 млн сум' },
  { value: 0,          uz: 'Farqi yo\'q',           ru: 'Не важно' },
]

const SHIFT_OPTIONS = [
  { value: 'morning',   icon: '🌅', uz: 'Ertalab',      ru: 'Утром' },
  { value: 'afternoon', icon: '☀️', uz: 'Tushdan keyin', ru: 'Днём' },
  { value: 'evening',   icon: '🌆', uz: 'Kechqurun',    ru: 'Вечером' },
  { value: 'weekend',   icon: '📅', uz: 'Hafta oxiri',  ru: 'Выходные' },
  { value: '',          icon: '🕐', uz: 'Farqi yo\'q',   ru: 'Не важно' },
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
    restart:   { uz: '↻ Qaytadan boshlash', ru: '↻ Начать заново' },
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
    <div className="min-h-screen bg-gradient-to-b from-primary-50/60 to-white">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Sarlavha */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">🎯 {t(lang, ui.title)}</h1>
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
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md active:scale-95 ${
                  type === o.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <span className="text-3xl">{o.icon}</span>
                <span className="text-sm font-bold text-gray-800">{uz ? o.uz : o.ru}</span>
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
                className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-gray-600 hover:bg-primary-50"
              >
                🌍 {t(lang, ui.anyCity)}
              </button>
              {cities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCityId(c.id); setStep('budget') }}
                  className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                    cityId === c.id ? 'bg-primary-100 text-primary-700' : 'text-gray-800 hover:bg-primary-50'
                  }`}
                >
                  📍 {uz ? c.nameUz : (c.nameRu ?? c.nameUz)}
                  {c.region && (
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
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
                  className={`w-full rounded-2xl border-2 bg-white px-5 py-3.5 text-left font-bold shadow-sm transition-all hover:border-primary-400 hover:shadow-md active:scale-[0.98] ${
                    budget === (b.value || null) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  💰 {uz ? b.uz : b.ru}
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
                    className={`flex items-center gap-2.5 rounded-2xl border-2 bg-white px-4 py-3 font-bold shadow-sm transition-all hover:border-primary-400 active:scale-95 ${
                      shift === val ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="text-xl">{s.icon}</span>
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
                className="btn-primary px-8"
              >
                🎯 {uz ? 'Natijani ko\'rish' : 'Показать результат'}
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
              <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">⚠️ {error}</div>
            )}

            {!loading && !error && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">{t(lang, ui.results)}</h2>
                  <button
                    onClick={() => { setStep('type'); setResults([]) }}
                    className="text-sm font-semibold text-primary-600 hover:underline"
                  >
                    {t(lang, ui.restart)}
                  </button>
                </div>

                {results.length === 0 && (
                  <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
                    <div className="mb-3 text-5xl">🔍</div>
                    <p className="text-gray-500">{t(lang, ui.empty)}</p>
                  </div>
                )}

                {results.map((r, idx) => (
                  <div key={r.institution.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-start gap-4 p-5">
                      {/* Moslik foizi */}
                      <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl font-black text-white ${
                        r.match.score >= 80 ? 'bg-emerald-500' : r.match.score >= 60 ? 'bg-amber-500' : 'bg-gray-400'
                      }`}>
                        <span className="text-xl leading-none">{r.match.score}%</span>
                        <span className="mt-0.5 text-[9px] font-semibold opacity-80">{t(lang, ui.matchPct)}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {idx === 0 && r.match.score >= 70 && <span title="Eng yaxshi moslik">🥇</span>}
                          <Link
                            href={`/institutions/${r.institution.slug}`}
                            onClick={() => track('match_result_click', {
                              category: 'engagement',
                              institutionId: r.institution.id,
                              properties: { score: r.match.score, position: idx + 1 },
                            })}
                            className="truncate font-black text-gray-900 hover:text-primary-600"
                          >
                            {uz ? r.institution.nameUz : (r.institution.nameRu ?? r.institution.nameUz)}
                          </Link>
                          {r.institution.isVerified && <span className="text-primary-500" title="Tasdiqlangan">✓</span>}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          {r.institution.avgRating != null && (
                            <span className="flex items-center gap-1">
                              <StarRating rating={r.institution.avgRating} size="sm" showValue={false} />
                              {r.institution.avgRating.toFixed(1)} ({r.institution.reviewCount} {t(lang, ui.reviews)})
                            </span>
                          )}
                          {r.institution.city && (
                            <span>📍 {uz ? r.institution.city.nameUz : (r.institution.city.nameRu ?? r.institution.city.nameUz)}</span>
                          )}
                        </div>

                        {/* Top sabablar */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {(uz ? r.match.topReasonsUz : r.match.topReasonsRu).map((reason) => (
                            <span key={reason} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              ✓ {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown (nega bu tavsiya) */}
                    <div className="border-t border-gray-100 px-5 py-2.5">
                      <button
                        onClick={() => setExpanded(expanded === r.institution.id ? null : r.institution.id)}
                        className="text-xs font-semibold text-gray-400 hover:text-primary-600"
                      >
                        {expanded === r.institution.id ? t(lang, ui.hide) : `💡 ${t(lang, ui.why)}`}
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
