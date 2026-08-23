'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReceiptText, Search, X, Upload, ImageIcon, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { enrollmentClaimsApi, type EnrollmentClaimItem } from '@/lib/api'
import { formatBcn } from '@/lib/currency'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface InstitutionOption {
  id: string
  nameUz: string
  nameRu?: string
  city?: { nameUz: string; nameRu?: string } | null
}

const STATUS_STYLE: Record<string, { bg: string; Icon: typeof Clock; label: { uz: string; ru: string } }> = {
  PENDING:  { bg: 'bg-amber-50 text-amber-700',    Icon: Clock,       label: { uz: 'Ko\'rib chiqilmoqda', ru: 'На рассмотрении' } },
  APPROVED: { bg: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2, label: { uz: 'Tasdiqlandi', ru: 'Подтверждено' } },
  REJECTED: { bg: 'bg-gray-100 text-gray-500',      Icon: XCircle,     label: { uz: 'Rad etildi', ru: 'Отклонено' } },
}

interface Props {
  token: string
}

/**
 * "Men kurs sotib oldim" — foydalanuvchi o'zi bildirgan enrollment xabari.
 *
 * NEGA KERAK: markazlarga bepul lid beramiz, lekin sotib olgan (enrollment)
 * uchun markazdan to'lov olamiz. Agar buni FAQAT markazning o'z hisobotiga
 * tayansak — markaz kam ko'rsatishi mumkin. Shuning uchun HAQIQIY
 * foydalanuvchining o'zidan so'raymiz, admin tekshiradi, va shundagina
 * bonus + markazga hisob-kitob amalga oshadi.
 */
export default function EnrollmentClaimSection({ token }: Props) {
  const { lang } = useLang()
  const uz = lang === 'uz'

  const [claims, setClaims] = useState<EnrollmentClaimItem[]>([])
  const [rewardAmount, setRewardAmount] = useState(10_000)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [open, setOpen] = useState(false)

  // Forma holati
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<InstitutionOption[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<InstitutionOption | null>(null)
  const [courseNote, setCourseNote] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [receiptUploading, setReceiptUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    enrollmentClaimsApi.listMine(token)
      .then((res) => {
        setClaims(res.data)
        setRewardAmount(res.meta.rewardAmount)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  // Muassasa qidiruvi — debounce bilan
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (selected || query.trim().length < 2) {
      setOptions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`${API}/institutions?q=${encodeURIComponent(query.trim())}&limit=6`, {
          headers: { 'ngrok-skip-browser-warning': '1' },
        })
        const data = await res.json()
        setOptions((data.data ?? []) as InstitutionOption[])
      } catch {
        setOptions([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, selected])

  async function handleReceiptUpload(file: File | null) {
    if (!file) return
    setReceiptUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(`${API}/enrollment-claims/receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Fayl yuklashda xatolik")
      setReceiptUrl(data.data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fayl yuklashda xatolik yuz berdi")
    } finally {
      setReceiptUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!selected) {
      setError(uz ? "Muassasani tanlang" : 'Выберите учреждение')
      return
    }
    setSubmitting(true)
    try {
      const res = await enrollmentClaimsApi.create(token, {
        institutionId: selected.id,
        courseNote: courseNote.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
      })
      setSuccess(res.message)
      setOpen(false)
      setSelected(null)
      setQuery('')
      setCourseNote('')
      setReceiptUrl('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : (uz ? 'Xatolik yuz berdi' : 'Произошла ошибка'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const pendingCount = claims.filter((c) => c.status === 'PENDING').length

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="icon-chip h-11 w-11 bg-emerald-50 text-emerald-600">
          <ReceiptText className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900">
            {uz ? 'Kurs sotib oldingizmi?' : 'Купили курс?'}
          </h2>
          <p className="text-sm text-gray-500">
            {uz
              ? `Xabar bering va tasdiqlangach ${formatBcn(rewardAmount)} bonus oling`
              : `Сообщите и получите ${formatBcn(rewardAmount)} бонус после подтверждения`}
          </p>
        </div>
      </div>

      {success && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</p>
      )}

      {!open ? (
        <button
          onClick={() => { setOpen(true); setSuccess('') }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-500 bg-white py-2.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-600 hover:text-white"
        >
          <ReceiptText className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {uz ? 'Kurs sotib oldim — xabar berish' : 'Сообщить о покупке курса'}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          {/* Muassasa qidiruv */}
          <div className="relative">
            {selected ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-primary-300 bg-white px-3.5 py-2.5">
                <span className="truncate text-sm font-semibold text-gray-900">
                  {uz ? selected.nameUz : (selected.nameRu ?? selected.nameUz)}
                  {selected.city && <span className="ml-1.5 font-normal text-gray-400">— {selected.city.nameUz}</span>}
                </span>
                <button type="button" onClick={() => setSelected(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={uz ? "Muassasa nomini qidiring..." : 'Найдите учреждение...'}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500"
                  />
                </div>
                {(options.length > 0 || searching) && (
                  <div className="absolute z-10 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {searching && (
                      <p className="px-3.5 py-2.5 text-xs text-gray-400">{uz ? 'Qidirilmoqda...' : 'Поиск...'}</p>
                    )}
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setSelected(opt); setQuery(''); setOptions([]) }}
                        className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left hover:bg-gray-50"
                      >
                        <span className="text-sm font-medium text-gray-900">{uz ? opt.nameUz : (opt.nameRu ?? opt.nameUz)}</span>
                        {opt.city && <span className="text-xs text-gray-400">{opt.city.nameUz}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <textarea
            value={courseNote}
            onChange={(e) => setCourseNote(e.target.value)}
            placeholder={uz ? "Qaysi kurs/yo'nalish? (ixtiyoriy)" : 'Какой курс/направление? (необязательно)'}
            maxLength={300}
            rows={2}
            className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500"
          />

          {/* Chek/skrinshot — ixtiyoriy, tasdiqlash ehtimolini oshiradi */}
          <div>
            {receiptUrl ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
                <ImageIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="flex-1">{uz ? 'Chek/skrinshot yuklandi' : 'Чек/скриншот загружен'}</span>
                <button type="button" onClick={() => setReceiptUrl('')} className="text-emerald-600 hover:text-emerald-800">
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-3.5 py-3 text-xs font-medium text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleReceiptUpload(e.target.files?.[0] ?? null)}
                  disabled={receiptUploading}
                />
                {receiptUploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                    {uz ? 'Yuklanmoqda...' : 'Загрузка...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {uz ? "Chek/skrinshot qo'shish (ixtiyoriy, tasdiqlashni tezlashtiradi)" : 'Добавить чек/скриншот (необязательно)'}
                  </>
                )}
              </label>
            )}
          </div>

          {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || receiptUploading}
              className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? (uz ? 'Yuborilmoqda...' : 'Отправка...') : (uz ? 'Yuborish' : 'Отправить')}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(''); setSelected(null); setQuery('') }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              {uz ? 'Bekor qilish' : 'Отмена'}
            </button>
          </div>
        </form>
      )}

      {/* Tarix */}
      {claims.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-semibold text-gray-700"
          >
            <span>
              {uz ? `Xabarlarim (${claims.length})` : `Мои сообщения (${claims.length})`}
              {pendingCount > 0 && (
                <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {pendingCount} {uz ? 'kutilmoqda' : 'в ожидании'}
                </span>
              )}
            </span>
            {showHistory ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {claims.map((c) => {
                const style = STATUS_STYLE[c.status]
                const StatusIcon = style.Icon
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{c.institution.nameUz}</p>
                      {c.courseNote && <p className="truncate text-xs text-gray-500">{c.courseNote}</p>}
                      {c.status === 'REJECTED' && c.reviewNote && (
                        <p className="mt-0.5 text-xs text-red-500">{c.reviewNote}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {c.status === 'APPROVED' && c.reward && (
                        <span className="text-xs font-bold text-emerald-600">+{formatBcn(c.reward.amount)}</span>
                      )}
                      <span className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg}`}>
                        <StatusIcon className="h-3 w-3 shrink-0" strokeWidth={2} />
                        {uz ? style.label.uz : style.label.ru}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
