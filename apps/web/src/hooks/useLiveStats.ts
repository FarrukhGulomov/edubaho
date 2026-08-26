'use client'

import { useEffect, useState } from 'react'
import { sendHeartbeat } from '@/lib/analytics'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
const HEARTBEAT_INTERVAL = 45_000
const REFRESH_INTERVAL = 30_000

export interface LiveStats {
  online: number
  totalVisitors: number
}

/**
 * Haqiqiy "hozir onlayn" va "jami tashrif buyuruvchilar" sonini qaytaradi.
 * Ikkalasi ham server'dan (Redis) — soxta/tasodifiy son EMAS.
 *
 * Bu hook chaqirilgan joy avtomatik ravishda o'zining heartbeat'ini ham
 * yuboradi (mount bo'lganda + har 45s), shuning uchun sahifa shu hook'ni
 * ishlatishi bilanoq o'sha foydalanuvchi "onlayn" hisobiga kiradi.
 */
export function useLiveStats(): LiveStats | null {
  const [stats, setStats] = useState<LiveStats | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const res = await fetch(`${API}/stats/live`, {
          headers: { 'ngrok-skip-browser-warning': '1' },
        })
        if (!res.ok) return
        const data = (await res.json()) as LiveStats
        if (!cancelled) setStats(data)
      } catch { /* jim tarzda o'tkazib yuboramiz */ }
    }

    // Birinchi statistikani so'rashdan OLDIN heartbeat javobini kutamiz —
    // aks holda shu sessiyaning o'zi hali "onlayn" hisobiga kirmagan holda
    // birinchi son ko'rsatilib, chalkash (kamroq) taassurot qoldiradi
    sendHeartbeat().then(fetchStats)
    const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
    const refreshTimer = setInterval(fetchStats, REFRESH_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(heartbeatTimer)
      clearInterval(refreshTimer)
    }
  }, [])

  return stats
}
