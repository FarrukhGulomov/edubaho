'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Building2, AlertCircle } from 'lucide-react'
import { institutionsApi } from '@/lib/api'
import { useLang, t } from '@/contexts/LangContext'

interface Props {
  institutionId: string
  // Muassasa allaqachon tasdiqlangan egaga ega bo'lsa kartani ko'rsatmaymiz
  isVerified?: boolean
}

/**
 * "Bu muassasa siznikimi?" — hamkorlar (o'quv markazlari) uchun egalik so'rovi.
 *
 * Korporativ email talab qilinmaydi: foydalanuvchi telefon, Telegram yoki
 * Gmail orqali kirgan bo'lsa yetarli — tasdiqlash moderatsiya orqali bo'ladi.
 */
export default function ClaimInstitution({ institutionId, isVerified }: Props) {
  const { lang } = useLang()
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [position, setPosition] = useState('')
  const [phone, setPhone]       = useState('')
  const [note, setNote]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const ui = {
    title:    { uz: 'Bu muassasa siznikimi?', ru: 'Это ваше заведение?' },
    desc:     {
      uz: "Profilni boshqaring: ma'lumotlarni yangilang, sharhlarga javob bering, statistikani ko'ring. Korporativ email shart emas — telefon raqamingiz yetarli.",
      ru: 'Управляйте профилем: обновляйте данные, отвечайте на отзывы, смотрите статистику. Корпоративная почта не нужна — достаточно номера телефона.',
    },
    cta:      { uz: 'Egalik so\'rovi yuborish', ru: 'Отправить запрос' },
    position: { uz: 'Lavozimingiz (masalan, Direktor)', ru: 'Ваша должность (напр., Директор)' },
    phone:    { uz: 'Aloqa telefoni', ru: 'Контактный телефон' },
    note:     { uz: 'Qo\'shimcha izoh (ixtiyoriy)', ru: 'Дополнительный комментарий (необязательно)' },
    send:     { uz: 'Yuborish', ru: 'Отправить' },
    sending:  { uz: 'Yuborilmoqda...', ru: 'Отправляется...' },
    cancel:   { uz: 'Bekor qilish', ru: 'Отмена' },
    loginFirst: { uz: 'Avval tizimga kiring — telefon, Telegram yoki Gmail orqali', ru: 'Сначала войдите — через телефон, Telegram или Gmail' },
  }

  // Egasi tasdiqlangan muassasada karta ko'rsatilmaydi
  if (isVerified) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await institutionsApi.claim(
        institutionId,
        {
          position: position || undefined,
          contactPhone: phone || undefined,
          note: note || undefined,
        },
        token,
      )
      setSuccess(res.message)
      setOpen(false)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 401) {
        router.push('/auth')
        return
      }
      setError(err instanceof Error ? err.message : t(lang, { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка' }))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/25 dark:bg-emerald-500/10">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" strokeWidth={1.75} />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{success}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-5 dark:border-primary-500/30 dark:bg-primary-500/5">
      <h3 className="mb-1.5 flex items-center gap-2 font-bold text-ink">
        <Building2 className="h-5 w-5 shrink-0 text-primary-500" strokeWidth={1.75} />
        {t(lang, ui.title)}
      </h3>
      <p className="mb-3 text-sm text-mute">{t(lang, ui.desc)}</p>

      {!open ? (
        <button
          onClick={() => {
            const token = localStorage.getItem('accessToken')
            if (!token) { router.push('/auth'); return }
            setOpen(true)
          }}
          className="w-full rounded-xl border border-primary-500 bg-surface py-2.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-600 hover:text-white dark:text-primary-400 dark:hover:text-white"
        >
          {t(lang, ui.cta)}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder={t(lang, ui.position)}
            maxLength={100}
            className="w-full rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-primary-500"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t(lang, ui.phone) + ' (+998...)'}
            maxLength={20}
            className="w-full rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-primary-500"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(lang, ui.note)}
            maxLength={1000}
            rows={2}
            className="w-full rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-primary-500"
          />

          {error && (
            <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? t(lang, ui.sending) : t(lang, ui.send)}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError('') }}
              className="rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm font-semibold text-mute hover:bg-surface-2"
            >
              {t(lang, ui.cancel)}
            </button>
          </div>
        </form>
      )}

      <p className="mt-2.5 text-center text-[11px] text-faint">
        {t(lang, ui.loginFirst)}
      </p>
    </div>
  )
}
