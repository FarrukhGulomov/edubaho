'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ReceiptText, Search, RefreshCw, Check, X, Building2, ImageIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface ClaimRow {
  id: string
  courseNote: string | null
  receiptUrl: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
  user: { id: string; name: string | null; phone: string | null; telegramUsername: string | null }
  institution: { id: string; nameUz: string; slug: string }
  reward: { amount: number; status: string } | null
}

interface SummaryRow {
  institution: { id: string; nameUz: string; slug: string; phone: string | null } | null
  approvedCount: number
}

function fmtDate(d: string) { return new Date(d).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }) }
function userLabel(u: { name: string | null; phone: string | null }) { return u.name ?? u.phone ?? "Noma'lum" }

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-gray-100 text-gray-600',
}

export default function AdminEnrollmentClaimsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => { if (!loading && !user) router.replace('/auth') }, [loading, user, router])

  const [tab, setTab] = useState<'claims' | 'summary'>('claims')
  const [claims, setClaims] = useState<ClaimRow[]>([])
  const [summary, setSummary] = useState<SummaryRow[]>([])
  const [fetching, setFetching] = useState(false)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState('')

  function authHeaders() {
    const token = localStorage.getItem('accessToken')
    return { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' }
  }

  const fetchClaims = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50' })
    if (statusFilter) params.set('status', statusFilter)
    if (q) params.set('q', q)
    const res = await fetch(`${API}/admin/enrollment-claims?${params}`, { headers: authHeaders() })
    if (res.ok) setClaims((await res.json()).data ?? [])
  }, [statusFilter, q])

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`${API}/admin/enrollment-claims/summary`, { headers: authHeaders() })
    if (res.ok) setSummary((await res.json()).data ?? [])
  }, [])

  const refreshAll = useCallback(async () => {
    setFetching(true)
    await Promise.all([fetchClaims(), fetchSummary()])
    setFetching(false)
  }, [fetchClaims, fetchSummary])

  useEffect(() => { if (user) refreshAll() }, [user, refreshAll])

  async function handleAction(id: string, action: 'approve' | 'reject', reason?: string) {
    setActionError('')
    try {
      const res = await fetch(`${API}/admin/enrollment-claims/${id}/${action}`, {
        method: 'POST',
        // Content-Type faqat body bor so'rovlarda qo'yiladi — aks holda Fastify
        // FST_ERR_CTP_EMPTY_JSON_BODY xatosini beradi (masalan "approve"da body yo'q)
        headers: action === 'reject' ? { ...authHeaders(), 'Content-Type': 'application/json' } : authHeaders(),
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

  const pendingCount = claims.filter((c) => c.status === 'PENDING').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <AdminBreadcrumb items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Kurs sotib olish xabarlari' },
          ]} />
          <button onClick={refreshAll} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 shrink-0 ${fetching ? 'animate-spin' : ''}`} strokeWidth={1.75} /> Yangilash
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ReceiptText className="h-6 w-6 shrink-0 text-emerald-600" strokeWidth={1.75} /> Kurs sotib olish xabarlari
        </h1>
        <p className="mb-6 max-w-2xl text-sm text-gray-500">
          Foydalanuvchi o&apos;zi &quot;kurs sotib oldim&quot; deb bildirgan xabarlar. Tasdiqlangan (APPROVED) xabar
          uchun foydalanuvchiga bonus beriladi VA shu son markazga hisob-kitob qilishda ishlatiladi —
          markazning o&apos;z hisoboti emas, balki shu tasdiqlangan sonlar asosiy manba.
        </p>

        {/* Tab */}
        <div className="mb-4 flex max-w-md gap-1 rounded-2xl bg-gray-100 p-1">
          {[
            { key: 'claims' as const, label: `Xabarlar${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { key: 'summary' as const, label: 'Muassasalar bo\'yicha' },
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

        {actionError && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">{actionError}</p>
        )}

        {tab === 'claims' && (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
              <input
                type="text" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Ism yoki telefon bo'yicha qidirish..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600"
              >
                <option value="">Barchasi</option>
                <option value="PENDING">Kutilmoqda</option>
                <option value="APPROVED">Tasdiqlangan</option>
                <option value="REJECTED">Rad etilgan</option>
              </select>
            </div>

            <div className="space-y-2.5">
              {claims.length === 0 && (
                <p className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-gray-400">
                  Xabarlar topilmadi
                </p>
              )}
              {claims.map((c) => (
                <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{userLabel(c.user)}</p>
                      <p className="text-sm text-gray-500">{c.user.phone}{c.user.telegramUsername && ` • @${c.user.telegramUsername}`}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-primary-700">
                        <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {c.institution.nameUz}
                      </p>
                      {c.courseNote && <p className="mt-0.5 text-sm text-gray-600">{c.courseNote}</p>}
                      {c.receiptUrl && (
                        <a href={c.receiptUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline">
                          <ImageIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Chek/skrinshotni ko&apos;rish
                        </a>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{fmtDate(c.createdAt)}</p>
                      {c.reviewNote && <p className="mt-1 text-xs font-semibold text-red-600">Sabab: {c.reviewNote}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[c.status]}`}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  {c.status === 'PENDING' && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                      <button onClick={() => handleAction(c.id, 'approve')} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                        <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Tasdiqlash
                      </button>
                      {rejectingId === c.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rad etish sababi..." autoFocus
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs"
                          />
                          <button onClick={() => handleAction(c.id, 'reject', rejectReason)} className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700">
                            Tasdiqlash
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setRejectingId(c.id); setRejectReason('') }} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">
                          <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Rad etish
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'summary' && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Muassasa</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Tasdiqlangan enrollmentlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">Hali tasdiqlangan enrollment yo&apos;q</td></tr>
                )}
                {summary.map((s) => s.institution && (
                  <tr key={s.institution.id}>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <Link href={`/institutions/${s.institution.slug}`} target="_blank" className="hover:text-primary-600 hover:underline">
                        {s.institution.nameUz}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.institution.phone ?? '—'}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{s.approvedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">
              Narx (masalan $7-8) har bir muassasa bilan alohida kelishiladi — bu yerda faqat tasdiqlangan
              (haqiqiy foydalanuvchidan kelgan) son ko&apos;rsatiladi, hisob-kitob shu songa asoslanadi.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
