'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Coins, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLang, t } from '@/contexts/LangContext'

const SEEN_KEY = 'bcn_bonus_intro_seen'

/**
 * Kirgan foydalanuvchiga BilimCoin bonus tizimi haqida QISQACHA
 * bir martalik eslatma (do'st taklif qilish + kurs sotib olishni
 * tasdiqlash orqali bonus yig'ish mumkinligi). Har bir brauzerda
 * faqat bitta marta ko'rsatiladi (yopilgach localStorage'ga belgilanadi).
 */
export default function BonusIntroToast() {
  const { user, loading } = useAuth()
  const { lang } = useLang()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    try {
      if (localStorage.getItem(SEEN_KEY)) return
    } catch {
      return
    }
    // Sahifa/kontent joylashib bo'lgach chiqishi uchun kichik kechikish —
    // login redirect animatsiyasi bilan bir vaqtga to'g'ri kelib qolmasin
    const timer = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(timer)
  }, [user, loading])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // localStorage yo'q bo'lsa (xususiy rejim) — jim o'tkaziladi, faqat shu safar ko'rinadi
    }
  }

  if (!visible) return null

  return (
    <div className="animate-slide-up fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom,0px)+12px)] z-40 mx-auto max-w-sm rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-lg lg:bottom-6 lg:left-auto lg:right-6 lg:inset-x-auto">
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label={t(lang, { uz: 'Yopish', ru: 'Закрыть' })}
      >
        <X className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="icon-chip shrink-0 bg-amber-100 text-amber-600">
          <Coins className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">
            {t(lang, { uz: 'BilimCoin bonus tizimi', ru: 'Бонусная система BilimCoin' })}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            {t(lang, {
              uz: "Do'stlaringizni taklif qiling yoki kurs sotib olganingizni tasdiqlang — BilimCoin (BCN) yig'ib, pulga yechib oling.",
              ru: 'Приглашайте друзей или подтвердите покупку курса — копите BilimCoin (BCN) и выводите деньгами.',
            })}
          </p>
          <Link
            href="/profile"
            onClick={dismiss}
            className="mt-2 inline-block text-xs font-bold text-primary-600 hover:underline"
          >
            {t(lang, { uz: 'Batafsil →', ru: 'Подробнее →' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
