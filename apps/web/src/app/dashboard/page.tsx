'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Construction, Send, Loader2, TrendingUp, TrendingDown, Eye,
  Heart, Star, ClipboardCheck, Clock, AlertCircle, ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLang, t } from '@/contexts/LangContext'
import { dashboardApi, type DashboardOverview, type DashboardProfileCompleteness } from '@/lib/api'
import StarRating from '@/components/shared/StarRating'

// Bu sahifa avval har doim bir xil statik "tez orada" matnini ko'rsatardi —
// tasdiqlangan muassasa egasi ham, so'rovi kutilayotgan yoki umuman so'rov
// yubormagan foydalanuvchi ham (UX audit topilmasi). Endi holatga qarab:
//  - APPROVED egasi   → haqiqiy KPI paneli (/dashboard/overview API'dan)
//  - PENDING so'rov    → tekshirilmoqda xabari
//  - REJECTED so'rov   → rad etilgani va Telegram orqali murojaat
//  - so'rov yo'q       → muassasani topib da'vo qilishga taklif

const ui = {
  loading:      { uz: 'Yuklanmoqda...', ru: 'Загрузка...' },
  needAuth:     { uz: 'Panelga kirish uchun tizimga kiring', ru: 'Войдите, чтобы открыть панель' },
  loginBtn:     { uz: 'Kirish', ru: 'Войти' },
  pendingTitle: { uz: "Egalik so'rovingiz tekshirilmoqda", ru: 'Запрос на подтверждение проверяется' },
  pendingDesc:  {
    uz: "Moderatorlarimiz so'rovingizni ko'rib chiqmoqda. Odatda bu 1-2 ish kunini oladi.",
    ru: 'Наши модераторы рассматривают запрос. Обычно это занимает 1-2 рабочих дня.',
  },
  rejectedTitle: { uz: "Egalik so'rovi rad etildi", ru: 'Запрос отклонён' },
  rejectedDesc: {
    uz: "So'rovingiz tasdiqlanmadi. Sabab yoki qayta ko'rib chiqish uchun biz bilan bog'laning.",
    ru: 'Ваш запрос не был подтверждён. Свяжитесь с нами, чтобы узнать причину или подать повторно.',
  },
  noClaimTitle: { uz: 'Muassasangizni boshqarishni xohlaysizmi?', ru: 'Хотите управлять своим учреждением?' },
  noClaimDesc:  {
    uz: "Muassasangizni qidiruvdan toping va uning sahifasida \"Bu muassasa siznikimi?\" tugmasini bosing.",
    ru: 'Найдите своё учреждение в поиске и нажмите «Это ваше заведение?» на его странице.',
  },
  findBtn:      { uz: 'Muassasani qidirish', ru: 'Найти учреждение' },
  telegramBtn:  { uz: 'Telegram orqali murojaat', ru: 'Написать в Telegram' },
  home:         { uz: 'Bosh sahifaga qaytish', ru: 'На главную' },
  errorTitle:   { uz: "Ma'lumotlarni yuklab bo'lmadi", ru: 'Не удалось загрузить данные' },
  retry:        { uz: "Qayta urinish", ru: 'Повторить' },
  viewsThisMonth: { uz: 'Bu oy ko\'rishlar', ru: 'Просмотры за месяц' },
  savesThisMonth: { uz: 'Saqlanganlar', ru: 'Добавлено в избранное' },
  avgRating:    { uz: "O'rtacha baho", ru: 'Средний рейтинг' },
  reviewCount:  { uz: 'Sharhlar soni', ru: 'Количество отзывов' },
  profileCompleteness: { uz: 'Profil to\'liqligi', ru: 'Заполненность профиля' },
  recentReviews: { uz: "So'nggi sharhlar", ru: 'Последние отзывы' },
  noReviews:    { uz: "Hozircha sharhlar yo'q", ru: 'Отзывов пока нет' },
  viewProfile:  { uz: 'Sahifani ko\'rish', ru: 'Открыть страницу' },
  anonymous:    { uz: 'Anonim', ru: 'Аноним' },
  managementNote: {
    uz: "Profilni tahrirlash va rasm yuklash imkoniyati hozircha jamoamiz orqali amalga oshiriladi — Telegram orqali murojaat qiling.",
    ru: 'Редактирование профиля и загрузка фото пока доступны через нашу команду — напишите в Telegram.',
  },
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-gray-400">{icon}<span className="text-xs font-semibold">{label}</span></div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub}
    </div>
  )
}

function CenteredMessage({
  icon, title, desc, children,
}: { icon: React.ReactNode; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">{icon}</div>
      <h1 className="mb-3 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mb-8 max-w-sm leading-relaxed text-gray-500">{desc}</p>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { lang } = useLang()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [completeness, setCompleteness] = useState<DashboardProfileCompleteness | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const isOwner = user?.role === 'INSTITUTION_OWNER'
  const latestClaim = user?.institutionClaims?.[0]

  useEffect(() => {
    if (!isOwner) return
    const token = localStorage.getItem('accessToken')
    if (!token) return

    setDataLoading(true)
    setDataError(false)
    Promise.all([dashboardApi.overview(token), dashboardApi.profileCompleteness(token)])
      .then(([ov, comp]) => {
        setOverview(ov.data)
        setCompleteness(comp.data)
      })
      .catch(() => setDataError(true))
      .finally(() => setDataLoading(false))
  }, [isOwner, reloadKey])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    )
  }

  if (!user) {
    return (
      <CenteredMessage
        icon={<Construction className="h-10 w-10 text-gray-300" strokeWidth={1.5} />}
        title={t(lang, ui.needAuth)}
        desc=""
      >
        <Link href="/auth?next=/dashboard" className="rounded-xl bg-primary-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-700">
          {t(lang, ui.loginBtn)}
        </Link>
      </CenteredMessage>
    )
  }

  // ── Muassasa egasi (APPROVED) — haqiqiy KPI paneli ──
  if (isOwner) {
    if (dataLoading && !overview) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      )
    }

    if (dataError || !overview) {
      return (
        <CenteredMessage
          icon={<AlertCircle className="h-10 w-10 text-red-300" strokeWidth={1.5} />}
          title={t(lang, ui.errorTitle)}
          desc=""
        >
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-xl bg-primary-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
          >
            {t(lang, ui.retry)}
          </button>
        </CenteredMessage>
      )
    }

    const { institution, kpi, recentReviews } = overview
    const growthPositive = kpi.viewsGrowth >= 0

    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-900">{institution.nameUz}</h1>
            <Link
              href={`/institutions/${institution.slug}`}
              target="_blank"
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              {t(lang, ui.viewProfile)} <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              icon={<Eye className="h-4 w-4" strokeWidth={1.75} />}
              label={t(lang, ui.viewsThisMonth)}
              value={String(kpi.viewsThisMonth)}
              sub={
                <div className={`mt-1 flex items-center gap-1 text-xs font-semibold ${growthPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {growthPositive ? <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} /> : <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />}
                  {Math.abs(kpi.viewsGrowth)}%
                </div>
              }
            />
            <KpiCard icon={<Heart className="h-4 w-4" strokeWidth={1.75} />} label={t(lang, ui.savesThisMonth)} value={String(kpi.savesThisMonth)} />
            <KpiCard icon={<Star className="h-4 w-4" strokeWidth={1.75} />} label={t(lang, ui.avgRating)} value={kpi.avgRating ? kpi.avgRating.toFixed(1) : '—'} />
            <KpiCard icon={<ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />} label={t(lang, ui.reviewCount)} value={String(kpi.reviewCount)} />
          </div>

          {completeness && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{t(lang, ui.profileCompleteness)}</span>
                <span className="text-sm font-bold text-primary-600">{completeness.percentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-primary-500" style={{ width: `${completeness.percentage}%` }} />
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">{t(lang, ui.recentReviews)}</h2>
            {recentReviews.length === 0 ? (
              <p className="text-sm text-gray-400">{t(lang, ui.noReviews)}</p>
            ) : (
              <ul className="space-y-3">
                {recentReviews.map((r) => (
                  <li key={r.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-gray-800">
                        {r.isAnonymous || !r.user ? t(lang, ui.anonymous) : r.user.name}
                      </span>
                      <StarRating rating={r.overallRating} size="sm" showValue={false} />
                    </div>
                    {r.title && <p className="text-sm font-medium text-gray-700">{r.title}</p>}
                    <p className="line-clamp-2 text-sm text-gray-500">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-6 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {t(lang, ui.managementNote)}
            <a href="https://t.me/TrustboxInc" target="_blank" rel="noopener noreferrer" className="shrink-0 font-bold underline">@TrustboxInc</a>
          </p>
        </div>
      </div>
    )
  }

  // ── So'rov kutilmoqda ──
  if (latestClaim?.status === 'PENDING') {
    return (
      <CenteredMessage
        icon={<Clock className="h-10 w-10 text-amber-400" strokeWidth={1.5} />}
        title={t(lang, ui.pendingTitle)}
        desc={t(lang, ui.pendingDesc)}
      >
        <Link href="/" className="rounded-xl border border-gray-300 px-8 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-100">
          {t(lang, ui.home)}
        </Link>
      </CenteredMessage>
    )
  }

  // ── So'rov rad etilgan ──
  if (latestClaim?.status === 'REJECTED') {
    return (
      <CenteredMessage
        icon={<AlertCircle className="h-10 w-10 text-red-400" strokeWidth={1.5} />}
        title={t(lang, ui.rejectedTitle)}
        desc={t(lang, ui.rejectedDesc)}
      >
        <div className="flex w-full max-w-xs flex-col gap-3">
          <a
            href="https://t.me/TrustboxInc" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-4 font-semibold text-white transition-colors hover:bg-sky-600"
          >
            <Send className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t(lang, ui.telegramBtn)}
          </a>
        </div>
      </CenteredMessage>
    )
  }

  // ── Hech qanday so'rov yubormagan ──
  return (
    <CenteredMessage
      icon={<Construction className="h-10 w-10 text-gray-300" strokeWidth={1.5} />}
      title={t(lang, ui.noClaimTitle)}
      desc={t(lang, ui.noClaimDesc)}
    >
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => router.push('/search')}
          className="rounded-xl bg-primary-600 py-4 font-semibold text-white transition-colors hover:bg-primary-700"
        >
          {t(lang, ui.findBtn)}
        </button>
        <a
          href="https://t.me/TrustboxInc" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-4 font-semibold text-white transition-colors hover:bg-sky-600"
        >
          <Send className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {t(lang, ui.telegramBtn)}
        </a>
        <Link href="/" className="rounded-xl border border-gray-300 py-4 font-semibold text-gray-700 transition-colors hover:bg-gray-100">
          {t(lang, ui.home)}
        </Link>
      </div>
    </CenteredMessage>
  )
}
