'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Gift, Copy, Send, Share2, CheckCircle2, Users, Wallet, TrendingUp,
  Clock, XCircle, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useLang, t } from '@/contexts/LangContext'
import { referralsApi, type ReferralStats, type ReferralHistoryItem, type ReferralWithdrawalItem } from '@/lib/api'

const PAYMENT_METHODS = [
  { value: 'payme',  uz: 'Payme',  ru: 'Payme' },
  { value: 'click',  uz: 'Click',  ru: 'Click' },
  { value: 'uzcard', uz: 'Uzcard', ru: 'Uzcard' },
  { value: 'humo',   uz: 'Humo',   ru: 'Humo' },
]

function fmtUzs(n: number): string {
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
}

const STATUS_STYLE: Record<string, { bg: string; Icon: typeof Clock; label: { uz: string; ru: string } }> = {
  PENDING:   { bg: 'bg-amber-50 text-amber-700',   Icon: Clock,        label: { uz: 'Kutilmoqda', ru: 'Ожидание' } },
  QUALIFIED: { bg: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2, label: { uz: 'Aktiv', ru: 'Активен' } },
  REJECTED:  { bg: 'bg-gray-100 text-gray-500',    Icon: XCircle,      label: { uz: 'Rad etilgan', ru: 'Отклонён' } },
  APPROVED:  { bg: 'bg-sky-50 text-sky-700',       Icon: CheckCircle2, label: { uz: 'Tasdiqlangan', ru: 'Одобрено' } },
  PAID:      { bg: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2, label: { uz: "To'langan", ru: 'Оплачено' } },
}

export default function ReferralDashboard({ token }: { token: string }) {
  const { lang } = useLang()
  const uz = lang === 'uz'

  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [history, setHistory] = useState<ReferralHistoryItem[]>([])
  const [withdrawals, setWithdrawals] = useState<ReferralWithdrawalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [wdAmount, setWdAmount] = useState('')
  const [wdMethod, setWdMethod] = useState('payme')
  const [wdDetails, setWdDetails] = useState('')
  const [wdError, setWdError] = useState('')
  const [wdSuccess, setWdSuccess] = useState('')
  const [wdLoading, setWdLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      referralsApi.me(token),
      referralsApi.history(token),
      referralsApi.withdrawals(token),
    ])
      .then(([m, h, w]) => {
        setStats(m.data)
        setHistory(h.data)
        setWithdrawals(w.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const referralLink = stats
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth?ref=${stats.referralCode}`
    : ''

  function handleCopyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleCopyCode() {
    if (stats) navigator.clipboard.writeText(stats.referralCode)
  }

  function shareMessage(): string {
    return uz
      ? `🎓 O'zingga mos o'quv markazini top!\n\nMen foydalanayotgan platformada o'quv markazlarini solishtirib, o'zingga mosini topish mumkin.\n\n👉 Kirib ko'r:\n${referralLink}`
      : `🎓 Найди подходящий тебе учебный центр!\n\nНа платформе, которой я пользуюсь, можно сравнивать учебные центры и находить подходящий именно тебе.\n\n👉 Загляни:\n${referralLink}`
  }

  function handleTelegramShare() {
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage().replace(referralLink, '').trim())}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleGenericShare() {
    if (navigator.share) {
      navigator.share({ text: shareMessage() }).catch(() => {})
    } else {
      handleCopyLink()
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault()
    setWdError('')
    setWdSuccess('')
    const amount = Number(wdAmount)
    if (!amount || amount <= 0) {
      setWdError(uz ? "Summani kiriting" : 'Введите сумму')
      return
    }
    if (!wdDetails.trim()) {
      setWdError(uz ? "To'lov ma'lumotlarini kiriting (karta raqami yoki telefon)" : 'Введите платёжные данные')
      return
    }
    setWdLoading(true)
    try {
      await referralsApi.withdraw(token, { amount, paymentMethod: wdMethod, paymentDetails: wdDetails.trim() })
      setWdSuccess(uz ? "So'rov yuborildi! Admin ko'rib chiqadi." : 'Запрос отправлен! Админ рассмотрит.')
      setWdAmount('')
      setWdDetails('')
      setShowWithdrawForm(false)
      load()
    } catch (err: unknown) {
      setWdError(err instanceof Error ? err.message : (uz ? 'Xatolik yuz berdi' : 'Произошла ошибка'))
    } finally {
      setWdLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600" />
      </div>
    )
  }
  if (!stats) return null

  return (
    <div className="space-y-4">
      {/* Sarlavha */}
      <div className="flex items-center gap-3">
        <span className="icon-chip h-11 w-11 bg-amber-50 text-amber-600">
          <Gift className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {uz ? "Do'stlarni taklif qiling va bonus oling" : 'Приглашайте друзей и получайте бонус'}
          </h2>
          <p className="text-sm text-gray-500">
            {uz
              ? `Har bir aktiv do'st uchun ${fmtUzs(stats.referralReward)} bonus oling`
              : `Получайте ${fmtUzs(stats.referralReward)} за каждого активного друга`}
          </p>
        </div>
      </div>

      {/* Balans + progress */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {uz ? 'Mavjud balans' : 'Доступный баланс'}
            </p>
            <p className="text-3xl font-bold text-gray-900">{fmtUzs(stats.availableBalance)}</p>
          </div>
          <p className="text-sm font-semibold text-gray-400">
            {fmtUzs(stats.availableBalance)} / {fmtUzs(stats.minWithdrawal)}
          </p>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>

        <p className="mt-2.5 text-sm text-amber-800">
          {stats.canWithdraw
            ? (uz ? "🎉 Yechib olishga tayyor!" : '🎉 Готово к выводу!')
            : uz
              ? `${fmtUzs(stats.minWithdrawal)} yig'ish uchun: yana ${fmtUzs(stats.remainingAmount)} yoki ${stats.remainingActiveReferrals} ta aktiv do'st kerak`
              : `Чтобы собрать ${fmtUzs(stats.minWithdrawal)}: ещё ${fmtUzs(stats.remainingAmount)} или ${stats.remainingActiveReferrals} активных друзей`}
        </p>

        <button
          onClick={() => setShowWithdrawForm((v) => !v)}
          disabled={!stats.canWithdraw}
          className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uz ? 'Bonusni yechib olish' : 'Вывести бонус'}
        </button>

        {!stats.canWithdraw && (
          <p className="mt-1.5 text-center text-xs text-gray-400">
            {uz ? `Minimal yechib olish summasi — ${fmtUzs(stats.minWithdrawal)}` : `Минимальная сумма вывода — ${fmtUzs(stats.minWithdrawal)}`}
          </p>
        )}

        {showWithdrawForm && stats.canWithdraw && (
          <form onSubmit={handleWithdraw} className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-white p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">{uz ? 'Summa' : 'Сумма'}</label>
              <input
                type="number" min={stats.minWithdrawal} max={stats.availableBalance}
                value={wdAmount} onChange={(e) => setWdAmount(e.target.value)}
                placeholder={String(stats.availableBalance)}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">{uz ? "To'lov usuli" : 'Способ оплаты'}</label>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value} type="button" onClick={() => setWdMethod(m.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      wdMethod === m.value ? 'border-primary-500 bg-primary-600 text-white' : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {uz ? m.uz : m.ru}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                {uz ? "Karta raqami yoki telefon" : 'Номер карты или телефон'}
              </label>
              <input
                type="text" value={wdDetails} onChange={(e) => setWdDetails(e.target.value)}
                placeholder="8600 1234 5678 9012" className="input"
              />
            </div>
            {wdError && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {wdError}
              </p>
            )}
            <button type="submit" disabled={wdLoading} className="btn-primary w-full text-sm disabled:opacity-50">
              {wdLoading ? (uz ? 'Yuborilmoqda...' : 'Отправка...') : (uz ? "So'rov yuborish" : 'Отправить запрос')}
            </button>
          </form>
        )}

        {wdSuccess && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} /> {wdSuccess}
          </p>
        )}
      </div>

      {/* Statistika grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { Icon: TrendingUp, value: fmtUzs(stats.totalEarned), label: { uz: 'Jami ishlangan', ru: 'Всего заработано' } },
          { Icon: Wallet,     value: fmtUzs(stats.totalWithdrawn), label: { uz: 'Yechib olingan', ru: 'Выведено' } },
          { Icon: Users,      value: String(stats.totalReferrals), label: { uz: 'Jami do\'stlar', ru: 'Всего друзей' } },
          { Icon: CheckCircle2, value: String(stats.activeReferrals), label: { uz: 'Aktiv do\'stlar', ru: 'Активных друзей' } },
        ].map((s) => (
          <div key={s.label.uz} className="card flex items-center gap-3 p-4">
            <span className="icon-chip shrink-0">
              <s.Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-gray-900">{s.value}</p>
              <p className="truncate text-xs text-gray-500">{uz ? s.label.uz : s.label.ru}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Referral havolasi */}
      <div className="card p-5">
        <p className="mb-2.5 text-sm font-bold text-gray-800">
          {uz ? 'Sizning referral havolangiz' : 'Ваша реферальная ссылка'}
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
          <span className="min-w-0 flex-1 truncate text-sm text-gray-600">{referralLink}</span>
          <button onClick={handleCopyLink} className="shrink-0 text-xs font-bold text-primary-600 hover:underline">
            {copied ? (uz ? 'Nusxalandi!' : 'Скопировано!') : (uz ? 'Nusxalash' : 'Копировать')}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={handleTelegramShare} className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600">
            <Send className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Telegram
          </button>
          <button onClick={handleGenericShare} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
            <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {uz ? 'Ulashish' : 'Поделиться'}
          </button>
          <button onClick={handleCopyCode} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
            <Copy className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {uz ? 'Kodni nusxalash' : 'Копировать код'} ({stats.referralCode})
          </button>
        </div>
      </div>

      {/* Mening referallarim */}
      <div className="card p-5">
        <button onClick={() => setShowHistory((v) => !v)} className="flex w-full items-center justify-between">
          <p className="text-sm font-bold text-gray-800">{uz ? 'Mening referallarim' : 'Мои рефералы'}</p>
          {showHistory ? <ChevronUp className="h-4 w-4 text-gray-400" strokeWidth={2} /> : <ChevronDown className="h-4 w-4 text-gray-400" strokeWidth={2} />}
        </button>

        {showHistory && (
          <div className="mt-3 space-y-2">
            {history.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">
                {uz ? "Hali hech kimni taklif qilmagansiz" : 'Вы ещё никого не пригласили'}
              </p>
            )}
            {history.map((h) => {
              const st = STATUS_STYLE[h.status]
              return (
                <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">{h.referredUserLabel}</p>
                    <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString(uz ? 'uz-UZ' : 'ru-RU')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {h.rewardAmount > 0 && (
                      <span className="text-sm font-bold text-emerald-600">+{fmtUzs(h.rewardAmount)}</span>
                    )}
                    <span className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${st?.bg ?? 'bg-gray-100 text-gray-500'}`}>
                      {st ? t(lang, st.label) : h.status}
                    </span>
                  </div>
                </div>
              )
            })}

            {withdrawals.length > 0 && (
              <>
                <p className="pt-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                  {uz ? "Yechib olish so'rovlari" : 'Запросы на вывод'}
                </p>
                {withdrawals.map((w) => {
                  const st = STATUS_STYLE[w.status]
                  return (
                    <div key={w.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{fmtUzs(w.amount)}</p>
                        <p className="text-xs text-gray-400">{new Date(w.requestedAt).toLocaleDateString(uz ? 'uz-UZ' : 'ru-RU')}</p>
                        {w.rejectionReason && <p className="text-xs text-red-500">{w.rejectionReason}</p>}
                      </div>
                      <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${st?.bg ?? 'bg-gray-100 text-gray-500'}`}>
                        {st ? t(lang, st.label) : w.status}
                      </span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
