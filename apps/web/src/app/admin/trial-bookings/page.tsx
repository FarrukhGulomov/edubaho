'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Lock, Ban, GraduationCap, RefreshCw, Clock, CheckCircle2, X,
  Phone, School, CalendarCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface TrialBooking {
  id: string
  name: string
  phone: string
  preferredTime?: string | null
  note?: string | null
  status: string
  createdAt: string
  institution?: { nameUz: string; slug: string }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

export default function AdminTrialBookingsPage() {
  const { user, loading } = useAuth()
  const [bookings, setBookings] = useState<TrialBooking[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [status, setStatus] = useState<'PENDING' | 'CONFIRMED' | 'CANCELLED'>('PENDING')
  const [fetching, setFetching] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const fetchBookings = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setFetching(true)
    try {
      const res = await fetch(`${API}/admin/trial-bookings?status=${status}&limit=20`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      if (!res.ok) return
      const data = await res.json()
      setBookings(data.data ?? [])
      setMeta(data.meta ?? { total: 0, page: 1, totalPages: 1 })
    } finally {
      setFetching(false)
    }
  }, [status])

  useEffect(() => {
    if (user) fetchBookings()
  }, [user, fetchBookings])

  async function handleAction(id: string, next: 'CONFIRMED' | 'CANCELLED') {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setActionId(id)
    try {
      const res = await fetch(`${API}/admin/trial-bookings/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id))
        setMeta((m) => ({ ...m, total: m.total - 1 }))
        setToast(next === 'CONFIRMED' ? 'Bron tasdiqlandi' : 'Bron bekor qilindi')
        setTimeout(() => setToast(''), 3000)
      }
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4">
        <div>
          <div className="mb-4 flex justify-center">
            <Lock className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Kirish talab etiladi</h1>
          <Link href="/auth" className="text-primary-600 hover:underline">Tizimga kirish →</Link>
        </div>
      </div>
    )
  }

  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4">
        <div>
          <div className="mb-4 flex justify-center">
            <Ban className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ruxsat yo&apos;q</h1>
          <p className="text-gray-500 mb-4">Bu sahifa faqat moderatorlar uchun</p>
          <Link href="/" className="text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold text-primary-600">
              <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={1.75} /> EDULA
            </Link>
            <span className="shrink-0 text-gray-300">›</span>
            <span className="truncate font-semibold text-gray-700">Admin panel</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin"
              className="whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              ← Orqaga
            </Link>
            <span className="whitespace-nowrap rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
              {user.role}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {toast && (
          <div className="mb-4 rounded-2xl bg-green-50 border border-green-200 px-5 py-3 text-green-800 font-medium">
            {toast}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <CalendarCheck className="h-6 w-6 shrink-0 text-emerald-600" strokeWidth={1.75} />
              Probnoy dars bronlari
            </h1>
            <p className="text-gray-500 mt-1">Jami: <strong>{meta.total} ta</strong></p>
          </div>
          <button
            onClick={fetchBookings}
            disabled={fetching}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${fetching ? 'animate-spin' : ''}`} strokeWidth={1.75} /> Yangilash
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {([
            { key: 'PENDING' as const, Icon: Clock, label: 'Kutayotgan' },
            { key: 'CONFIRMED' as const, Icon: CheckCircle2, label: 'Tasdiqlangan' },
            { key: 'CANCELLED' as const, Icon: X, label: 'Bekor qilingan' },
          ]).map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                status === key
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {label}
            </button>
          ))}
        </div>

        {fetching ? (
          <div className="py-20 text-center text-gray-400">Yuklanmoqda...</div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mb-3 flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-semibold text-gray-600">Bu bo&apos;limda bron yo&apos;q</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-gray-300">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[booking.status]}`}>
                        {booking.status}
                      </span>
                      <span className="font-bold text-gray-900">{booking.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {booking.phone}
                      </span>
                      <span>•</span>
                      <span>{new Date(booking.createdAt).toLocaleDateString('uz-UZ')}</span>
                    </div>
                  </div>
                  {booking.institution && (
                    <Link
                      href={`/institutions/${booking.institution.slug}`}
                      target="_blank"
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:border-primary-200 hover:bg-primary-100"
                    >
                      <School className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {booking.institution.nameUz} →
                    </Link>
                  )}
                </div>

                {booking.preferredTime && (
                  <p className="text-sm text-gray-600"><strong>Afzal ko&apos;rgan vaqt:</strong> {booking.preferredTime}</p>
                )}
                {booking.note && (
                  <p className="mt-1 text-sm text-gray-600"><strong>Izoh:</strong> {booking.note}</p>
                )}

                {booking.status === 'PENDING' ? (
                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => handleAction(booking.id, 'CONFIRMED')}
                      disabled={actionId === booking.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionId === booking.id ? '...' : <><CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Tasdiqlash</>}
                    </button>
                    <button
                      onClick={() => handleAction(booking.id, 'CANCELLED')}
                      disabled={actionId === booking.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-base font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                    >
                      {actionId === booking.id ? '...' : <><X className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Bekor qilish</>}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 text-center text-sm text-gray-400">
                    Bu bron allaqachon {booking.status === 'CONFIRMED' ? 'tasdiqlangan' : 'bekor qilingan'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
