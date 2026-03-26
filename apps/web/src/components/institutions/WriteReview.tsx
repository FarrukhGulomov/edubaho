'use client'

import { useState } from 'react'

interface Props {
  institutionId: string
  institutionName: string
}

const STARS = [1, 2, 3, 4, 5]

const RATING_LABELS: Record<number, string> = {
  1: 'Juda yomon', 2: 'Yomon', 3: "O'rtacha", 4: 'Yaxshi', 5: 'Ajoyib!',
}

export default function WriteReview({ institutionId, institutionName }: Props) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
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
    if (rating === 0) { setError("Iltimos, baho bering (yulduzchalardan birini tanlang)"); return }
    if (body.trim().length < 2) { setError("Sharh kamida 2 ta belgidan iborat bo'lishi kerak"); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
          body: JSON.stringify({
            institutionId,
            overallRating: rating,
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
    setOpen(false)
    setRating(0)
    setHovered(0)
    setTitle('')
    setBody('')
    setIsAnonymous(false)
    setError('')
    setDone(false)
  }

  // Not logged in
  if (!token) {
    return (
      <a
        href="/auth"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-4 text-sm font-semibold text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
      >
        <span className="text-xl">✏️</span>
        Sharh yozish uchun kiring
      </a>
    )
  }

  // Button to open
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 py-4 font-bold text-white hover:bg-primary-700 transition-colors shadow-sm"
      >
        <span className="text-xl">✏️</span>
        Sharh yozish
      </button>
    )
  }

  // Done state
  if (done) {
    return (
      <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center">
        <div className="mb-3 text-5xl">✅</div>
        <h3 className="mb-2 text-lg font-bold text-green-800">Rahmat!</h3>
        <p className="mb-4 text-sm text-green-700">
          Sharhingiz moderatsiyadan o&apos;tgach nashr etiladi (odatda 1-2 soat ichida)
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-green-600 px-6 py-2.5 font-semibold text-white hover:bg-green-700"
        >
          Yopish
        </button>
      </div>
    )
  }

  const activeRating = hovered || rating

  return (
    <div className="rounded-2xl border-2 border-primary-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">✏️ Sharh yozish</h3>
        <button onClick={reset} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star rating */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">
            Umumiy baho <span className="text-red-500">*</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {STARS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  className={`text-3xl transition-transform hover:scale-110 ${
                    s <= activeRating ? 'text-yellow-400' : 'text-gray-200'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            {activeRating > 0 && (
              <span className="text-sm font-semibold text-gray-600">
                {RATING_LABELS[activeRating]}
              </span>
            )}
          </div>
        </div>

        {/* Title (optional) */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Sarlavha <span className="text-gray-400 font-normal">(ixtiyoriy)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Ajoyib o'qituvchilar!"
            maxLength={100}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {/* Body */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Sharh matni <span className="text-red-500">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`${institutionName} haqida nima deyish mumkin? O'qituvchilar, narx, muhit...`}
            required
            minLength={2}
            maxLength={2000}
            rows={4}
            className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          <p className={`mt-1 text-right text-xs ${body.length > 1800 ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
            {body.length}/2000
          </p>
        </div>

        {/* Anonymous toggle */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50">
          <div
            className={`relative h-6 w-11 rounded-full transition-colors ${isAnonymous ? 'bg-primary-600' : 'bg-gray-200'}`}
            onClick={() => setIsAnonymous((v) => !v)}
          >
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isAnonymous ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Anonim sharh</p>
            <p className="text-xs text-gray-400">Ismingiz ko&apos;rinmaydi</p>
          </div>
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || rating === 0 || body.trim().length < 2}
            className="flex-1 rounded-xl bg-primary-600 py-3 font-bold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Yuborilmoqda...' : 'Sharh yuborish'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-600 hover:bg-gray-50"
          >
            Bekor
          </button>
        </div>
      </form>
    </div>
  )
}
