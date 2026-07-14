'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import {
  Check, X, RefreshCw, ChevronRight, Lock, User, Calendar,
  CheckCircle2, AlertCircle, Clock, Flag,
} from 'lucide-react'
import StarRating from '@/components/shared/StarRating'

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

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  PENDING:  { cls: 'bg-amber-50  text-amber-700  dark:bg-amber-500/10  dark:text-amber-400',  label: 'Kutayotgan' },
  FLAGGED:  { cls: 'bg-red-50    text-red-700    dark:bg-red-500/10    dark:text-red-400',    label: 'Shikoyat' },
  APPROVED: { cls: 'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400', label: 'Tasdiqlangan' },
  REJECTED: { cls: 'bg-surface-2 text-mute',                                                  label: 'Rad etilgan' },
}

const TAB_ICONS = {
  PENDING: Clock,
  FLAGGED: Flag,
  REJECTED: X,
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

  useEffect(() => { if (user) fetchReviews() }, [user, fetchReviews])

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

  if (loading) return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
    </div>
  )

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas text-center">
      <div>
        <Lock className="mx-auto mb-3 h-10 w-10 text-faint" aria-hidden />
        <h1 className="text-base font-bold text-ink">Kirish talab etiladi</h1>
        <Link href="/auth" className="mt-2 inline-block text-sm text-primary-600 hover:underline">Tizimga kirish</Link>
      </div>
    </div>
  )

  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR' && user.role !== 'SUPER_ADMIN') return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas text-center">
      <div>
        <X className="mx-auto mb-3 h-10 w-10 text-faint" aria-hidden />
        <h1 className="text-base font-bold text-ink">Ruxsat yo'q</h1>
        <p className="mt-1 text-sm text-mute">Bu sahifa faqat moderatorlar uchun</p>
        <Link href="/" className="mt-3 inline-block text-sm text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-semibold text-primary-600 hover:text-primary-700">EDUBAHO</Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <Link href="/admin" className="text-mute hover:text-ink">Admin</Link>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden />
            <span className="font-semibold text-ink">Sharhlar</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="btn-ghost btn-sm">
              Orqaga
            </Link>
            <span className="badge bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">{user.role}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Toast */}
        {toast && (
          <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700 dark:border-accent-500/25 dark:bg-accent-500/10 dark:text-accent-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            {toast}
          </div>
        )}

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-ink">Sharhlarni moderatsiya</h1>
            <p className="mt-0.5 text-sm text-mute">
              Ko'rib chiqish kerak: <strong className="text-ink tabular-nums">{meta.total}</strong> ta sharh
            </p>
          </div>
          <button
            onClick={fetchReviews}
            disabled={fetching}
            className="btn-ghost btn-sm"
            aria-label="Yangilash"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fetching ? 'animate-spin' : ''}`} aria-hidden />
            Yangilash
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-0.5">
          {(['PENDING', 'FLAGGED', 'REJECTED'] as const).map((s) => {
            const Icon = TAB_ICONS[s]
            const labels = { PENDING: 'Kutayotgan', FLAGGED: 'Shikoyat', REJECTED: 'Rad etilgan' }
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  status === s ? 'bg-primary-600 text-white shadow-card' : 'bg-surface text-mute hover:text-ink border border-line'
                }`}
                aria-pressed={status === s}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {labels[s]}
              </button>
            )
          })}
        </div>

        {/* List */}
        {fetching ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-accent-400" aria-hidden />
            <p className="text-sm font-semibold text-ink">Barcha sharhlar ko'rib chiqildi!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const st = STATUS_CONFIG[review.status]
              return (
                <article key={review.id} className="card p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st?.cls ?? 'bg-surface-2 text-mute'}`}>
                          {st?.label ?? review.status}
                        </span>
                        <StarRating rating={review.overallRating} size="sm" />
                        <span className="tabular-nums text-xs text-faint">{review.overallRating}/5</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-faint">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" aria-hidden />
                          {review.isAnonymous ? 'Anonim' : (review.user?.name ?? review.user?.phone ?? "Noma'lum")}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" aria-hidden />
                          {new Date(review.createdAt).toLocaleDateString('uz-UZ')}
                        </span>
                      </div>
                    </div>
                    {review.institution && (
                      <Link
                        href={`/institutions/${review.institution.slug}`}
                        target="_blank"
                        className="flex items-center gap-1 rounded-lg border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/25 dark:bg-primary-500/10 dark:text-primary-400"
                      >
                        {review.institution.nameUz}
                        <ChevronRight className="h-3 w-3" aria-hidden />
                      </Link>
                    )}
                  </div>

                  {review.title && <p className="mb-1.5 text-sm font-semibold text-ink">{review.title}</p>}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-mute">{review.body}</p>

                  {(review.status === 'PENDING' || review.status === 'FLAGGED') ? (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleAction(review.id, 'approve')}
                        disabled={actionId === review.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" aria-hidden />
                        {actionId === review.id ? 'Yuklanmoqda...' : 'Tasdiqlash'}
                      </button>
                      <button
                        onClick={() => handleAction(review.id, 'reject')}
                        disabled={actionId === review.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400"
                      >
                        <X className="h-4 w-4" aria-hidden />
                        {actionId === review.id ? '...' : 'Rad etish'}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-center text-xs text-faint">
                      Bu sharh allaqachon {review.status === 'APPROVED' ? 'tasdiqlangan' : 'rad etilgan'}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
