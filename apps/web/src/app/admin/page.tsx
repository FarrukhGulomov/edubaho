'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GraduationCap, Crown, ShieldCheck, ClipboardList, School } from 'lucide-react'
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
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold text-primary-600">
              <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={1.75} /> EDUBAHO
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/reviews"
            className="flex items-center gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-6 transition-colors hover:border-orange-400"
          >
            <span className="icon-chip h-14 w-14 shrink-0 bg-orange-500 text-white">
              <ClipboardList className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-orange-900">Sharhlarni moderatsiya</h2>
              <p className="text-sm text-orange-700">Kutayotgan, shikoyat qilingan va rad etilgan sharhlar</p>
            </div>
          </Link>

          <Link
            href="/admin/institutions"
            className="flex items-center gap-4 rounded-2xl border border-primary-200 bg-primary-50 p-6 transition-colors hover:border-primary-400"
          >
            <span className="icon-chip h-14 w-14 shrink-0 bg-primary-600 text-white">
              <School className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-primary-900">Muassasalar boshqaruvi</h2>
              <p className="text-sm text-primary-700">Qo&apos;shish, tahrirlash, o&apos;chirish, status o&apos;zgartirish</p>
            </div>
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
