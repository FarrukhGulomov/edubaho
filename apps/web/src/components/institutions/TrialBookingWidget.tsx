'use client'

import { useState } from 'react'
import { CalendarCheck, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { institutionsApi } from '@/lib/api'
import { useLang, t } from '@/contexts/LangContext'

interface Props {
  institutionId: string
  institutionName: string
}

/**
 * UTP#2 — bepul probnoy darsga bron qilish. Login talab qilinmaydi
 * (konversiya to'sig'i bo'lmasin uchun) — faqat ism va telefon yetarli.
 */
export default function TrialBookingWidget({ institutionId, institutionName }: Props) {
  const { lang } = useLang()
  const uz = lang === 'uz'

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+998 ')
  const [preferredTime, setPreferredTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) { setError(uz ? "Ismingizni to'liq kiriting" : 'Введите полное имя'); return }
    if (phone.replace(/\D/g, '').length < 9) { setError(uz ? "Telefon raqamni to'liq kiriting" : 'Введите полный номер телефона'); return }

    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('accessToken')
      await institutionsApi.trialBooking(institutionId, {
        name: name.trim(),
        phone: phone.replace(/\s/g, ''),
        preferredTime: preferredTime.trim() || undefined,
      }, token)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (uz ? 'Xatolik yuz berdi' : 'Произошла ошибка'))
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setOpen(false)
    setName('')
    setPhone('+998 ')
    setPreferredTime('')
    setError('')
    setDone(false)
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="mb-2 flex justify-center">
          <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={1.5} />
        </div>
        <h3 className="mb-1 font-bold text-emerald-800">{uz ? 'Rahmat!' : 'Спасибо!'}</h3>
        <p className="mb-3 text-sm text-emerald-700">
          {uz ? "So'rovingiz qabul qilindi — muassasa siz bilan tez orada bog'lanadi" : 'Ваша заявка принята — учреждение свяжется с вами в ближайшее время'}
        </p>
        <button onClick={reset} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
          {uz ? 'Yopish' : 'Закрыть'}
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 py-3.5 font-semibold text-primary-700 transition-colors hover:bg-primary-100"
      >
        <CalendarCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {uz ? 'Bepul probnoy darsga yozilish' : 'Записаться на бесплатный пробный урок'}
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-primary-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <CalendarCheck className="h-4 w-4 shrink-0 text-primary-500" strokeWidth={1.75} />
          {uz ? 'Probnoy darsga yozilish' : 'Запись на пробный урок'}
        </h3>
        <button onClick={reset} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        {institutionName} — {uz ? "bepul, hech qanday to'lov talab qilinmaydi" : 'бесплатно, оплата не требуется'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">{t(lang, { uz: 'Ismingiz', ru: 'Ваше имя' })} <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={uz ? 'Ismingiz' : 'Ваше имя'}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-primary-400 transition-colors"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">{t(lang, { uz: 'Telefon raqamingiz', ru: 'Ваш номер телефона' })} <span className="text-red-500">*</span></label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              const val = e.target.value
              if (!val.startsWith('+998')) { setPhone('+998 '); return }
              setPhone(val)
            }}
            placeholder="+998 90 123 45 67"
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-primary-400 transition-colors"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            {uz ? 'Afzal ko\'rgan vaqt' : 'Предпочтительное время'} <span className="text-gray-400 font-normal">({uz ? 'ixtiyoriy' : 'необязательно'})</span>
          </label>
          <input
            type="text"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            placeholder={uz ? 'Masalan: Dushanba, 15:00 atrofida' : 'Например: понедельник, около 15:00'}
            maxLength={200}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-primary-400 transition-colors"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? (uz ? 'Yuborilmoqda...' : 'Отправляется...') : (uz ? "So'rov yuborish →" : 'Отправить заявку →')}
        </button>
      </form>
    </div>
  )
}
