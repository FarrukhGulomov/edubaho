'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [verifying, setVerifying] = useState(true)

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
          <div className="flex items-center gap-3">
            <Link href="/" className="font-bold text-primary-600">🎓 EduReyting</Link>
            <span className="text-gray-300">›</span>
            <span className="font-semibold text-gray-700">Admin panel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${
              user.role === 'SUPER_ADMIN'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {user.role === 'SUPER_ADMIN' ? '👑' : '🛡️'} {user.role}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-black text-gray-900">🛡️ Admin panel</h1>
        <p className="mb-8 text-gray-500">Xush kelibsiz, {user.name ?? user.phone}!</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/reviews"
            className="flex items-center gap-4 rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 hover:border-orange-400 hover:shadow-md transition-all"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-3xl text-white">📋</span>
            <div>
              <h2 className="text-lg font-bold text-orange-900">Sharhlarni moderatsiya</h2>
              <p className="text-sm text-orange-700">Kutayotgan, shikoyat qilingan va rad etilgan sharhlar</p>
            </div>
          </Link>

          <Link
            href="/admin/institutions"
            className="flex items-center gap-4 rounded-2xl border-2 border-primary-200 bg-primary-50 p-6 hover:border-primary-400 hover:shadow-md transition-all"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-3xl text-white">🏫</span>
            <div>
              <h2 className="text-lg font-bold text-primary-900">Muassasalar boshqaruvi</h2>
              <p className="text-sm text-primary-700">Qo&apos;shish, tahrirlash, o&apos;chirish, status o&apos;zgartirish</p>
            </div>
          </Link>

          {user.role === 'SUPER_ADMIN' && (
            <Link
              href="/admin/super"
              className="flex items-center gap-4 rounded-2xl border-2 border-purple-200 bg-purple-50 p-6 hover:border-purple-400 hover:shadow-md transition-all sm:col-span-2"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-3xl text-white">👑</span>
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
