'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import type React from 'react'
import {
  Search, RefreshCw, Plus, Eye, Edit2, CheckCircle2, Trash2, X,
  ChevronRight, AlertCircle, Star, Eye as EyeIcon, ChevronDown,
} from 'lucide-react'
import TypeIcon from '@/components/shared/TypeIcon'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface Institution {
  id: string
  nameUz: string
  nameRu?: string
  slug: string
  type: string
  status: string
  isVerified: boolean
  avgRating?: number
  reviewCount: number
  viewCount: number
  phone?: string
  telegram?: string
  createdAt: string
  city?: { nameUz: string }
}

const STATUS_CLS: Record<string, string> = {
  PENDING:   'bg-amber-50  text-amber-700  dark:bg-amber-500/10  dark:text-amber-400',
  ACTIVE:    'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400',
  PREMIUM:   'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  SUSPENDED: 'bg-red-50    text-red-700    dark:bg-red-500/10    dark:text-red-400',
  INACTIVE:  'bg-surface-2 text-mute',
}

const ALL_STATUSES = ['PENDING', 'ACTIVE', 'PREMIUM', 'SUSPENDED', 'INACTIVE'] as const

export default function AdminInstitutionsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [loading, user, router])

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [fetching, setFetching] = useState(false)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState({ msg: '', ok: true })
  const [confirmDelete, setConfirmDelete] = useState<Institution | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3500)
  }

  const fetchList = useCallback(async (search = q, status = statusFilter, page = 1) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setFetching(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('q', search)
      if (status) params.set('status', status)
      const res = await fetch(`${API}/admin/institutions?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      if (!res.ok) return
      const data = await res.json()
      setInstitutions(data.data ?? [])
      setMeta(data.meta ?? { total: 0, page: 1, totalPages: 1 })
    } finally {
      setFetching(false)
    }
  }, [q, statusFilter])

  useEffect(() => { if (user) fetchList() }, [user, fetchList])

  async function handleStatusChange(id: string, status: string) {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setActionId(id)
    try {
      const res = await fetch(`${API}/admin/institutions/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setInstitutions((prev) => prev.map((i) => i.id === id ? { ...i, status } : i))
        showToast(`Status: ${status}`)
      }
    } finally { setActionId(null) }
  }

  async function handleVerify(id: string) {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setActionId(id)
    try {
      const res = await fetch(`${API}/admin/institutions/${id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      if (res.ok) {
        const data = await res.json()
        setInstitutions((prev) => prev.map((i) => i.id === id ? { ...i, isVerified: data.isVerified } : i))
        showToast(data.isVerified ? 'Tasdiqlandi' : 'Tasdiq bekor qilindi')
      }
    } finally { setActionId(null) }
  }

  async function handleDelete(inst: Institution) {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setActionId(inst.id)
    setConfirmDelete(null)
    try {
      const res = await fetch(`${API}/admin/institutions/${inst.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      if (res.ok) {
        setInstitutions((prev) => prev.filter((i) => i.id !== inst.id))
        setMeta((m) => ({ ...m, total: m.total - 1 }))
        showToast(`"${inst.nameUz}" o'chirildi`)
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string }
        showToast(err.error ?? "O'chirishda xatolik", false)
      }
    } finally { setActionId(null) }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchList(q, statusFilter)
  }

  if (loading || !user) return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
    </div>
  )

  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR' && user.role !== 'SUPER_ADMIN') return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas text-center">
      <div>
        <X className="mx-auto mb-3 h-10 w-10 text-faint" aria-hidden />
        <h1 className="text-base font-bold text-ink">Ruxsat yo'q</h1>
        <Link href="/" className="mt-2 inline-block text-sm text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-semibold text-primary-600 hover:text-primary-700">EDUBAHO</Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <Link href="/admin" className="text-mute hover:text-ink">Admin</Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <span className="font-semibold text-ink">Muassasalar</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="btn-ghost btn-sm">Orqaga</Link>
            <Link href="/admin/reviews" className="btn-secondary btn-sm">Sharhlar</Link>
            <Link href="/admin/institutions/new" className="btn-primary btn-sm">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Yangi
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Toast */}
        {toast.msg && (
          <div role="status" className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            toast.ok
              ? 'border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-500/25 dark:bg-accent-500/10 dark:text-accent-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {toast.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> : <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />}
            {toast.msg}
          </div>
        )}

        {/* Search + filters */}
        <div className="mb-5 flex flex-wrap gap-2">
          <form onSubmit={handleSearch} className="flex min-w-64 flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nomi yoki slug bo'yicha..."
                className="input pl-9"
              />
            </div>
            <button type="submit" className="btn-primary btn-sm px-4">
              <Search className="h-3.5 w-3.5" aria-hidden />
              Qidirish
            </button>
          </form>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchList(q, e.target.value) }}
              className="h-full appearance-none rounded-xl border border-line bg-surface py-2 pl-3 pr-8 text-sm font-medium text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
            >
              <option value="">Barcha statuslar</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
          </div>
          <button
            onClick={() => fetchList(q, statusFilter)}
            disabled={fetching}
            className="btn-ghost btn-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fetching ? 'animate-spin' : ''}`} aria-hidden />
          </button>
        </div>

        <p className="mb-4 text-xs text-faint">
          Jami: <strong className="tabular-nums text-mute">{meta.total}</strong> ta muassasa
          {statusFilter && <span className="ml-2 text-primary-600 dark:text-primary-400">({statusFilter})</span>}
        </p>

        {/* List */}
        {fetching ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
          </div>
        ) : institutions.length === 0 ? (
          <div className="py-16 text-center">
            <TypeIcon type="SCHOOL" className="mx-auto mb-3 h-10 w-10 text-faint" />
            <p className="text-sm font-semibold text-ink">Muassasa topilmadi</p>
            <Link href="/admin/institutions/new" className="btn-primary btn-sm mt-4">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Birinchi muassasani qo'shish
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {institutions.map((inst) => (
              <div key={inst.id} className="card p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas">
                      <TypeIcon type={inst.type} className="h-5 w-5 text-mute" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold text-ink">{inst.nameUz}</span>
                        {inst.isVerified && (
                          <span className="flex items-center gap-0.5 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700 dark:bg-accent-500/10 dark:text-accent-400">
                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                            Tasdiqlangan
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[inst.status] ?? 'bg-surface-2 text-mute'}`}>
                          {inst.status}
                        </span>
                      </div>
                      {inst.nameRu && <p className="text-xs text-faint">{inst.nameRu}</p>}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-faint">
                        <span>{inst.slug}</span>
                        {inst.city && <span>· {inst.city.nameUz}</span>}
                        {inst.avgRating && (
                          <span className="flex items-center gap-0.5">
                            · <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden /> {inst.avgRating.toFixed(1)} ({inst.reviewCount})
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          · <EyeIcon className="h-3 w-3" aria-hidden /> {inst.viewCount.toLocaleString()}
                        </span>
                        <span>· {new Date(inst.createdAt).toLocaleDateString('uz-UZ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <Link
                      href={`/institutions/${inst.slug}`}
                      target="_blank"
                      className="btn-ghost btn-sm"
                      aria-label="Ko'rish"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <Link
                      href={`/admin/institutions/${inst.id}/edit`}
                      className="btn-secondary btn-sm"
                    >
                      <Edit2 className="h-3.5 w-3.5" aria-hidden />
                      Tahrirlash
                    </Link>
                    <button
                      onClick={() => handleVerify(inst.id)}
                      disabled={actionId === inst.id}
                      className={`btn-sm flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                        inst.isVerified
                          ? 'border border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-500/25 dark:bg-accent-500/10 dark:text-accent-400'
                          : 'border border-line bg-surface text-mute hover:text-ink'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      {inst.isVerified ? 'Tasdiqlangan' : 'Tasdiqlash'}
                    </button>
                    <div className="relative">
                      <select
                        value={inst.status}
                        onChange={(e) => handleStatusChange(inst.id, e.target.value)}
                        disabled={actionId === inst.id}
                        className="appearance-none rounded-xl border border-line bg-surface py-1.5 pl-2.5 pr-6 text-xs font-medium text-mute outline-none focus:border-primary-500 disabled:opacity-50 cursor-pointer"
                      >
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-faint" aria-hidden />
                    </div>
                    <button
                      onClick={() => setConfirmDelete(inst)}
                      disabled={actionId === inst.id}
                      className="btn-sm flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      O'chirish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchList(q, statusFilter, p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all tabular-nums ${
                  meta.page === p
                    ? 'bg-primary-600 text-white shadow-card'
                    : 'border border-line text-mute hover:text-ink'
                }`}
                aria-current={meta.page === p ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-sm font-bold text-ink">Muassasani o'chirish</h2>
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-ghost h-8 w-8 rounded-lg p-0"
                aria-label="Yopish"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="px-5 py-5 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
                <Trash2 className="h-6 w-6 text-red-500" aria-hidden />
              </div>
              <p className="text-sm leading-relaxed text-mute">
                <strong className="text-ink">&ldquo;{confirmDelete.nameUz}&rdquo;</strong> ni o&apos;chirishni tasdiqlaysizmi?
              </p>
              <p className="mt-1.5 text-xs font-medium text-red-500">Bu amalni qaytarib bo'lmaydi!</p>
            </div>
            <div className="flex gap-2 border-t border-line px-5 py-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary flex-1"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Ha, o'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
