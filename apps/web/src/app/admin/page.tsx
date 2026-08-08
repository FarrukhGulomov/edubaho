'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  GraduationCap, Crown, ShieldCheck, ClipboardList, School, CalendarCheck,
  Building2, Clock, Sparkles, Users, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface DashboardStats {
  totalInstitutions: number
  pendingInstitutions: number
  pendingReviews: number
  pendingBookings: number
  leadsNeedContact: number
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [verifying, setVerifying] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    // Token yo'q → admin login sahifasiga
    const token = localStorage.getItem('accessToken')
    if (!loading && !token) {
      router.replace('/admin/login')
      return
    }
    if (!loading && token) {
      // Admin verifikatsiyasini tekshir
      fetch(`${API}/auth/admin-check`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
        .then(r => r.json())
        .then(d => {
          if (!d.verified) {
            // Token bor lekin admin PIN kiritilmagan
            router.replace('/admin/login')
          } else {
            setVerifying(false)
          }
        })
        .catch(() => {
          router.replace('/admin/login')
        })
    }
  }, [loading, router])

  // Boshqaruv panelidagi tezkor statistika — mavjud ro'yxat endpointlaridan
  // limit=1 bilan faqat meta.total olinadi (yangi backend shart emas)
  useEffect(() => {
    if (verifying) return
    const token = localStorage.getItem('accessToken')
    if (!token) return
    const headers = { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' }

    Promise.all([
      fetch(`${API}/admin/institutions?limit=1`, { headers }).then(r => r.json()),
      fetch(`${API}/admin/institutions?status=PENDING&limit=1`, { headers }).then(r => r.json()),
      fetch(`${API}/admin/reviews/pending?limit=1`, { headers }).then(r => r.json()),
      fetch(`${API}/admin/trial-bookings?status=PENDING&limit=1`, { headers }).then(r => r.json()),
      fetch(`${API}/admin/leads?status=CONTACT_REQUIRED&limit=1`, { headers }).then(r => r.json()),
    ])
      .then(([institutions, pending, reviews, bookings, leads]) => {
        setStats({
          totalInstitutions:   institutions.meta?.total ?? 0,
          pendingInstitutions: pending.meta?.total ?? 0,
          pendingReviews:      reviews.meta?.total ?? 0,
          pendingBookings:     bookings.meta?.total ?? 0,
          leadsNeedContact:    leads.meta?.total ?? 0,
        })
      })
      .catch(() => {}) // statistika ixtiyoriy — muvaffaqiyatsiz bo'lsa jim o'tkaziladi
  }, [verifying])

  if (loading || verifying) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Tekshirilmoqda...</p>
      </div>
    </div>
  )

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    router.replace('/admin/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold text-primary-600">
              <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={1.75} /> EDULA
            </Link>
            <span className="shrink-0 text-gray-300">›</span>
            <span className="truncate font-semibold text-gray-700">Admin panel</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${
              user.role === 'SUPER_ADMIN'
                ? 'bg-purple-50 text-purple-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {user.role === 'SUPER_ADMIN'
                ? <Crown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                : <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />}
              {user.role}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold text-gray-900">
          <ShieldCheck className="h-7 w-7 shrink-0 text-primary-600" strokeWidth={1.75} /> Admin panel
        </h1>
        <p className="mb-8 text-gray-500">Xush kelibsiz, {user.name ?? user.phone}!</p>

        {/* Tezkor statistika — admin panelga kirgan zahoti nima e'tibor talab
            qilayotgani bir qarashda ko'rinishi kerak */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile Icon={Building2} label="Jami muassasa" value={stats?.totalInstitutions} accent="text-primary-600 bg-primary-50" />
          <StatTile Icon={Sparkles} label="Tasdiq kutmoqda" value={stats?.pendingInstitutions} accent="text-amber-600 bg-amber-50" urgent={!!stats?.pendingInstitutions} />
          <StatTile Icon={ClipboardList} label="Kutayotgan sharhlar" value={stats?.pendingReviews} accent="text-orange-600 bg-orange-50" urgent={!!stats?.pendingReviews} />
          <StatTile Icon={Clock} label="Probnoy so'rovlar" value={stats?.pendingBookings} accent="text-emerald-600 bg-emerald-50" urgent={!!stats?.pendingBookings} />
          <StatTile Icon={Users} label="Bog'lanish kerak" value={stats?.leadsNeedContact} accent="text-rose-600 bg-rose-50" urgent={!!stats?.leadsNeedContact} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/leads"
            className="relative flex items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 transition-colors hover:border-rose-400"
          >
            <span className="icon-chip h-14 w-14 shrink-0 bg-rose-600 text-white">
              <Users className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-rose-900">Lidlar (CRM)</h2>
              <p className="text-sm text-rose-700">Foydalanuvchilar, ularning maqsadi, holati va faoliyati</p>
            </div>
            <NavBadge count={stats?.leadsNeedContact} className="bg-rose-600" />
          </Link>

          <Link
            href="/admin/reviews"
            className="relative flex items-center gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-6 transition-colors hover:border-orange-400"
          >
            <span className="icon-chip h-14 w-14 shrink-0 bg-orange-500 text-white">
              <ClipboardList className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-orange-900">Sharhlarni moderatsiya</h2>
              <p className="text-sm text-orange-700">Kutayotgan, shikoyat qilingan va rad etilgan sharhlar</p>
            </div>
            <NavBadge count={stats?.pendingReviews} className="bg-orange-600" />
          </Link>

          <Link
            href="/admin/institutions"
            className="relative flex items-center gap-4 rounded-2xl border border-primary-200 bg-primary-50 p-6 transition-colors hover:border-primary-400"
          >
            <span className="icon-chip h-14 w-14 shrink-0 bg-primary-600 text-white">
              <School className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-primary-900">Muassasalar boshqaruvi</h2>
              <p className="text-sm text-primary-700">Qo&apos;shish, tahrirlash, o&apos;chirish, status o&apos;zgartirish</p>
            </div>
            <NavBadge count={stats?.pendingInstitutions} className="bg-primary-600" />
          </Link>

          <Link
            href="/admin/trial-bookings"
            className="relative flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 transition-colors hover:border-emerald-400"
          >
            <span className="icon-chip h-14 w-14 shrink-0 bg-emerald-600 text-white">
              <CalendarCheck className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-emerald-900">Probnoy dars bronlari</h2>
              <p className="text-sm text-emerald-700">Bepul probnoy darsga yozilgan so&apos;rovlar</p>
            </div>
            <NavBadge count={stats?.pendingBookings} className="bg-emerald-600" />
          </Link>

          {user.role === 'SUPER_ADMIN' && (
            <Link
              href="/admin/super"
              className="flex items-center gap-4 rounded-2xl border border-purple-200 bg-purple-50 p-6 transition-colors hover:border-purple-400 sm:col-span-2"
            >
              <span className="icon-chip h-14 w-14 shrink-0 bg-purple-600 text-white">
                <Crown className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-purple-900">Super Admin boshqaruvi</h2>
                <p className="text-sm text-purple-700">Adminlarni tayinlash, ruxsatlarni sozlash, barcha foydalanuvchilarni ko&apos;rish</p>
              </div>
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}

/** Yuqoridagi tezkor statistika kartochkasi — yuklanayotganda pulse skeleton ko'rsatadi */
function StatTile({ Icon, label, value, accent, urgent }: {
  Icon: LucideIcon
  label: string
  value?: number
  accent: string
  urgent?: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <span className={`icon-chip mb-2 h-9 w-9 ${accent}`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      {value === undefined ? (
        <div className="h-7 w-12 animate-pulse rounded-md bg-gray-100" />
      ) : (
        <p className={`text-2xl font-bold ${urgent ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
      )}
      <p className="mt-0.5 text-xs font-medium text-gray-500">{label}</p>
    </div>
  )
}

/** Nav kartochkasining yuqori o'ng burchagidagi kutayotgan son belgisi — 0/aniqlanmagan bo'lsa ko'rsatilmaydi */
function NavBadge({ count, className }: { count?: number; className: string }) {
  if (!count) return null
  return (
    <span className={`absolute right-4 top-4 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
