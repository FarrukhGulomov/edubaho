'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import type React from 'react'

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

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  ACTIVE:    'bg-green-100 text-green-800',
  PREMIUM:   'bg-orange-100 text-orange-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  INACTIVE:  'bg-gray-100 text-gray-600',
}

const TYPE_ICONS: Record<string, string> = {
  IT_SCHOOL: '💻', UNIVERSITY: '🎓', SCHOOL: '📚', KINDERGARTEN: '🎨',
  LANGUAGE_CENTER: '🌐', COURSE_CENTER: '✏️', SPORTS_SCHOOL: '⚽', LYCEUM: '🏫',
  COLLEGE: '🏛️', TUTORING: '👨‍🏫', ARTS_SCHOOL: '🎭',
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

  useEffect(() => {
    if (user) fetchList()
  }, [user, fetchList])

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
        showToast(`✅ Status: ${status}`)
      }
    } finally {
      setActionId(null)
    }
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
        showToast(data.isVerified ? '✅ Tasdiqlandi' : '⚠️ Tasdiq bekor qilindi')
      }
    } finally {
      setActionId(null)
    }
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
        showToast(`🗑️ "${inst.nameUz}" o'chirildi`)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error ?? "O'chirishda xatolik", false)
      }
    } finally {
      setActionId(null)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchList(q, statusFilter)
  }

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )

  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4">
        <div>
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ruxsat yo&apos;q</h1>
          <Link href="/" className="text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-bold text-primary-600">🎓 EduReyting</Link>
            <span className="text-gray-300">›</span>
            <Link href="/admin/reviews" className="text-gray-500 hover:text-gray-700">Admin</Link>
            <span className="text-gray-300">›</span>
            <span className="font-semibold text-gray-700">Muassasalar</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/reviews"
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              📋 Sharhlar
            </Link>
            <Link
              href="/admin/institutions/new"
              className="rounded-xl bg-primary-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-primary-700 transition-colors"
            >
              + Yangi muassasa
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">

        {/* Toast */}
        {toast.msg && (
          <div className={`mb-4 rounded-2xl px-5 py-3 font-medium ${toast.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {toast.msg}
          </div>
        )}

        {/* Search + filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 min-w-64 gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nomi yoki slug bo'yicha qidirish..."
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Qidirish
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); fetchList(q, e.target.value) }}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 outline-none"
          >
            <option value="">Barcha statuslar</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => fetchList(q, statusFilter)}
            disabled={fetching}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {fetching ? '⏳' : '↻ Yangilash'}
          </button>
        </div>

        {/* Stats row */}
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Jami: <strong className="text-gray-900">{meta.total} ta muassasa</strong>
            {statusFilter && <span className="ml-2 text-primary-600">({statusFilter} filtrlandi)</span>}
          </p>
        </div>

        {/* Table / list */}
        {fetching ? (
          <div className="py-16 text-center text-gray-400">Yuklanmoqda...</div>
        ) : institutions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">🏫</div>
            <p className="font-semibold text-gray-600">Muassasa topilmadi</p>
            <Link href="/admin/institutions/new" className="mt-4 inline-block rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-700">
              + Birinchi muassasani qo'shish
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {institutions.map((inst) => (
              <div key={inst.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start gap-3">
                  {/* Icon + name */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
                      {TYPE_ICONS[inst.type] ?? '🏫'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900 leading-tight">{inst.nameUz}</span>
                        {inst.isVerified && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">✓ Tasdiqlangan</span>
                        )}
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[inst.status] ?? 'bg-gray-100'}`}>
                          {inst.status}
                        </span>
                      </div>
                      {inst.nameRu && <p className="text-xs text-gray-400">{inst.nameRu}</p>}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>🔗 {inst.slug}</span>
                        {inst.city && <span>📍 {inst.city.nameUz}</span>}
                        {inst.phone && <span>📞 {inst.phone}</span>}
                        {inst.avgRating && <span>⭐ {inst.avgRating.toFixed(1)} ({inst.reviewCount} sharh)</span>}
                        <span>👁️ {inst.viewCount.toLocaleString()}</span>
                        <span className="text-gray-400">{new Date(inst.createdAt).toLocaleDateString('uz-UZ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link
                      href={`/institutions/${inst.slug}`}
                      target="_blank"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      👁️ Ko'rish
                    </Link>
                    <Link
                      href={`/admin/institutions/${inst.id}/edit`}
                      className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                    >
                      ✏️ Tahrirlash
                    </Link>
                    <button
                      onClick={() => handleVerify(inst.id)}
                      disabled={actionId === inst.id}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 transition-colors ${
                        inst.isVerified
                          ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {inst.isVerified ? '✓ Tasdiqlangan' : '○ Tasdiqlash'}
                    </button>

                    {/* Status selector */}
                    <select
                      value={inst.status}
                      onChange={(e) => handleStatusChange(inst.id, e.target.value)}
                      disabled={actionId === inst.id}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 outline-none disabled:opacity-50 cursor-pointer"
                    >
                      {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button
                      onClick={() => setConfirmDelete(inst)}
                      disabled={actionId === inst.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      🗑️ O'chirish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchList(q, statusFilter, p)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  meta.page === p
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mb-2 text-5xl">⚠️</div>
              <h2 className="text-lg font-bold text-gray-900">Muassasani o'chirish</h2>
              <p className="mt-2 text-gray-600">
                <strong>"{confirmDelete.nameUz}"</strong> ni o'chirishni tasdiqlaysizmi?
                Bu amalni qaytarib bo'lmaydi.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700"
              >
                Ha, o'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
