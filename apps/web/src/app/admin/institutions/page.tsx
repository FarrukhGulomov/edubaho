'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  GraduationCap, ClipboardList, Search, RefreshCw, School, BadgeCheck,
  Circle, Link2, MapPin, Phone, Star, Eye, Pencil, Trash2, X, Ban,
  Laptop, Palette, Globe2, PencilLine, Dumbbell, Trophy, Landmark, UserCheck,
} from 'lucide-react'
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

const TYPE_ICONS: Record<string, typeof School> = {
  IT_SCHOOL: Laptop, UNIVERSITY: GraduationCap, SCHOOL: School, KINDERGARTEN: Palette,
  LANGUAGE_CENTER: Globe2, COURSE_CENTER: PencilLine, SPORTS_SCHOOL: Dumbbell, LYCEUM: Trophy,
  COLLEGE: Landmark, TUTORING: UserCheck, ARTS_SCHOOL: Palette,
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
        showToast(`Status: ${status}`)
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
        showToast(data.isVerified ? 'Tasdiqlandi' : 'Tasdiq bekor qilindi')
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
        showToast(`"${inst.nameUz}" o'chirildi`)
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

  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4">
        <div>
          <div className="mb-4 flex justify-center">
            <Ban className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
          </div>
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold text-primary-600">
              <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={1.75} /> EDUBAHO
            </Link>
            <span className="shrink-0 text-gray-300">›</span>
            <Link href="/admin/reviews" className="shrink-0 whitespace-nowrap text-gray-500 hover:text-gray-700">Admin</Link>
            <span className="shrink-0 text-gray-300">›</span>
            <span className="truncate font-semibold text-gray-700">Muassasalar</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin"
              className="whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              ← Orqaga
            </Link>
            <Link
              href="/admin/reviews"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <ClipboardList className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Sharhlar
            </Link>
            <Link
              href="/admin/institutions/new"
              className="whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
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
          <form onSubmit={handleSearch} className="flex min-w-64 flex-1 gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nomi yoki slug bo'yicha qidirish..."
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Qidirish
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); fetchList(q, e.target.value) }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-primary-400 transition-colors cursor-pointer"
          >
            <option value="">Barcha statuslar</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => fetchList(q, statusFilter)}
            disabled={fetching}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${fetching ? 'animate-spin' : ''}`} strokeWidth={1.75} /> Yangilash
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
            <div className="mb-3 flex justify-center">
              <School className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-gray-600">Muassasa topilmadi</p>
            <Link href="/admin/institutions/new" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
              + Birinchi muassasani qo'shish
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {institutions.map((inst) => {
              const TypeIcon = TYPE_ICONS[inst.type] ?? School
              return (
              <div key={inst.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300">
                <div className="flex flex-wrap items-start gap-3">
                  {/* Icon + name */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="icon-chip h-12 w-12 shrink-0">
                      <TypeIcon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900 leading-tight">{inst.nameUz}</span>
                        {inst.isVerified && (
                          <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <BadgeCheck className="h-3 w-3 shrink-0" strokeWidth={2} /> Tasdiqlangan
                          </span>
                        )}
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[inst.status] ?? 'bg-gray-100'}`}>
                          {inst.status}
                        </span>
                      </div>
                      {inst.nameRu && <p className="text-xs text-gray-400">{inst.nameRu}</p>}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Link2 className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {inst.slug}</span>
                        {inst.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {inst.city.nameUz}</span>}
                        {inst.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {inst.phone}</span>}
                        {inst.avgRating && <span className="flex items-center gap-1"><Star className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {inst.avgRating.toFixed(1)} ({inst.reviewCount} sharh)</span>}
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {inst.viewCount.toLocaleString()}</span>
                        <span className="text-gray-400">{new Date(inst.createdAt).toLocaleDateString('uz-UZ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link
                      href={`/institutions/${inst.slug}`}
                      target="_blank"
                      className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Ko'rish
                    </Link>
                    <Link
                      href={`/admin/institutions/${inst.id}/edit`}
                      className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-100"
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Tahrirlash
                    </Link>
                    <button
                      onClick={() => handleVerify(inst.id)}
                      disabled={actionId === inst.id}
                      className={`flex items-center gap-1 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        inst.isVerified
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {inst.isVerified
                        ? <><BadgeCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Tasdiqlangan</>
                        : <><Circle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Tasdiqlash</>}
                    </button>

                    {/* Status selector */}
                    <select
                      value={inst.status}
                      onChange={(e) => handleStatusChange(inst.id, e.target.value)}
                      disabled={actionId === inst.id}
                      className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 outline-none disabled:opacity-50 cursor-pointer focus:border-primary-400 transition-colors"
                    >
                      {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button
                      onClick={() => setConfirmDelete(inst)}
                      disabled={actionId === inst.id}
                      className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> O'chirish
                    </button>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchList(q, statusFilter, p)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  meta.page === p
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-600'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Muassasani o'chirish</h2>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            {/* Modal body */}
            <div className="px-6 py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <Trash2 className="h-7 w-7 text-red-400" strokeWidth={1.5} />
              </div>
              <p className="text-base text-gray-600 leading-relaxed">
                <strong className="text-gray-900">"{confirmDelete.nameUz}"</strong> ni o'chirishni tasdiqlaysizmi?
              </p>
              <p className="mt-2 text-sm text-red-500 font-medium">Bu amalni qaytarib bo'lmaydi!</p>
            </div>
            {/* Modal footer */}
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-base font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                ← Bekor qilish
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-base font-semibold text-white transition-colors hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Ha, o'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
