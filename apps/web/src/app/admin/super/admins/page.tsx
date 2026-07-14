'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Plus, Edit2, X, Check, ChevronRight, AlertCircle, CheckCircle2, Crown } from 'lucide-react'

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
  const [showCreate, setShowCreate]     = useState(false)
  const [createUserId, setCreateUserId] = useState('')
  const [createPerms, setCreatePerms]   = useState<AdminPermission>({ ...EMPTY_PERMS })
  const [creating, setCreating]         = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editPerms, setEditPerms]       = useState<AdminPermission>({ ...EMPTY_PERMS })
  const [saving, setSaving]             = useState(false)
  const [confirmDemote, setConfirmDemote] = useState<Admin | null>(null)
  const [demoting, setDemoting]           = useState(false)

  function showToastMsg(msg: string, ok = true) {
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
      const data = await res.json() as { data?: Admin[] }
      setAdmins(data.data ?? [])
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') fetchAdmins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleCreate() {
    if (!createUserId.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`${API}/super-admin/admins`, {
        method: 'POST',
        headers: headers(getToken()),
        body: JSON.stringify({ phone: createUserId.trim(), ...createPerms }),
      })
      const data = await res.json() as { error?: string }
      if (res.ok) {
        showToastMsg("Admin muvaffaqiyatli tayinlandi")
        setShowCreate(false)
        setCreateUserId('')
        setCreatePerms({ ...EMPTY_PERMS })
        fetchAdmins()
      } else {
        showToastMsg(data.error ?? 'Xatolik yuz berdi', false)
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleSavePerms(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`${API}/super-admin/admins/${id}`, {
        method: 'PATCH',
        headers: headers(getToken()),
        body: JSON.stringify(editPerms),
      })
      const data = await res.json() as { error?: string }
      if (res.ok) {
        showToastMsg('Ruxsatlar yangilandi')
        setEditingId(null)
        fetchAdmins()
      } else {
        showToastMsg(data.error ?? 'Xatolik', false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDemote(admin: Admin) {
    setDemoting(true)
    try {
      const res = await fetch(`${API}/super-admin/admins/${admin.id}`, {
        method: 'DELETE',
        headers: headers(getToken()),
      })
      const data = await res.json() as { error?: string }
      if (res.ok) {
        showToastMsg(`"${admin.name ?? admin.phone}" admin huquqlari olib tashlandi`)
        setConfirmDemote(null)
        setAdmins(prev => prev.filter(a => a.id !== admin.id))
      } else {
        showToastMsg(data.error ?? 'Xatolik', false)
      }
    } finally {
      setDemoting(false)
    }
  }

  if (loading || !user) return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
    </div>
  )

  if (user.role !== 'SUPER_ADMIN') return (
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
      {/* Toast */}
      {toast.msg && (
        <div role="status" className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-pop ${
          toast.ok ? 'bg-accent-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <AlertCircle className="h-4 w-4" aria-hidden />}
          {toast.msg}
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-semibold text-primary-600 hover:text-primary-700">EDUBAHO</Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <Link href="/admin" className="text-mute hover:text-ink">Admin</Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <Link href="/admin/super" className="text-mute hover:text-ink">Super Admin</Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <span className="font-semibold text-ink">Adminlar</span>
          </div>
          <button
            onClick={() => { setShowCreate(true); setCreatePerms({ ...EMPTY_PERMS }) }}
            className="btn-primary btn-sm"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Admin tayinlash
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-bold text-ink">
            <ShieldCheck className="h-5 w-5 text-violet-600" aria-hidden />
            Adminlar boshqaruvi
          </h1>
          <span className="badge tabular-nums">{admins.length} ta admin</span>
        </div>

        {fetching ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
          </div>
        ) : admins.length === 0 ? (
          <div className="card py-14 text-center">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-faint" aria-hidden />
            <p className="text-sm font-semibold text-ink">Hozircha adminlar yo'q</p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary btn-sm mt-4"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Birinchi adminni tayinlash
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map(admin => {
              const p = admin.adminPermission
              const isEditing = editingId === admin.id
              return (
                <div key={admin.id} className="card overflow-hidden p-0">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
                        {(admin.name ?? admin.phone).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{admin.name ?? '—'}</p>
                        <p className="text-xs text-mute">{admin.phone}</p>
                        {admin.email && <p className="text-xs text-faint">{admin.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-faint">
                        {new Date(admin.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                      <button
                        onClick={() => {
                          if (isEditing) { setEditingId(null) } else {
                            setEditingId(admin.id)
                            setEditPerms(p ? { ...p } : { ...EMPTY_PERMS })
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-500/25 dark:text-violet-400 dark:hover:bg-violet-500/10"
                      >
                        <Edit2 className="h-3 w-3" aria-hidden />
                        {isEditing ? 'Yopish' : 'Ruxsatlar'}
                      </button>
                      <button
                        onClick={() => setConfirmDemote(admin)}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/25 dark:hover:bg-red-500/10"
                      >
                        <X className="h-3 w-3" aria-hidden />
                        Bekor qilish
                      </button>
                    </div>
                  </div>

                  {!isEditing && p && (
                    <div className="border-t border-line bg-canvas px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {PERM_LABELS.map(({ key, label }) => key !== 'institutionIds' && (
                          <span
                            key={key}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              (p[key] as boolean)
                                ? 'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400'
                                : 'bg-surface-2 text-faint'
                            }`}
                          >
                            {(p[key] as boolean) ? <Check className="inline h-3 w-3" /> : <X className="inline h-3 w-3" />}{' '}
                            {label}
                          </span>
                        ))}
                        {p.institutionIds.length > 0 && (
                          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                            {p.institutionIds.length} ta muassasa
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="border-t border-violet-200 bg-violet-50/30 px-5 py-4 dark:border-violet-500/20 dark:bg-violet-500/5">
                      <p className="mb-3 text-xs font-semibold text-mute">Ruxsatlarni tahrirlash:</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {PERM_LABELS.map(({ key, label }) => (
                          <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 transition-colors hover:border-violet-300">
                            <input
                              type="checkbox"
                              checked={editPerms[key] as boolean}
                              onChange={e => setEditPerms(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="h-4 w-4 accent-violet-600"
                            />
                            <span className="text-xs font-medium text-mute">{label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleSavePerms(admin.id)}
                          disabled={saving}
                          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-ghost btn-sm"
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

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" aria-hidden />
                <h2 className="text-sm font-bold text-ink">Admin tayinlash</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="btn-ghost h-8 w-8 rounded-lg p-0">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="mb-4 text-xs text-mute">Foydalanuvchini admin qiling va ruxsatlarini belgilang</p>
              <div className="mb-4">
                <label htmlFor="admin-phone" className="mb-1.5 block text-xs font-medium text-ink">
                  Telefon raqami <span className="text-red-500">*</span>
                </label>
                <input
                  id="admin-phone"
                  type="tel"
                  value={createUserId}
                  onChange={e => setCreateUserId(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="input"
                />
                <p className="mt-1 text-xs text-faint">Foydalanuvchi avval tizimga kirgan bo&apos;lishi kerak</p>
              </div>
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-mute">Ruxsatlar:</p>
                <div className="grid grid-cols-2 gap-2">
                  {PERM_LABELS.map(({ key, label }) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2 transition-colors hover:border-violet-300">
                      <input
                        type="checkbox"
                        checked={createPerms[key] as boolean}
                        onChange={e => setCreatePerms(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="h-4 w-4 accent-violet-600"
                      />
                      <span className="text-xs font-medium text-mute">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCreate(false); setCreateUserId(''); setCreatePerms({ ...EMPTY_PERMS }) }}
                  className="btn-secondary flex-1"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !createUserId.trim()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {creating ? 'Tayinlanmoqda...' : 'Admin qilish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demote confirm modal */}
      {confirmDemote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
            <div className="px-5 py-5 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" aria-hidden />
              </div>
              <h2 className="mb-1 text-sm font-bold text-ink">Admin huquqlarini bekor qilish</h2>
              <p className="text-sm text-mute">
                <strong className="text-ink">&ldquo;{confirmDemote.name ?? confirmDemote.phone}&rdquo;</strong> admin huquqlarini olib tashlab, oddiy foydalanuvchiga aylantirasizmi?
              </p>
            </div>
            <div className="flex gap-2 border-t border-line px-5 py-4">
              <button onClick={() => setConfirmDemote(null)} className="btn-secondary flex-1">
                Bekor qilish
              </button>
              <button
                onClick={() => handleDemote(confirmDemote)}
                disabled={demoting}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
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
