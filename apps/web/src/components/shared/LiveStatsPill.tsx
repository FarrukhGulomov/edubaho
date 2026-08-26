'use client'

import { useLiveStats } from '@/hooks/useLiveStats'
import { useLang } from '@/contexts/LangContext'

function fmtNum(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Sayt faolligini ko'rsatuvchi kichik pill — "N onlayn · M tashrif buyuruvchi".
 * Ikkala son ham useLiveStats() orqali serverdan (Redis) keladi — HAQIQIY
 * qiymatlar, soxta/tasodifiy emas. Loyiha yangi bo'lgani uchun hozircha
 * kichik ko'rinishi mumkin — bu normal, vaqt o'tishi bilan o'sadi.
 */
export default function LiveStatsPill() {
  const { lang } = useLang()
  const uz = lang === 'uz'
  const stats = useLiveStats()

  // Ma'lumot kelmaguncha hech narsa ko'rsatmaymiz — 0 yoki placeholder
  // ko'rsatish keyin "sakrab" o'zgarib, ishonchsiz taassurot qoldiradi
  if (!stats) return null

  return (
    <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-semibold text-emerald-600">{fmtNum(stats.online)}</span>
      <span>{uz ? 'onlayn' : 'онлайн'}</span>
      <span className="text-gray-300">·</span>
      <span className="font-semibold text-gray-900">{fmtNum(stats.totalVisitors)}</span>
      <span>{uz ? 'tashrif buyuruvchi' : 'посетителей'}</span>
    </div>
  )
}
