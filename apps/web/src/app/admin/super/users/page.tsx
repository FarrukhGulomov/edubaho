'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { GraduationCap, Crown, Ban, Users2, Search, BadgeCheck, Lock, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface UserEntry {
  id:           string
  phone:        string
  name?:        string
  email?:       string
  role:         string
  isVerified:   boolean
  isActive:     boolean
  createdAt:    string
  lastActiveAt?: string
  city?:        { nameUz: string }
}

const ROLE_COLORS: Record<string, string> = {
  USER:              'bg-gray-100 text-gray-600',
  INSTITUTION_OWNER: 'bg-blue-100 text-blue-700',
  ADMIN:             'bg-red-100 text-red-700',
  SUPER_ADMIN:       'bg-purple-100 text-purple-700',
}

const ROLE_LABELS: Record<string, string> = {
  USER:              'Foydalanuvchi',
  INSTITUTION_OWNER: 'Muassasa egasi',
  ADMIN:             'Admin',
  SUPER_ADMIN:       'Super Admin',
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default function SuperAdminUsersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [users, setUsers]       = useState<UserEntry[]>([])
  const [meta, setMeta]         = useState({ total: 0, page: 1, totalPages: 1 })
  const [fetching, setFetching] = useState(true)
  const [q, setQ]               = useState('')
  const [roleFilter, setRole]   = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage]         = useState(1)
  const [toast, setToast]       = useState({ msg: '', ok: true })

  // Confirm delete modal
  const [deleteTarget, setDeleteTarget] = useState<UserEntry | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // Inline action loading
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [loading, user, router])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3500)
  }

  function getToken() { return localStorage.getItem('accessToken') ?? '' }
  function authHeaders() {
    return {
      Authorization: `Bearer ${getToken()}`,
      'ngrok-skip-browser-warning': '1',
      'Content-Type': 'application/json',
    }
  }

  const fetchUsers = useCallback(async (search: string, role: string, active: string, pg: number) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setFetching(true)
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '20' })
      if (search.trim()) params.set('q', search.trim())
      if (role) params.set('role', role)
      if (active) params.set('active', active)

      const res = await fetch(`${API}/super-admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      const data = await res.json()
      setUsers(data.data ?? [])
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
    if (user?.role === 'SUPER_ADMIN') fetchUsers(q, roleFilter, activeFilter, page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchUsers(q, roleFilter, activeFilter, 1)
  }

  function handleFilterChange(role: string, active: string) {
    setRole(role)
    setActiveFilter(active)
    setPage(1)
    fetchUsers(q, role, active, 1)
  }

  // Aktiv / deaktiv qilish
  async function handleToggleActive(u: UserEntry) {
    setActionId(u.id)
    try {
      const res = await fetch(`${API}/super-admin/users/${u.id}`, {
        method:  'PATCH',
        headers: authHeaders(),
        body:    JSON.stringify({ isActive: !u.isActive }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message)
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !u.isActive } : x))
      } else {
        showToast(data.error ?? 'Xatolik yuz berdi', false)
      }
    } finally {
      setActionId(null)
    }
  }

  // O'chirish
  async function handleDelete(u: UserEntry) {
    setDeleting(true)
    try {
      const res = await fetch(`${API}/super-admin/users/${u.id}`, {
        method:  'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`"${u.name ?? u.phone}" o'chirildi`)
        setDeleteTarget(null)
        setUsers(prev => prev.filter(x => x.id !== u.id))
        setMeta(m => ({ ...m, total: m.total - 1 }))
      } else {
        showToast(data.error ?? 'Xatolik yuz berdi', false)
      }
    } finally {
      setDeleting(false)
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
      {/* Header */}
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
            <span className="truncate font-semibold text-gray-700">Foydalanuvchilar</span>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
            <Crown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> SUPER_ADMIN
          </span>
        </div>
      </header>

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed right-4 top-20 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg ${
          toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Users2 className="h-6 w-6 shrink-0 text-blue-600" strokeWidth={1.75} /> Barcha foydalanuvchilar
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Jami: <strong>{meta.total.toLocaleString()}</strong> ta
          </p>
        </div>

        {/* Search + Filters */}
        <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-2">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-blue-400">
            <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Ism, telefon yoki email..."
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => handleFilterChange(e.target.value, activeFilter)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-blue-400"
          >
            <option value="">Barcha rollar</option>
            <option value="USER">Foydalanuvchi</option>
            <option value="INSTITUTION_OWNER">Muassasa egasi</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select
            value={activeFilter}
            onChange={e => handleFilterChange(roleFilter, e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-blue-400"
          >
            <option value="">Barcha holat</option>
            <option value="true">Aktiv</option>
            <option value="false">Deaktiv</option>
          </select>
          <button
            type="submit"
            className="whitespace-nowrap rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Qidirish
          </button>
        </form>

        {/* Users table */}
        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <div className="mb-3 flex justify-center">
              <Users2 className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-gray-500">Foydalanuvchilar topilmadi</p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Foydalanuvchi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Telefon</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Rol</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Holat</th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:table-cell">Shahar</th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell">Ro&apos;yxatdan</th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">Oxirgi faollik</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => {
                      const isSelf = u.id === user.id
                      const isSuperAdmin = u.role === 'SUPER_ADMIN'
                      const isLoading = actionId === u.id
                      return (
                        <tr key={u.id} className={`transition-colors hover:bg-gray-50 ${!u.isActive ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                u.isActive ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-400'
                              }`}>
                                {(u.name ?? u.phone).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{u.name ?? '—'}</p>
                                {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{u.phone}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                              {ROLE_LABELS[u.role] ?? u.role}
                            </span>
                            {u.isVerified && (
                              <span title="Tasdiqlangan" className="ml-1 inline-flex align-middle">
                                <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                            }`}>
                              {u.isActive ? 'Aktiv' : 'Deaktiv'}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-gray-500 sm:table-cell">
                            {u.city?.nameUz ?? '—'}
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">
                            {fmt(u.createdAt)}
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-gray-500 lg:table-cell">
                            {u.lastActiveAt ? fmt(u.lastActiveAt) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isSelf && !isSuperAdmin && (
                                <>
                                  {/* Aktiv / Deaktiv toggle */}
                                  <button
                                    disabled={isLoading}
                                    onClick={() => handleToggleActive(u)}
                                    title={u.isActive ? 'Deaktivlashtirish' : 'Aktivlashtirish'}
                                    className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                      u.isActive
                                        ? 'border border-orange-200 text-orange-600 hover:bg-orange-50'
                                        : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {isLoading
                                      ? '...'
                                      : u.isActive
                                        ? <><Lock className="h-3 w-3 shrink-0" strokeWidth={1.75} /> Deaktiv</>
                                        : <><CheckCircle2 className="h-3 w-3 shrink-0" strokeWidth={1.75} /> Aktiv</>}
                                  </button>
                                  {/* O'chirish */}
                                  <button
                                    onClick={() => setDeleteTarget(u)}
                                    title="O'chirish"
                                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                                  </button>
                                </>
                              )}
                              {(isSelf || isSuperAdmin) && (
                                <span className="text-xs text-gray-400 italic">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Sahifa {meta.page} / {meta.totalPages} — {meta.total.toLocaleString()} ta jami
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => { const p = page - 1; setPage(p); fetchUsers(q, roleFilter, activeFilter, p) }}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    ← Oldingi
                  </button>
                  <button
                    disabled={page >= meta.totalPages}
                    onClick={() => { const p = page + 1; setPage(p); fetchUsers(q, roleFilter, activeFilter, p) }}
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

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center">
            <div className="mb-2 flex justify-center">
              <AlertTriangle className="h-10 w-10 text-amber-400" strokeWidth={1.5} />
            </div>
            <h2 className="mb-2 text-lg font-bold text-gray-900">Foydalanuvchini o&apos;chirish</h2>
            <p className="mb-1 text-gray-600">
              <strong>&quot;{deleteTarget.name ?? deleteTarget.phone}&quot;</strong> ni tizimdan butunlay o&apos;chirasizmi?
            </p>
            <p className="mb-5 text-sm text-red-600 font-medium">
              Bu amalni qaytarib bo&apos;lmaydi! Barcha sharhlar va ma&apos;lumotlar ham o&apos;chiriladi.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
