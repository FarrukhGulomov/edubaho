'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Target, Sparkles, ArrowRight, Wallet, MapPin, BookOpen, School,
  Laptop, GraduationCap, Globe2, PencilLine, Dumbbell, Trophy, Palette,
  BadgeCheck, UserCog, RotateCcw,
} from 'lucide-react'
import { RatingHint } from '@/components/shared/StarRating'
import { useAuth } from '@/hooks/useAuth'
import { useLang, t } from '@/contexts/LangContext'
import { matchApi, type MatchItem } from '@/lib/api'

/**
 * Profil sahifasining YANGI standart ko'rinishi — shaxsiy tavsiyalar
 * paneli. Sozlamalar o'rniga endi bu ko'rsatiladi (talab: profil ochilishi
 * bilanoq foydalanuvchi o'ziga mos muassasani topishga yo'naltirilsin).
 *
 * Mavjud /match wizard'i va uning natija formatini qayta ishlatadi —
 * yangi backend endpoint yoki DB o'zgarishi shart emas. Oxirgi marta
 * ishlatilgan qidiruv afzalliklari (match/page.tsx saqlaydi) localStorage
 * orqali o'qib, xuddi shu so'rov qisqa preview uchun qayta yuboriladi.
 */

const TYPE_ICONS: Record<string, typeof School> = {
  IT_SCHOOL: Laptop, UNIVERSITY: GraduationCap, SCHOOL: School, KINDERGARTEN: Palette,
  LANGUAGE_CENTER: Globe2, COURSE_CENTER: PencilLine, SPORTS_SCHOOL: Dumbbell, LYCEUM: Trophy,
}

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",      ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',       ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',       ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',       ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet', ru: 'Университет' },
  COURSE_CENTER:   { uz: 'Kurs',        ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi', ru: 'Языковой' },
  IT_SCHOOL:       { uz: 'IT maktab',   ru: 'IT школа' },
  TUTORING:        { uz: 'Repetitor',   ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport',       ru: 'Спорт' },
  ARTS_SCHOOL:     { uz: "San'at",      ru: 'Искусство' },
}

interface StoredMatchPrefs {
  type: string
  goal?: string
  cityId?: string
  budget?: number
  shift?: string
  age?: number
}

function fmtUzs(n: number) {
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
}

const PREVIEW_LIMIT = 3
const STORAGE_KEY = 'edu_last_match'

export default function RecommendationDashboard({ onGoToSettings }: { onGoToSettings: () => void }) {
  const { user } = useAuth()
  const { lang } = useLang()
  const uz = lang === 'uz'

  const [prefs, setPrefs] = useState<StoredMatchPrefs | null>(null)
  const [results, setResults] = useState<MatchItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkedStorage, setCheckedStorage] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setPrefs(JSON.parse(raw))
    } catch {
      // ignore
    } finally {
      setCheckedStorage(true)
    }
  }, [])

  useEffect(() => {
    if (!checkedStorage) return
    if (!prefs?.type) { setLoading(false); return }
    setLoading(true)
    matchApi.find({ ...prefs, limit: PREVIEW_LIMIT })
      .then((res) => {
        setResults(res.data)
        setTotal(res.meta.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedStorage, prefs])

  const isProfileIncomplete = !user?.name

  const ui = {
    greeting:   { uz: `Xush kelibsiz${user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋`, ru: `С возвращением${user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋` },
    subtitle:   { uz: 'Sizga eng mos ta\'lim muassasasini topamiz', ru: 'Найдём для вас самое подходящее учебное заведение' },
    accuracy:   { uz: 'Moslik aniqligi', ru: 'Точность подбора' },
    foundCount: { uz: `${total} ta muassasa sizga mos keldi`, ru: `${total} учреждений подходят вам` },
    mainCta:    { uz: prefs ? 'Tavsiyalarni yangilash' : 'Menga mosini top', ru: prefs ? 'Обновить рекомендации' : 'Подобрать для меня' },
    preview:    { uz: 'Sizga tavsiya etamiz', ru: 'Рекомендуем вам' },
    seeAll:     { uz: "Barchasini ko'rish →", ru: 'Смотреть все →' },
    empty:      { uz: "Hali shaxsiy tavsiyangiz yo'q", ru: 'У вас пока нет персональных рекомендаций' },
    emptyHint:  { uz: "5 ta savolga javob bering — sizga mos muassasalarni topamiz", ru: 'Ответьте на 5 вопросов — подберём подходящие учреждения' },
    completeTitle: { uz: 'Profilingizni to\'ldiring', ru: 'Заполните профиль' },
    completeHint:  { uz: 'Tavsiyalar sifatini oshirish uchun ismingizni kiriting', ru: 'Укажите имя, чтобы улучшить качество рекомендаций' },
    completeBtn:   { uz: 'Profilni to\'ldirish', ru: 'Заполнить профиль' },
    filters:    { uz: 'Tezkor filtrlar', ru: 'Быстрые фильтры' },
    fBudget:    { uz: 'Byudjet', ru: 'Бюджет' },
    fLocation:  { uz: 'Manzil', ru: 'Локация' },
    fCourse:    { uz: 'Yo\'nalish', ru: 'Направление' },
    settings:   { uz: 'Sozlamalar', ru: 'Настройки' },
    match:      { uz: 'moslik', ru: 'совпадение' },
    reasonsBecause: { uz: 'Mos kelish sababi:', ru: 'Почему подходит:' },
  }

  return (
    <div className="space-y-5">
      {/* ══ Sarlavha + Sozlamalar tugmasi ══════════════════════ */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t(lang, ui.greeting)}</h1>
          <p className="mt-1 text-base text-gray-500">{t(lang, ui.subtitle)}</p>
        </div>
        <button
          onClick={onGoToSettings}
          title={t(lang, ui.settings)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-primary-300 hover:text-primary-600"
        >
          <UserCog className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* ══ Moslik ballari kartochkasi ══════════════════════════ */}
      {prefs && !loading && results.length > 0 && (
        <div className="flex items-center gap-4 rounded-2xl border border-primary-100 bg-primary-50/60 p-5">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary-600 font-bold text-white">
            <span className="text-xl leading-none">{results[0].match.score}%</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary-700">{t(lang, ui.accuracy)}</p>
            <p className="truncate text-base font-bold text-gray-900">{t(lang, ui.foundCount)}</p>
          </div>
        </div>
      )}

      {/* ══ Asosiy CTA ══════════════════════════════════════════ */}
      <Link
        href="/match"
        className="btn-primary flex w-full items-center justify-center gap-2 py-4 text-lg"
      >
        <Target className="h-5 w-5 shrink-0" strokeWidth={2} />
        {t(lang, ui.mainCta)}
      </Link>

      {/* ══ Profilni to'ldirish (agar to'liq bo'lmasa) ═════════ */}
      {isProfileIncomplete && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="min-w-0">
            <p className="font-semibold text-amber-900">{t(lang, ui.completeTitle)}</p>
            <p className="text-sm text-amber-700">{t(lang, ui.completeHint)}</p>
          </div>
          <button
            onClick={onGoToSettings}
            className="shrink-0 whitespace-nowrap rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
          >
            {t(lang, ui.completeBtn)}
          </button>
        </div>
      )}

      {/* ══ Tezkor filtrlar — mavjud /search sahifasiga yo'naltiradi,
             yangi filtr logikasi yaratilmaydi ══════════════════ */}
      {prefs && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t(lang, ui.filters)}</p>
          <div className="flex flex-wrap gap-2">
            {prefs.budget ? (
              <Link
                href={`/search?type=${prefs.type}&monthlyMax=${prefs.budget}`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-700"
              >
                <Wallet className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {t(lang, ui.fBudget)}
              </Link>
            ) : null}
            {prefs.cityId ? (
              <Link
                href={`/search?type=${prefs.type}&cityId=${prefs.cityId}`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-700"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {t(lang, ui.fLocation)}
              </Link>
            ) : null}
            {prefs.goal ? (
              <Link
                href={`/search?type=${prefs.type}&q=${encodeURIComponent(prefs.goal)}`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-700"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {t(lang, ui.fCourse)}
              </Link>
            ) : null}
            <Link
              href="/match"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-700"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {uz ? 'Qaytadan' : 'Заново'}
            </Link>
          </div>
        </div>
      )}

      {/* ══ Tavsiyalar preview'i ════════════════════════════════ */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="shimmer h-16 w-16 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-4 w-3/4 rounded-lg" />
                  <div className="shimmer h-3 w-1/2 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !prefs ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-9 w-9 text-primary-300" strokeWidth={1.5} />
          <p className="font-semibold text-gray-800">{t(lang, ui.empty)}</p>
          <p className="mt-1 text-sm text-gray-500">{t(lang, ui.emptyHint)}</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Sparkles className="h-5 w-5 shrink-0 text-primary-500" strokeWidth={1.75} /> {t(lang, ui.preview)}
            </h2>
            <Link href="/match" className="text-sm font-semibold text-primary-600 hover:underline">
              {t(lang, ui.seeAll)}
            </Link>
          </div>
          <div className="space-y-3">
            {results.map((r) => {
              const TypeIcon = TYPE_ICONS[r.institution.type] ?? School
              const typeLabel = TYPE_LABELS[r.institution.type]
              const name = uz ? r.institution.nameUz : (r.institution.nameRu ?? r.institution.nameUz)
              const reasons = uz ? r.match.topReasonsUz : r.match.topReasonsRu
              return (
                <Link key={r.institution.id} href={`/institutions/${r.institution.slug}`} className="card block p-4 transition-colors hover:border-primary-300">
                  <div className="flex items-start gap-3">
                    <span className="icon-chip h-12 w-12 shrink-0">
                      <TypeIcon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-semibold text-gray-900">{name}</p>
                        {r.institution.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary-500" strokeWidth={2} />}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-500">
                        {typeLabel && <span>{t(lang, typeLabel)}</span>}
                        {r.institution.avgRating != null && (
                          <RatingHint rating={r.institution.avgRating} count={r.institution.reviewCount} lang={lang} />
                        )}
                        {r.institution.pricing?.monthlyMin && (
                          <span className="font-semibold text-emerald-600">{fmtUzs(r.institution.pricing.monthlyMin)}/{uz ? 'oy' : 'мес'}</span>
                        )}
                      </div>
                      {reasons.length > 0 && (
                        <p className="mt-1.5 truncate text-xs text-gray-400">
                          {t(lang, ui.reasonsBecause)} {reasons.join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-center">
                      <span className="text-lg font-black text-primary-600">{r.match.score}%</span>
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-gray-300" strokeWidth={2} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
