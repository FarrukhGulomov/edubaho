'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface AdminPermission {
  canManageAll:          boolean
  institutionIds:        string[]
  canCreateInstitutions: boolean
  canEditInstitutions:   boolean
  canDeleteInstitutions: boolean
  canModerateReviews:    boolean
  canViewUsers:          boolean
}

interface Admin {
  id:               string
  phone:            string
  name?:            string
  email?:           string
  createdAt:        string
  adminPermission:  AdminPermission | null
}

// Ruxsat nomi → O'zbekcha
const PERM_LABELS: { key: keyof AdminPermission; label: string }[] = [
  { key: 'canManageAll',          label: 'Barcha muassasalar' },
  { key: 'canCreateInstitutions', label: "Muassasa qo'shish" },
  { key: 'canEditInstitutions',   label: 'Muassasa tahrirlash' },
  { key: 'canDeleteInstitutions', label: "Muassasa o'chirish" },
  { key: 'canModerateReviews',    label: 'Sharhlarni moderatsiya' },
  { key: 'canViewUsers',          label: "Foydalanuvchilarni ko'rish" },
]

const EMPTY_PERMS: AdminPermission = {
  canManageAll: false, institutionIds: [],
  canCreateInstitutions: false, canEditInstitutions: false,
  canDeleteInstitutions: false, canModerateReviews: false,
  canViewUsers: false,
}

export default function SuperAdminAdminsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [admins, setAdmins]             = useState<Admin[]>([])
  const [fetching, setFetching]         = useState(true)
  const [toast, setToast]               = useState({ msg: '', ok: true })

  // Yangi admin yaratish modal
  const [showCreate, setShowCreate]     = useState(false)
  const [createUserId, setCreateUserId] = useState('')
  const [createPerms, setCreatePerms]   = useState<AdminPermission>({ ...EMPTY_PERMS })
  const [creating, setCreating]         = useState(false)

  // Ruxsatlarni tahrirlash
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editPerms, setEditPerms]       = useState<AdminPermission>({ ...EMPTY_PERMS })
  const [saving, setSaving]             = useState(false)

  // Demote modal
  const [confirmDemote, setConfirmDemote] = useState<Admin | null>(null)
  const [demoting, setDemoting]           = useState(false)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3500)
  }

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [loading, user, router])

  function getToken() { return localStorage.getItem('accessToken') ?? '' }
  function headers(token: string) {
    return { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1', 'Content-Type': 'application/json' }
  }

  async function fetchAdmins() {
    const token = getToken()
    if (!token) return
    setFetching(true)
    try {
      const res = await fetch(`${API}/super-admin/admins`, { headers: headers(token) })
      const data = await res.json()
      setAdmins(data.data ?? [])
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') fetchAdmins()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Yangi admin yaratish ──
  async function handleCreate() {
    if (!createUserId.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`${API}/super-admin/admins`, {
        method: 'POST',
        headers: headers(getToken()),
        body: JSON.stringify({ phone: createUserId.trim(), ...createPerms }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast("✅ Admin muvaffaqiyatli tayinlandi")
        setShowCreate(false)
        setCreateUserId('')
        setCreatePerms({ ...EMPTY_PERMS })
        fetchAdmins()
      } else {
        showToast(data.error ?? 'Xatolik yuz berdi', false)
      }
    } finally {
      setCreating(false)
    }
  }

  // ── Ruxsatlarni saqlash ──
  async function handleSavePerms(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`${API}/super-admin/admins/${id}`, {
        method: 'PATCH',
        headers: headers(getToken()),
        body: JSON.stringify(editPerms),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('✅ Ruxsatlar yangilandi')
        setEditingId(null)
        fetchAdmins()
      } else {
        showToast(data.error ?? 'Xatolik', false)
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Adminni demote qilish ──
  async function handleDemote(admin: Admin) {
    setDemoting(true)
    try {
      const res = await fetch(`${API}/super-admin/admins/${admin.id}`, {
        method: 'DELETE',
        headers: headers(getToken()),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`🗑️ "${admin.name ?? admin.phone}" admin huquqlari olib tashlandi`)
        setConfirmDemote(null)
        setAdmins(prev => prev.filter(a => a.id !== admin.id))
      } else {
        showToast(data.error ?? 'Xatolik', false)
      }
    } finally {
      setDemoting(false)
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
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold mb-2">Ruxsat yo&apos;q</h1>
        <Link href="/" className="text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-bold text-primary-600">🎓 EduReyting</Link>
            <span className="text-gray-300">›</span>
            <Link href="/admin" className="text-gray-500 hover:text-gray-700">Admin</Link>
            <span className="text-gray-300">›</span>
            <Link href="/admin/super" className="text-gray-500 hover:text-gray-700">Super Admin</Link>
            <span className="text-gray-300">›</span>
            <span className="font-semibold text-gray-700">Adminlar</span>
          </div>
          <button
            onClick={() => { setShowCreate(true); setCreatePerms({ ...EMPTY_PERMS }) }}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 transition-colors"
          >
            + Admin tayinlash
          </button>
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

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900">🛡️ Adminlar boshqaruvi</h1>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
            {admins.length} ta admin
          </span>
        </div>

        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          </div>
        ) : admins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <div className="mb-3 text-5xl">🛡️</div>
            <p className="font-semibold text-gray-600">Hozircha adminlar yo&apos;q</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-700"
            >
              + Birinchi adminni tayinlash
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {admins.map(admin => {
              const p = admin.adminPermission
              const isEditing = editingId === admin.id
              return (
                <div key={admin.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {/* Admin info row */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-lg font-bold text-purple-700">
                        {(admin.name ?? admin.phone).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{admin.name ?? '—'}</p>
                        <p className="text-sm text-gray-500">{admin.phone}</p>
                        {admin.email && <p className="text-xs text-gray-400">{admin.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(admin.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                      <button
                        onClick={() => {
                          if (isEditing) { setEditingId(null) } else {
                            setEditingId(admin.id)
                            setEditPerms(p ? { ...p } : { ...EMPTY_PERMS })
                          }
                        }}
                        className="rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        {isEditing ? 'Yopish' : '✏️ Ruxsatlar'}
                      </button>
                      <button
                        onClick={() => setConfirmDemote(admin)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        🚫 Bekor qilish
                      </button>
                    </div>
                  </div>

                  {/* Permission badges */}
                  {!isEditing && p && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex flex-wrap gap-1.5">
                      {PERM_LABELS.map(({ key, label }) => key !== 'institutionIds' && (
                        <span
                          key={key}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            (p[key] as boolean)
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {(p[key] as boolean) ? '✓' : '✗'} {label}
                        </span>
                      ))}
                      {p.institutionIds.length > 0 && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          🏫 {p.institutionIds.length} ta muassasa
                        </span>
                      )}
                    </div>
                  )}

                  {/* Edit permissions form */}
                  {isEditing && (
                    <div className="border-t border-purple-100 bg-purple-50 px-5 py-4">
                      <p className="mb-3 text-sm font-bold text-purple-800">Ruxsatlarni tahrirlash:</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {PERM_LABELS.map(({ key, label }) => (
                          <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-purple-200 bg-white px-3 py-2 hover:border-purple-400 transition-colors">
                            <input
                              type="checkbox"
                              checked={editPerms[key] as boolean}
                              onChange={e => setEditPerms(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="h-4 w-4 accent-purple-600"
                            />
                            <span className="text-xs font-medium text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleSavePerms(admin.id)}
                          disabled={saving}
                          className="rounded-xl bg-purple-600 px-5 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-60 transition-colors"
                        >
                          {saving ? 'Saqlanmoqda...' : '✓ Saqlash'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Bekor
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-xl font-black text-gray-900">👑 Admin tayinlash</h2>
            <p className="mb-5 text-sm text-gray-500">Foydalanuvchini admin qiling va ruxsatlarini belgilang</p>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Telefon raqami <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={createUserId}
                onChange={e => setCreateUserId(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
              <p className="mt-1 text-xs text-gray-400">Foydalanuvchi avval tizimga kirgan bo&apos;lishi kerak</p>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-gray-700">Ruxsatlar:</p>
              <div className="grid grid-cols-2 gap-2">
                {PERM_LABELS.map(({ key, label }) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:border-purple-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={createPerms[key] as boolean}
                      onChange={e => setCreatePerms(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="h-4 w-4 accent-purple-600"
                    />
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCreate(false); setCreateUserId(''); setCreatePerms({ ...EMPTY_PERMS }) }}
                className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createUserId.trim()}
                className="flex-1 rounded-xl bg-purple-600 py-3 font-bold text-white hover:bg-purple-700 disabled:opacity-60 transition-colors"
              >
                {creating ? 'Tayinlanmoqda...' : '✓ Admin qilish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demote confirm modal */}
      {confirmDemote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center">
            <div className="mb-2 text-5xl">⚠️</div>
            <h2 className="mb-2 text-lg font-bold text-gray-900">Admin huquqlarini bekor qilish</h2>
            <p className="mb-5 text-gray-600">
              <strong>&quot;{confirmDemote.name ?? confirmDemote.phone}&quot;</strong> admin huquqlarini olib
              tashlab, oddiy foydalanuvchiga aylantirasizmi?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDemote(null)}
                className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDemote(confirmDemote)}
                disabled={demoting}
                className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {demoting ? 'Olinmoqda...' : 'Ha, bekor qilish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
