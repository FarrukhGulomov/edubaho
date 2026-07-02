'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { isTelegramWebApp, getTWA, initTelegramWebApp, haptic } from '@/lib/telegram'
import { track } from '@/lib/analytics'

/**
 * Telegram Mini App integratsiyasi:
 *
 * 1. Avtomatik kirish — initData backend'da tekshiriladi, foydalanuvchi
 *    HECH NARSA bosmasdan tizimga kiradi (O'zbekiston useri uchun 0 friksiya)
 * 2. ready/expand — to'liq ekran rejimi + brend header rangi
 * 3. Native Back tugmasi — ichki sahifalarda Telegram'ning o'z orqaga tugmasi
 *
 * TWA'dan tashqarida (oddiy brauzer) hech narsa qilmaydi.
 */
export default function TelegramProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const authAttempted = useRef(false)

  // ── 1. Init + avtomatik kirish (bir marta) ──
  useEffect(() => {
    if (!isTelegramWebApp()) return

    initTelegramWebApp()
    document.documentElement.dataset.twa = '1'

    // Token allaqachon bor yoki bu sessiyada urinib bo'lingan — qayta urinmaymiz
    if (authAttempted.current) return
    authAttempted.current = true

    const hasToken = (() => {
      try { return Boolean(localStorage.getItem('accessToken')) } catch { return false }
    })()
    if (hasToken) return

    const initData = getTWA()?.initData
    if (!initData) return

    authApi.telegramWebAppLogin(initData)
      .then((result) => {
        const r = result as { accessToken: string; refreshToken: string; isNewUser: boolean }
        localStorage.setItem('accessToken', r.accessToken)
        localStorage.setItem('refreshToken', r.refreshToken)
        track('auth_completed', { category: 'auth', properties: { method: 'telegram_webapp', isNewUser: r.isNewUser } })
        haptic('success')
        // Sahifadagi komponentlar (Header, GuestGate) yangi tokenni ko'rsin
        router.refresh()
        window.dispatchEvent(new Event('twa-auth'))
      })
      .catch(() => { /* backend sozlanmagan bo'lishi mumkin — mehmon rejimida davom etamiz */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Native Back tugmasi — bosh sahifadan tashqari hamma joyda ──
  useEffect(() => {
    const twa = getTWA()
    if (!twa) return

    const goBack = () => {
      haptic('light')
      if (window.history.length > 1) router.back()
      else router.push('/')
    }

    if (pathname !== '/') {
      twa.BackButton.show()
      twa.BackButton.onClick(goBack)
    } else {
      twa.BackButton.hide()
    }

    return () => { twa.BackButton.offClick(goBack) }
  }, [pathname, router])

  return <>{children}</>
}
