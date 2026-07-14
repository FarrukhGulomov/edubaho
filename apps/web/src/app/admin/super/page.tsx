'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import {
  Crown, ShieldCheck, Users, BarChart2, RefreshCw, ChevronRight, X,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export default function SuperAdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({ totalUsers: 0, totalAdmins: 0 })
  const [reindexing, setReindexing] = useState(false)
  const [reindexMsg, setReindexMsg] = useState('')

  async function handleReindex() {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setReindexing(true)
    setReindexMsg('')
    try {
      const res = await fetch(`${API}/super-admin/search/reindex`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      const data = await res.json() as { message?: string }
      setReindexMsg(data.message ?? 'Bajarildi')
    } catch {
      setReindexMsg('Xatolik yuz berdi')
    } finally {
      setReindexing(false)
      setTimeout(() => setReindexMsg(''), 5000)
    }
  }

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [loading, user, router])

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') return
    const token = localStorage.getItem('accessToken')
    if (!token) return
    const h = { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' }
    Promise.all([
      fetch(`${API}/super-admin/users?limit=1`, { headers: h }).then(r => r.json()),
      fetch(`${API}/super-admin/admins`, { headers: h }).then(r => r.json()),
    ]).then(([usersData, adminsData]: [{ meta?: { total?: number } }, { data?: unknown[] }]) => {
      setStats({
        totalUsers:  usersData.meta?.total ?? 0,
        totalAdmins: (adminsData.data ?? []).length,
      })
    }).catch(() => {})
  }, [user])

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
        <p className="mt-1 text-sm text-mute">Bu sahifa faqat super adminlar uchun</p>
        <Link href="/" className="mt-3 inline-block text-sm text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
      </div>
    </div>
  )

  const links = [
    {
      href: '/admin/super/admins',
      Icon: ShieldCheck,
      title: 'Adminlarni boshqarish',
      desc: 'Tayinlash, ruxsatlarni sozlash, bekor qilish',
      cls: 'border-violet-200 bg-violet-50/50 dark:border-violet-500/20 dark:bg-violet-500/5',
      iconCls: 'bg-violet-600',
    },
    {
      href: '/admin/super/users',
      Icon: Users,
      title: 'Barcha foydalanuvchilar',
      desc: "Ko'rish, aktiv/deaktiv qilish, o'chirish",
      cls: 'border-primary-200 bg-primary-50/50 dark:border-primary-500/20 dark:bg-primary-500/5',
      iconCls: 'bg-primary-600',
    },
    {
      href: '/admin/super/analytics',
      Icon: BarChart2,
      title: 'Lead Analytics',
      desc: 'Funnel, lidlar, sessiya tarixi, konversiya',
      cls: 'border-accent-200 bg-accent-50/50 dark:border-accent-500/20 dark:bg-accent-500/5',
      iconCls: 'bg-accent-600',
    },
  ]

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-semibold text-primary-600 hover:text-primary-700">EDUBAHO</Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <Link href="/admin" className="text-mute hover:text-ink">Admin</Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <span className="font-semibold text-ink">Super Admin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Crown className="h-4 w-4 text-amber-500" aria-hidden />
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
              SUPER_ADMIN
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2.5">
          <Crown className="h-5 w-5 text-amber-500" aria-hidden />
          <h1 className="text-xl font-bold text-ink">Super Admin panel</h1>
        </div>
        <p className="mb-7 -mt-5 ml-7 text-sm text-mute">Xush kelibsiz, {user.name ?? user.phone}!</p>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="card p-5">
            <p className="text-xs text-faint">Jami foydalanuvchilar</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{stats.totalUsers.toLocaleString()}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-faint">Adminlar soni</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">{stats.totalAdmins}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ href, Icon, title, desc, cls, iconCls }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-2xl border p-5 transition-all hover:shadow-card-hover ${cls}`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                <Icon className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-ink">{title}</h2>
                <p className="mt-0.5 text-xs text-mute">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
            </Link>
          ))}
        </div>

        {/* Reindex */}
        <div className="card border-orange-200 bg-orange-50/30 p-5 dark:border-orange-500/20 dark:bg-orange-500/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                <RefreshCw className="h-4 w-4 text-orange-500" aria-hidden />
                Qidiruv indeksini yangilash
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-mute">
                Kirill/lotin transliteratsiya yoki yangi maydonlar qo&apos;shilganda. Barcha ACTIVE va PREMIUM muassasalar qayta indexlanadi.
              </p>
              {reindexMsg && (
                <p className="mt-2 inline-block rounded-lg border border-orange-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink dark:border-orange-500/25">
                  {reindexMsg}
                </p>
              )}
            </div>
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${reindexing ? 'animate-spin' : ''}`} aria-hidden />
              {reindexing ? 'Indexlanmoqda...' : 'Qayta indexlash'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
