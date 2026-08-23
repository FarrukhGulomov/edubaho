'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Crown, Ban, Coins, Plus, Minus, RotateCcw, Users, ReceiptText,
  Wallet, AlertTriangle, X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import BrandMark from '@/components/shared/BrandMark'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

function fmtBcn(n: number) { return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} BCN` }
function fmtDate(d: string) { return new Date(d).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }) }

interface ReferralRewardRow {
  id: string
  amount: number
  status: string
  createdAt: string
  referral: { referredUser: { name: string | null; phone: string | null } }
}
interface EnrollmentRewardRow {
  id: string
  amount: number
  status: string
  createdAt: string
  claim: { institution: { nameUz: string } }
}
interface AdjustmentRow {
  id: string
  amount: number
  reason: string
  createdAt: string
  adminName: string
}
interface WithdrawalRow {
  id: string
  amount: number
  status: string
  requestedAt: string
  paymentMethod: string
}

interface BcnData {
  user: { id: string; name: string | null; phone: string | null; email: string | null }
  balance: number
  referralRewards: ReferralRewardRow[]
  enrollmentRewards: EnrollmentRewardRow[]
  adjustments: AdjustmentRow[]
  withdrawals: WithdrawalRow[]
}

export default function SuperAdminUserBcnPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [data, setData] = useState<BcnData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [toast, setToast] = useState({ msg: '', ok: true })

  // Adjust form
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustSign, setAdjustSign] = useState<'add' | 'subtract'>('add')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustError, setAdjustError] = useState('')
  const [adjustLoading, setAdjustLoading] = useState(false)

  // Reset confirm
  const [resetOpen, setResetOpen] = useState(false)
  const [resetReason, setResetReason] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => { if (!loading && !user) router.replace('/auth') }, [loading, user, router])

  function authHeaders() {
    const token = localStorage.getItem('accessToken')
    return { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1', 'Content-Type': 'application/json' }
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3500)
  }

  const fetchData = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch(`${API}/super-admin/users/${userId}/bcn`, { headers: authHeaders() })
      const json = await res.json()
      if (res.ok) setData(json.data)
      else showToast(json.error ?? 'Xatolik yuz berdi', false)
    } finally {
      setFetching(false)
    }
  }, [userId])

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userId])

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    setAdjustError('')
    const rawAmount = Number(adjustAmount)
    if (!rawAmount || rawAmount <= 0) {
      setAdjustError("Miqdorni to'g'ri kiriting")
      return
    }
    if (!adjustReason.trim()) {
      setAdjustError('Sabab kiritilishi shart')
      return
    }
    const signedAmount = adjustSign === 'add' ? rawAmount : -rawAmount
    setAdjustLoading(true)
    try {
      const res = await fetch(`${API}/super-admin/users/${userId}/bcn/adjust`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ amount: signedAmount, reason: adjustReason.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Xatolik')
      showToast(json.message)
      setAdjustOpen(false)
      setAdjustAmount('')
      setAdjustReason('')
      fetchData()
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    } finally {
      setAdjustLoading(false)
    }
  }

  async function handleReset() {
    setResetError('')
    if (!resetReason.trim()) {
      setResetError('Sabab kiritilishi shart')
      return
    }
    setResetLoading(true)
    try {
      const res = await fetch(`${API}/super-admin/users/${userId}/bcn/reset`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: resetReason.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Xatolik')
      showToast(json.message)
      setResetOpen(false)
      setResetReason('')
      fetchData()
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    } finally {
      setResetLoading(false)
    }
  }

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )

  if (user.role !== 'SUPER_ADMIN') return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4">
      <div>
        <div className="mb-4 flex justify-center">
          <Ban className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold mb-2">Ruxsat yo&apos;q</h1>
        <Link href="/" className="text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden text-sm">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold text-primary-600">
              <BrandMark size={16} className="shrink-0" /> BilimOn
            </Link>
            <span className="shrink-0 text-gray-300">›</span>
            <Link href="/admin/super/users" className="shrink-0 whitespace-nowrap text-gray-500 hover:text-gray-700">Foydalanuvchilar</Link>
            <span className="shrink-0 text-gray-300">›</span>
            <span className="truncate font-semibold text-gray-700">BilimCoin</span>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
            <Crown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> SUPER_ADMIN
          </span>
        </div>
      </header>

      {toast.msg && (
        <div className={`fixed right-4 top-20 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg ${
          toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8">
        {fetching || !data ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : (
          <>
            {/* Foydalanuvchi + balans */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6">
              <div>
                <p className="text-sm text-gray-500">Foydalanuvchi</p>
                <h1 className="text-xl font-bold text-gray-900">{data.user.name ?? '—'}</h1>
                <p className="text-sm text-gray-500">{data.user.phone}{data.user.email && ` • ${data.user.email}`}</p>
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1.5 text-sm text-gray-500">
                  <Coins className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} /> Joriy balans
                </p>
                <p className="text-3xl font-bold text-amber-700">{fmtBcn(data.balance)}</p>
              </div>
            </div>

            {/* Amallar */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => { setAdjustOpen(true); setAdjustSign('add'); setAdjustError('') }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 shrink-0" strokeWidth={2} /> Balans qo&apos;shish
              </button>
              <button
                onClick={() => { setAdjustOpen(true); setAdjustSign('subtract'); setAdjustError('') }}
                className="flex items-center gap-1.5 rounded-xl border border-orange-300 bg-white px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-50"
              >
                <Minus className="h-4 w-4 shrink-0" strokeWidth={2} /> Balansdan ayirish
              </button>
              <button
                onClick={() => { setResetOpen(true); setResetError('') }}
                disabled={data.balance === 0}
                className="flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4 shrink-0" strokeWidth={2} /> Balansni 0 ga tushirish
              </button>
            </div>

            {/* Adjust modal (inline card) */}
            {adjustOpen && (
              <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">
                    {adjustSign === 'add' ? "Balansga BilimCoin qo'shish" : 'Balansdan BilimCoin ayirish'}
                  </h2>
                  <button onClick={() => setAdjustOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
                <form onSubmit={handleAdjust} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">Miqdor (BCN)</label>
                    <input
                      type="number"
                      min={1}
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="Masalan: 50000"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">Sabab (majburiy — audit uchun)</label>
                    <textarea
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      rows={2}
                      placeholder={adjustSign === 'add' ? "Masalan: qo'lda kompensatsiya, konkurs g'olibi" : "Masalan: xato/qo'lda berilgan mablag'ni bekor qilish"}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                  {adjustError && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{adjustError}</p>}
                  <button
                    type="submit"
                    disabled={adjustLoading}
                    className={`w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                      adjustSign === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {adjustLoading ? 'Yuborilmoqda...' : adjustSign === 'add' ? "Qo'shish" : 'Ayirish'}
                  </button>
                </form>
              </div>
            )}

            {/* Reset confirm modal */}
            {resetOpen && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="mb-3 flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" strokeWidth={1.75} />
                  <div>
                    <h2 className="font-bold text-red-900">Balansni 0 ga tushirish</h2>
                    <p className="text-sm text-red-700">
                      Joriy balans ({fmtBcn(data.balance)}) butunlay 0 ga tushiriladi. Bu amalni bekor qilib bo&apos;lmaydi.
                    </p>
                  </div>
                </div>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  rows={2}
                  placeholder="Sabab (majburiy)..."
                  className="mb-2 w-full rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-red-400"
                />
                {resetError && <p className="mb-2 rounded-xl bg-white px-3.5 py-2.5 text-xs text-red-700">{resetError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    disabled={resetLoading}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {resetLoading ? 'Yuborilmoqda...' : 'Ha, 0 ga tushirish'}
                  </button>
                  <button
                    onClick={() => setResetOpen(false)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            )}

            {/* Tarix */}
            <div className="grid gap-4 md:grid-cols-2">
              <LedgerCard
                title="Qo'lda o'zgartirishlar"
                Icon={Coins}
                empty="Qo'lda o'zgartirish yo'q"
                items={data.adjustments.map((a) => ({
                  id: a.id,
                  primary: a.reason,
                  secondary: `${a.adminName} • ${fmtDate(a.createdAt)}`,
                  amount: a.amount,
                }))}
              />
              <LedgerCard
                title="Referral bonuslari"
                Icon={Users}
                empty="Referral bonusi yo'q"
                items={data.referralRewards.map((r) => ({
                  id: r.id,
                  primary: r.referral.referredUser.name ?? r.referral.referredUser.phone ?? "Noma'lum",
                  secondary: `${r.status} • ${fmtDate(r.createdAt)}`,
                  amount: r.amount,
                }))}
              />
              <LedgerCard
                title="Kurs sotib olish bonuslari"
                Icon={ReceiptText}
                empty="Enrollment bonusi yo'q"
                items={data.enrollmentRewards.map((r) => ({
                  id: r.id,
                  primary: r.claim.institution.nameUz,
                  secondary: `${r.status} • ${fmtDate(r.createdAt)}`,
                  amount: r.amount,
                }))}
              />
              <LedgerCard
                title="Yechib olish so'rovlari"
                Icon={Wallet}
                empty="Yechib olish so'rovi yo'q"
                items={data.withdrawals.map((w) => ({
                  id: w.id,
                  primary: w.paymentMethod.toUpperCase(),
                  secondary: `${w.status} • ${fmtDate(w.requestedAt)}`,
                  amount: -w.amount,
                }))}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

interface LedgerItem { id: string; primary: string; secondary: string; amount: number }

function LedgerCard({ title, Icon, items, empty }: {
  title: string
  Icon: typeof Coins
  items: LedgerItem[]
  empty: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-700">
        <Icon className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} /> {title}
      </h3>
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400">{empty}</p>
      ) : (
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-800">{it.primary}</p>
                <p className="truncate text-[11px] text-gray-400">{it.secondary}</p>
              </div>
              <span className={`shrink-0 text-xs font-bold ${it.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {it.amount >= 0 ? '+' : ''}{it.amount.toLocaleString('ru-RU').replace(/,/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
