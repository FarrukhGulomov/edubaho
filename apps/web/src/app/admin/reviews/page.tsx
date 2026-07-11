'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Lock, Ban, GraduationCap, RefreshCw, Clock, Flag, X, CheckCircle2,
  User, School,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface PendingReview {
  id: string
  status: string
  overallRating: number
  title?: string
  body: string
  isAnonymous: boolean
  createdAt: string
  user?: { name?: string; phone?: string }
  institution?: { nameUz: string; slug: string; type: string }
}

const STAR = ['', '★', '★★', '★★★', '★★★★', '★★★★★']
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  FLAGGED: 'bg-red-100 text-red-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-100 text-gray-600',
}

export default function AdminReviewsPage() {
  const { user, loading } = useAuth()
  const [reviews, setReviews] = useState<PendingReview[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [status, setStatus] = useState<'PENDING' | 'FLAGGED' | 'REJECTED'>('PENDING')
  const [fetching, setFetching] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const fetchReviews = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setFetching(true)
    try {
      const res = await fetch(`${API}/admin/reviews/pending?status=${status}&limit=20`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      if (!res.ok) return
      const data = await res.json()
      setReviews(data.data ?? [])
      setMeta(data.meta ?? { total: 0, page: 1, totalPages: 1 })
    } finally {
      setFetching(false)
    }
  }, [status])

  useEffect(() => {
    if (user) fetchReviews()
  }, [user, fetchReviews])

  async function handleAction(id: string, action: 'approve' | 'reject') {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setActionId(id)
    try {
      const res = await fetch(`${API}/admin/reviews/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' ? { reason: 'Moderatsiya' } : {}),
      })
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id))
        setMeta((m) => ({ ...m, total: m.total - 1 }))
        setToast(action === 'approve' ? 'Sharh tasdiqlandi' : 'Sharh rad etildi')
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ruxsat yo'q</h1>
          <p className="text-gray-500 mb-4">Bu sahifa faqat moderatorlar uchun</p>
          <Link href="/" className="text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Toast */}
        {toast && (
          <div className="mb-4 rounded-2xl bg-green-50 border border-green-200 px-5 py-3 text-green-800 font-medium">
            {toast}
          </div>
        )}

        {/* Title + stats */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sharhlarni moderatsiya qilish</h1>
            <p className="text-gray-500 mt-1">Ko'rib chiqish kerak: <strong>{meta.total} ta sharh</strong></p>
          </div>
          <button
            onClick={fetchReviews}
            disabled={fetching}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${fetching ? 'animate-spin' : ''}`} strokeWidth={1.75} /> Yangilash
          </button>
        </div>

        {/* Status tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {([
            { key: 'PENDING' as const, Icon: Clock, label: 'Kutayotgan' },
            { key: 'FLAGGED' as const, Icon: Flag, label: 'Shikoyat' },
            { key: 'REJECTED' as const, Icon: X, label: 'Rad etilgan' },
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

        {/* Reviews list */}
        {fetching ? (
          <div className="py-20 text-center text-gray-400">Yuklanmoqda...</div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mb-3 flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-semibold text-gray-600">Barcha sharhlar ko'rib chiqildi!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-gray-300">
                {/* Top row */}
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[review.status]}`}>
                        {review.status}
                      </span>
                      <span className="text-yellow-500 font-bold">{STAR[review.overallRating]}</span>
                      <span className="text-sm text-gray-500">{review.overallRating}/5</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                        {review.isAnonymous ? 'Anonim' : (review.user?.name ?? review.user?.phone ?? 'Noma\'lum')}
                      </span>
                      <span>•</span>
                      <span>{new Date(review.createdAt).toLocaleDateString('uz-UZ')}</span>
                    </div>
                  </div>
                  {review.institution && (
                    <Link
                      href={`/institutions/${review.institution.slug}`}
                      target="_blank"
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:border-primary-200 hover:bg-primary-100"
                    >
                      <School className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {review.institution.nameUz} →
                    </Link>
                  )}
                </div>

                {/* Content */}
                {review.title && (
                  <p className="mb-2 font-bold text-gray-900">{review.title}</p>
                )}
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{review.body}</p>

                {/* Actions */}
                {review.status === 'PENDING' || review.status === 'FLAGGED' ? (
                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => handleAction(review.id, 'approve')}
                      disabled={actionId === review.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionId === review.id ? '...' : <><CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Tasdiqlash</>}
                    </button>
                    <button
                      onClick={() => handleAction(review.id, 'reject')}
                      disabled={actionId === review.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-base font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                    >
                      {actionId === review.id ? '...' : <><X className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Rad etish</>}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 text-center text-sm text-gray-400">
                    Bu sharh allaqachon {review.status === 'APPROVED' ? 'tasdiqlangan' : 'rad etilgan'}
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
