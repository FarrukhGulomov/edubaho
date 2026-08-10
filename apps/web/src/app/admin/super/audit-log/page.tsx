'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { GraduationCap, Crown, Ban, ScrollText, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface AuditLogEntry {
  id: string
  adminId: string | null
  adminName: string
  adminRole: string
  action: string
  entityType: string
  entityId: string | null
  entityLabel: string | null
  before: unknown
  after: unknown
  ip: string | null
  createdAt: string
}

// Backendda ishlatilgan `action` qiymatlariga mos O'zbekcha izohlar
const ACTION_LABELS: Record<string, string> = {
  'institution.create':        'Muassasa yaratildi',
  'institution.update':        'Muassasa tahrirlandi',
  'institution.delete':        "Muassasa o'chirildi",
  'institution.status_change': "Muassasa statusi o'zgartirildi",
  'institution.verify_toggle': 'Muassasa tasdig\'i o\'zgartirildi',
  'review.approve':            'Sharh tasdiqlandi',
  'review.reject':             'Sharh rad etildi',
  'review.verify_outcome':     "Sharh natijasi tasdiqlandi/bekor qilindi",
  'claim.approve':             "Egalik so'rovi tasdiqlandi",
  'claim.reject':              "Egalik so'rovi rad etildi",
  'user.activate':             'Foydalanuvchi aktivlashtirildi',
  'user.deactivate':           'Foydalanuvchi deaktivlashtirildi',
  'user.delete':                "Foydalanuvchi o'chirildi",
  'admin.create':              'Yangi admin tayinlandi',
  'admin.permissions_update':  'Admin ruxsatlari yangilandi',
  'admin.revoke':               'Admin huquqi olib tashlandi',
  'lead.status_update':        "Lid holati o'zgartirildi",
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AuditLogPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [logs, setLogs]     = useState<AuditLogEntry[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [meta, setMeta]     = useState({ total: 0, page: 1, totalPages: 1 })
  const [fetching, setFetching] = useState(true)
  const [q, setQ]           = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage]     = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [loading, user, router])

  const fetchLogs = useCallback(async (search: string, action: string, pg: number) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setFetching(true)
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '30' })
      if (search.trim()) params.set('q', search.trim())
      if (action) params.set('action', action)

      const res = await fetch(`${API}/super-admin/audit-log?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      const data = await res.json()
      setLogs(data.data ?? [])
      setActions(data.facets?.actions ?? [])
      setMeta({
        total:      data.meta?.total ?? 0,
        page:       data.meta?.page ?? 1,
        totalPages: data.meta?.totalPages ?? 1,
      })
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') fetchLogs(q, actionFilter, page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchLogs(q, actionFilter, 1)
  }

  function handleActionFilter(action: string) {
    setActionFilter(action)
    setPage(1)
    fetchLogs(q, action, 1)
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden text-sm">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold text-primary-600">
              <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={1.75} /> EDULA
            </Link>
            <span className="shrink-0 text-gray-300">›</span>
            <Link href="/admin" className="shrink-0 whitespace-nowrap text-gray-500 hover:text-gray-700">Admin</Link>
            <span className="shrink-0 text-gray-300">›</span>
            <Link href="/admin/super" className="shrink-0 whitespace-nowrap text-gray-500 hover:text-gray-700">Super Admin</Link>
            <span className="shrink-0 text-gray-300">›</span>
            <span className="truncate font-semibold text-gray-700">Audit jurnali</span>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
            <Crown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> SUPER_ADMIN
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ScrollText className="h-6 w-6 shrink-0 text-slate-600" strokeWidth={1.75} /> Audit jurnali
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Adminlarning barcha o&apos;zgartiruvchi amallari — kim, qachon, nima ustida. Jami: <strong>{meta.total.toLocaleString()}</strong> ta
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-2">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-slate-400">
            <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Admin ismi, obyekt nomi yoki ID..."
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="relative">
            <select
              value={actionFilter}
              onChange={e => handleActionFilter(e.target.value)}
              className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-gray-700 outline-none focus:border-slate-400"
            >
              <option value="">Barcha amallar</option>
              {actions.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
          </div>
          <button
            type="submit"
            className="whitespace-nowrap rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Qidirish
          </button>
        </form>

        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <div className="mb-3 flex justify-center">
              <ScrollText className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-gray-500">Yozuvlar topilmadi</p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="divide-y divide-gray-100">
                {logs.map(log => {
                  const isOpen = expandedId === log.id
                  const hasDetails = log.before != null || log.after != null
                  return (
                    <div key={log.id}>
                      <button
                        onClick={() => hasDetails && setExpandedId(isOpen ? null : log.id)}
                        className={`flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <span className="w-40 shrink-0 whitespace-nowrap text-xs text-gray-400">{fmt(log.createdAt)}</span>
                        <span className="flex min-w-[140px] shrink-0 items-center gap-1.5">
                          <span className="font-semibold text-gray-800">{log.adminName}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[log.adminRole] ?? 'bg-gray-100 text-gray-600'}`}>
                            {log.adminRole}
                          </span>
                        </span>
                        <span className="min-w-[180px] flex-1 text-sm font-medium text-gray-700">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                        <span className="whitespace-nowrap text-xs text-gray-400">
                          {log.entityType}{log.entityLabel ? `: ${log.entityLabel}` : log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}
                        </span>
                        {hasDetails && (
                          isOpen
                            ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                            : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                        )}
                      </button>
                      {isOpen && hasDetails && (
                        <div className="grid gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:grid-cols-2">
                          {log.before != null && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Oldin</p>
                              <pre className="overflow-x-auto rounded-lg bg-white p-2.5 text-xs text-gray-600 border border-gray-200">{JSON.stringify(log.before, null, 2)}</pre>
                            </div>
                          )}
                          {log.after != null && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Keyin</p>
                              <pre className="overflow-x-auto rounded-lg bg-white p-2.5 text-xs text-gray-600 border border-gray-200">{JSON.stringify(log.after, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Sahifa {meta.page} / {meta.totalPages} — {meta.total.toLocaleString()} ta jami
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => { const p = page - 1; setPage(p); fetchLogs(q, actionFilter, p) }}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    ← Oldingi
                  </button>
                  <button
                    disabled={page >= meta.totalPages}
                    onClick={() => { const p = page + 1; setPage(p); fetchLogs(q, actionFilter, p) }}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    Keyingi →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
