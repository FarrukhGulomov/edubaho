'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export default function SuperAdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({ totalUsers: 0, totalAdmins: 0 })

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
    ]).then(([usersData, adminsData]) => {
      setStats({
        totalUsers:  usersData.meta?.total  ?? 0,
        totalAdmins: (adminsData.data ?? []).length,
      })
    }).catch(() => {})
  }, [user])

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )

  if (user.role !== 'SUPER_ADMIN') return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4">
      <div>
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Ruxsat yo&apos;q</h1>
        <p className="text-gray-500 mb-4">Bu sahifa faqat super adminlar uchun</p>
        <Link href="/" className="text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-bold text-primary-600">🎓 EduReyting</Link>
            <span className="text-gray-300">›</span>
            <Link href="/admin" className="text-gray-500 hover:text-gray-700">Admin</Link>
            <span className="text-gray-300">›</span>
            <span className="font-semibold text-gray-700">Super Admin</span>
          </div>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-700">👑 SUPER_ADMIN</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-1 text-3xl font-black text-gray-900">👑 Super Admin panel</h1>
        <p className="mb-8 text-gray-500">Xush kelibsiz, {user.name ?? user.phone}!</p>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Jami foydalanuvchilar</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{stats.totalUsers.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Adminlar soni</p>
            <p className="mt-1 text-3xl font-black text-purple-700">{stats.totalAdmins}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/super/admins"
            className="flex items-center gap-4 rounded-2xl border-2 border-purple-200 bg-purple-50 p-6 hover:border-purple-400 hover:shadow-md transition-all"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-3xl text-white">🛡️</span>
            <div>
              <h2 className="text-lg font-bold text-purple-900">Adminlarni boshqarish</h2>
              <p className="text-sm text-purple-700">Tayinlash, ruxsatlarni sozlash, bekor qilish</p>
            </div>
          </Link>

          <Link
            href="/admin/super/users"
            className="flex items-center gap-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white">👥</span>
            <div>
              <h2 className="text-lg font-bold text-blue-900">Barcha foydalanuvchilar</h2>
              <p className="text-sm text-blue-700">Ko&apos;rish, aktiv/deaktiv qilish, o&apos;chirish</p>
            </div>
          </Link>

          <Link
            href="/admin/super/analytics"
            className="flex items-center gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 hover:border-emerald-400 hover:shadow-md transition-all"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-3xl text-white">📊</span>
            <div>
              <h2 className="text-lg font-bold text-emerald-900">Lead Analytics</h2>
              <p className="text-sm text-emerald-700">Funnel, lidlar, sessiya tarixi, konversiya</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
