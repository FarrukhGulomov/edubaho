'use client'

import { useState } from 'react'
import { Star, PencilLine, X, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  institutionId: string
  institutionName: string
}

const STARS = [1, 2, 3, 4, 5] as const

const RATING_LABELS: Record<number, string> = {
  1: 'Juda yomon', 2: 'Yomon', 3: "O'rtacha", 4: 'Yaxshi', 5: 'Ajoyib!',
}

const DIMENSIONS = [
  { key: 'teacherRating',    label: "O'qituvchilar",    hint: 'Tajriba, tushuntirish uslubi' },
  { key: 'facilityRating',   label: 'Sharoit',           hint: 'Sinfxona, jihozlar' },
  { key: 'valueRating',      label: 'Narx/Sifat',        hint: "To'lov oilaga mos kelishi" },
  { key: 'atmosphereRating', label: 'Muhit',             hint: 'Xavfsizlik, intizom' },
  { key: 'serviceRating',    label: 'Aloqa',             hint: "Ota-onaga feedback" },
] as const

type DimensionKey = typeof DIMENSIONS[number]['key']

function MiniStarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div className="flex gap-0.5" role="group">
      {STARS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(value === s ? 0 : s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="rounded p-0.5 transition-transform hover:scale-110 active:scale-95"
          style={{ minHeight: 32, minWidth: 32 }}
          aria-label={`${s} yulduz`}
          aria-pressed={value === s}
        >
          <Star
            className={`h-5 w-5 transition-colors ${s <= active ? 'text-amber-400' : 'text-line-2'}`}
            fill={s <= active ? 'currentColor' : 'none'}
            strokeWidth={s <= active ? 0 : 1.5}
            aria-hidden
          />
        </button>
      ))}
    </div>
  )
}

export default function WriteReview({ institutionId, institutionName }: Props) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [dims, setDims] = useState<Partial<Record<DimensionKey, number>>>({})
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) { setError("Sharh yozish uchun tizimga kiring"); return }
    if (rating === 0) { setError("Iltimos, umumiy baho bering"); return }
    if (body.trim().length < 2) { setError("Sharh kamida 2 ta belgidan iborat bo'lishi kerak"); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': '1',
          },
          body: JSON.stringify({
            institutionId,
            overallRating: rating,
            ...Object.fromEntries(Object.entries(dims).filter(([, v]) => v && v > 0)),
            title: title.trim() || undefined,
            body: body.trim(),
            isAnonymous,
          }),
        },
      )
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Xatolik')
      }
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setOpen(false); setRating(0); setHovered(0); setDims({})
    setTitle(''); setBody(''); setIsAnonymous(false); setError(''); setDone(false)
  }

  if (!token) {
    return (
      <a
        href="/auth"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-2 py-3.5 text-sm font-medium text-mute transition-colors hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400"
      >
        <PencilLine className="h-4 w-4" aria-hidden />
        Sharh yozish uchun kiring
      </a>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 active:scale-[0.98]"
      >
        <PencilLine className="h-4 w-4" aria-hidden />
        Sharh yozish
      </button>
    )
  }

  if (done) {
    return (
      <div className="rounded-xl border border-accent-200 bg-accent-50 p-6 text-center dark:border-accent-500/25 dark:bg-accent-500/10">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-accent-600 dark:text-accent-400" aria-hidden />
        <h3 className="mb-1 text-base font-semibold text-ink">Rahmat!</h3>
        <p className="mb-4 text-sm text-mute">
          Sharhingiz moderatsiyadan o&apos;tgach nashr etiladi (1–2 soat ichida)
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
        >
          Yopish
        </button>
      </div>
    )
  }

  const activeRating = hovered || rating

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink">Sharh yozish</h3>
        <button
          onClick={reset}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
          style={{ minHeight: 0, minWidth: 0 }}
          aria-label="Yopish"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Umumiy baho */}
        <div>
          <p className="mb-2 text-sm font-medium text-ink">
            Umumiy baho <span className="text-red-500" aria-hidden>*</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5" role="group" aria-label="Umumiy baho">
              {STARS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  className="rounded p-0.5 transition-transform hover:scale-110 active:scale-95"
                  style={{ minHeight: 44, minWidth: 36 }}
                  aria-label={`${s} yulduz`}
                  aria-pressed={rating === s}
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${s <= activeRating ? 'text-amber-400' : 'text-line-2'}`}
                    fill={s <= activeRating ? 'currentColor' : 'none'}
                    strokeWidth={s <= activeRating ? 0 : 1.5}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            {activeRating > 0 && (
              <span className="text-sm font-medium text-mute">{RATING_LABELS[activeRating]}</span>
            )}
          </div>
        </div>

        {/* Batafsil mezonlar */}
        <div className="rounded-lg border border-line bg-surface-2 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-faint">
            Batafsil baho <span className="font-normal normal-case text-faint">(ixtiyoriy)</span>
          </p>
          <div className="space-y-3">
            {DIMENSIONS.map(({ key, label, hint }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{label}</p>
                  <p className="text-xs text-faint leading-tight">{hint}</p>
                </div>
                <MiniStarPicker
                  value={dims[key] ?? 0}
                  onChange={(v) => setDims((prev) => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sarlavha */}
        <div>
          <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium text-ink">
            Sarlavha <span className="font-normal text-faint">(ixtiyoriy)</span>
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Ajoyib o'qituvchilar!"
            maxLength={100}
            className="input"
          />
        </div>

        {/* Sharh matni */}
        <div>
          <label htmlFor="review-body" className="mb-1.5 block text-sm font-medium text-ink">
            Sharh matni <span className="text-red-500" aria-hidden>*</span>
          </label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`${institutionName} haqida nima deyish mumkin?`}
            required
            minLength={2}
            maxLength={2000}
            rows={4}
            className="input resize-none"
          />
          <p className={`mt-1 text-right text-xs tabular-nums ${body.length > 1800 ? 'font-medium text-red-500' : 'text-faint'}`}>
            {body.length}/2000
          </p>
        </div>

        {/* Anonim toggle */}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 transition-colors hover:border-line-2">
          <button
            type="button"
            role="switch"
            aria-checked={isAnonymous}
            onClick={() => setIsAnonymous((v) => !v)}
            className={`relative h-5 w-9 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 ${isAnonymous ? 'bg-primary-600' : 'bg-line-2'}`}
            style={{ minHeight: 0, minWidth: 0 }}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-card transition-transform ${isAnonymous ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <div>
            <p className="text-sm font-medium text-ink">Anonim sharh</p>
            <p className="text-xs text-faint">Ismingiz ko&apos;rinmaydi</p>
          </div>
        </label>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || rating === 0 || body.trim().length < 2}
            className="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Yuborilmoqda...' : 'Sharh yuborish'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-line-2 px-4 py-3 text-sm font-medium text-mute transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Bekor
          </button>
        </div>
      </form>
    </div>
  )
}
