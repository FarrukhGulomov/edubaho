'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Gift, Users, Wallet, TrendingUp, Clock, CheckCircle2, XCircle,
  Search, RefreshCw, Check, X, Banknote,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import BrandMark from '@/components/shared/BrandMark'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface ReferralRow {
  id: string
  referralCode: string
  status: 'PENDING' | 'QUALIFIED' | 'REJECTED'
  createdAt: string
  qualifiedAt: string | null
  referrer: { id: string; name: string | null; phone: string | null }
  referredUser: { id: string; name: string | null; phone: string | null }
  reward: { amount: number; status: string } | null
}

interface WithdrawalRow {
  id: string
  amount: number
  paymentMethod: string
  paymentDetails: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
  requestedAt: string
  processedAt: string | null
  rejectionReason: string | null
  user: { id: string; name: string | null; phone: string | null }
}

interface Stats {
  totalReferrals: number
  activeReferrals: number
  pendingReferrals: number
  rejectedReferrals: number
  totalRewardsIssued: number
  totalWithdrawn: number
  pendingWithdrawalsAmount: number
  pendingWithdrawalsCount: number
  activeReferrersCount: number
}

function fmtUzs(n: number) { return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm` }
function fmtDate(d: string) { return new Date(d).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }) }
function userLabel(u: { name: string | null; phone: string | null }) { return u.name ?? u.phone ?? "Noma'lum" }

const REFERRAL_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800', QUALIFIED: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-gray-100 text-gray-600',
}
const WITHDRAWAL_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-sky-100 text-sky-800',
  REJECTED: 'bg-red-100 text-red-700', PAID: 'bg-emerald-100 text-emerald-800',
}

export default function AdminReferralsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => { if (!loading && !user) router.replace('/auth') }, [loading, user, router])

  const [tab, setTab] = useState<'referrals' | 'withdrawals'>('withdrawals')
  const [stats, setStats] = useState<Stats | null>(null)
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([])
  const [fetching, setFetching] = useState(false)
  const [q, setQ] = useState('')
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('PENDING')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState('')

  function authHeaders() {
    const token = localStorage.getItem('accessToken')
    return { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' }
  }

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/admin/referrals/statistics`, { headers: authHeaders() })
    if (res.ok) setStats((await res.json()).data)
  }, [])

  const fetchReferrals = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50' })
    if (q) params.set('q', q)
    const res = await fetch(`${API}/admin/referrals?${params}`, { headers: authHeaders() })
    if (res.ok) setReferrals((await res.json()).data ?? [])
  }, [q])

  const fetchWithdrawals = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50' })
    if (withdrawalStatusFilter) params.set('status', withdrawalStatusFilter)
    if (q) params.set('q', q)
    const res = await fetch(`${API}/admin/referral-withdrawals?${params}`, { headers: authHeaders() })
    if (res.ok) setWithdrawals((await res.json()).data ?? [])
  }, [withdrawalStatusFilter, q])

  const refreshAll = useCallback(async () => {
    setFetching(true)
    await Promise.all([fetchStats(), fetchReferrals(), fetchWithdrawals()])
    setFetching(false)
  }, [fetchStats, fetchReferrals, fetchWithdrawals])

  useEffect(() => { if (user) refreshAll() }, [user, refreshAll])

  async function handleAction(id: string, action: 'approve' | 'reject' | 'pay', reason?: string) {
    setActionError('')
    try {
      const res = await fetch(`${API}/admin/referral-withdrawals/${id}/${action}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ reason }) : undefined,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Xatolik')
      setRejectingId(null)
      setRejectReason('')
      refreshAll()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    }
  }

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden text-sm">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold text-primary-600">
              <BrandMark size={16} className="shrink-0" /> BilimOn
            </Link>
            <span className="shrink-0 text-gray-300">›</span>
            <Link href="/admin" className="shrink-0 whitespace-nowrap text-gray-500 hover:text-gray-700">Admin</Link>
            <span className="shrink-0 text-gray-300">›</span>
            <span className="truncate font-semibold text-gray-700">Referral & Rewards</span>
          </div>
          <button onClick={refreshAll} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 shrink-0 ${fetching ? 'animate-spin' : ''}`} strokeWidth={1.75} /> Yangilash
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Gift className="h-6 w-6 shrink-0 text-amber-600" strokeWidth={1.75} /> Referral & Rewards
        </h1>

        {/* Statistika */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile Icon={Users} label="Jami referal" value={stats.totalReferrals} accent="text-primary-600 bg-primary-50" />
            <StatTile Icon={CheckCircle2} label="Aktiv" value={stats.activeReferrals} accent="text-emerald-600 bg-emerald-50" />
            <StatTile Icon={TrendingUp} label="Berilgan mukofot" value={fmtUzs(stats.totalRewardsIssued)} accent="text-amber-600 bg-amber-50" />
            <StatTile Icon={Wallet} label="Kutayotgan so'rovlar" value={`${stats.pendingWithdrawalsCount} (${fmtUzs(stats.pendingWithdrawalsAmount)})`} accent="text-rose-600 bg-rose-50" urgent={stats.pendingWithdrawalsCount > 0} />
          </div>
        )}

        {/* Tab */}
        <div className="mb-4 flex gap-1 rounded-2xl bg-gray-100 p-1 max-w-md">
          {[
            { key: 'withdrawals' as const, label: "Yechib olish so'rovlari" },
            { key: 'referrals' as const, label: 'Referallar' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Qidiruv */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
          <input
            type="text" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Ism yoki telefon bo'yicha qidirish..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {tab === 'withdrawals' && (
            <select
              value={withdrawalStatusFilter}
              onChange={(e) => setWithdrawalStatusFilter(e.target.value)}
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600"
            >
              <option value="">Barchasi</option>
              <option value="PENDING">Kutilmoqda</option>
              <option value="APPROVED">Tasdiqlangan</option>
              <option value="PAID">To'langan</option>
              <option value="REJECTED">Rad etilgan</option>
            </select>
          )}
        </div>

        {actionError && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">{actionError}</p>
        )}

        {/* Yechib olish so'rovlari */}
        {tab === 'withdrawals' && (
          <div className="space-y-2.5">
            {withdrawals.length === 0 && (
              <p className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-gray-400">
                So'rovlar topilmadi
              </p>
            )}
            {withdrawals.map((w) => (
              <div key={w.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{userLabel(w.user)}</p>
                    <p className="text-sm text-gray-500">{w.user.phone}</p>
                    <p className="mt-1 text-lg font-bold text-primary-700">{fmtUzs(w.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {w.paymentMethod.toUpperCase()} • {w.paymentDetails}
                    </p>
                    <p className="text-xs text-gray-400">{fmtDate(w.requestedAt)}</p>
                    {w.rejectionReason && <p className="mt-1 text-xs font-semibold text-red-600">Sabab: {w.rejectionReason}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${WITHDRAWAL_STATUS_STYLE[w.status]}`}>
                      {w.status}
                    </span>
                  </div>
                </div>

                {w.status === 'PENDING' && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    <button onClick={() => handleAction(w.id, 'approve')} className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-700">
                      <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Tasdiqlash
                    </button>
                    {rejectingId === w.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Rad etish sababi..." autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs"
                        />
                        <button onClick={() => handleAction(w.id, 'reject', rejectReason)} className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700">
                          Tasdiqlash
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setRejectingId(w.id); setRejectReason('') }} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">
                        <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Rad etish
                      </button>
                    )}
                  </div>
                )}
                {w.status === 'APPROVED' && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <button onClick={() => handleAction(w.id, 'pay')} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                      <Banknote className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> To'landi deb belgilash
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Referallar */}
        {tab === 'referrals' && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Taklif qiluvchi</th>
                  <th className="px-4 py-3">Taklif qilingan</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3">Mukofot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referrals.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Referallar topilmadi</td></tr>
                )}
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{userLabel(r.referrer)}</td>
                    <td className="px-4 py-3 text-gray-600">{userLabel(r.referredUser)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${REFERRAL_STATUS_STYLE[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      {r.reward ? `+${fmtUzs(r.reward.amount)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function StatTile({ Icon, label, value, accent, urgent }: {
  Icon: typeof Users; label: string; value: string | number; accent: string; urgent?: boolean
}) {
  return (
    <div className={`relative rounded-2xl border p-4 ${urgent ? 'border-rose-200 bg-rose-50/50' : 'border-gray-200 bg-white'}`}>
      <span className={`icon-chip mb-2 ${accent}`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      {urgent && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500" />}
    </div>
  )
}
