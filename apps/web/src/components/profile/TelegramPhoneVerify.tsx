'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { openExternalLink } from '@/lib/telegram'
import { useLang, t } from '@/contexts/LangContext'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 120_000

interface Props {
  token: string
  onVerified: () => void
}

/**
 * Telefon raqamni Telegram bot orqali (request_contact) TASDIQLASH.
 *
 * Google/Telegram Login Widget hech qachon haqiqiy telefon bermaydi —
 * bu yagona yo'l orqali raqam Telegram tomonidan kafolatlangan bo'ladi
 * (SMS/OTP shartnomasi kerak emas). Referral bonusi FAQAT shu tasdiqdan
 * keyin faollashadi (referralService.ts — "Active User" mezoni).
 */
export default function TelegramPhoneVerify({ token, onVerified }: Props) {
  const { lang } = useLang()
  const uz = lang === 'uz'
  const [status, setStatus] = useState<'idle' | 'waiting' | 'error' | 'timeout'>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    pollRef.current = null
    timeoutRef.current = null
  }

  async function handleStart() {
    setStatus('waiting')
    try {
      const res = await authApi.startTelegramPhoneVerify(token) as { deepLink: string }
      openExternalLink(res.deepLink)

      pollRef.current = setInterval(async () => {
        try {
          const me = await authApi.me(token) as { data?: { phoneVerifiedAt?: string | null } }
          if (me.data?.phoneVerifiedAt) {
            stopPolling()
            setStatus('idle')
            onVerified()
          }
        } catch { /* vaqtinchalik tarmoq xatosi — keyingi urinishda davom etadi */ }
      }, POLL_INTERVAL_MS)

      timeoutRef.current = setTimeout(() => {
        stopPolling()
        setStatus('timeout')
      }, POLL_TIMEOUT_MS)
    } catch {
      setStatus('error')
    }
  }

  if (status === 'waiting') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" strokeWidth={2} />
        <p className="text-sm font-semibold text-blue-800">
          {uz
            ? "Telegram'da tasdiqlashni kutmoqdamiz..."
            : 'Ожидаем подтверждения в Telegram...'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
      <button
        onClick={handleStart}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="icon-chip h-10 w-10 shrink-0 bg-blue-500 text-white">
          <Send className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-blue-900">
            {uz ? 'Telegram orqali tasdiqlash' : 'Подтвердить через Telegram'}
          </span>
          <span className="block text-xs text-blue-700">
            {uz
              ? "SMS shart emas — bot orqali 1 ta bosishda tasdiqlanadi"
              : 'Без SMS — подтверждение в один клик через бота'}
          </span>
        </span>
      </button>

      {status === 'timeout' && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          {uz ? "Vaqt tugadi. Qayta urinib ko'ring." : 'Время истекло. Попробуйте снова.'}
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          {uz ? "Xatolik yuz berdi. Qayta urinib ko'ring." : 'Произошла ошибка. Попробуйте снова.'}
        </p>
      )}
    </div>
  )
}

export function VerifiedBadge({ lang }: { lang: 'uz' | 'ru' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3 w-3 shrink-0" strokeWidth={2.5} />
      {t(lang, { uz: 'Tasdiqlangan', ru: 'Подтверждено' })}
    </span>
  )
}
