'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api'

export interface AuthUser {
  id: string
  phone?: string | null
  name?: string
  role: string
  avatar?: string
  // null/undefined — "Mos Edu'ni top" onboarding'ni hali ko'rmagan
  matchOnboardingCompletedAt?: string | null
  // Telefon Telegram bot orqali (request_contact) tasdiqlangan vaqt —
  // null bo'lsa referral bonusi hali faollashmaydi (referralService.ts)
  phoneVerifiedAt?: string | null
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function loadUser() {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setLoading(false)
        return
      }
      authApi
        .me(token)
        .then((data: unknown) => {
          const d = data as { data?: AuthUser } & AuthUser
          setUser(d.data ?? d)
        })
        .catch((err: unknown) => {
          // Faqat 401 (token noto'g'ri) bo'lsa o'chirish — network/ngrok xatolikda o'chirmaymiz
          const status = (err as { status?: number })?.status
          if (status === 401 || status === 403) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
          }
        })
        .finally(() => setLoading(false))
    }

    loadUser()

    // Telegram Mini App avtomatik kirishi tugaganda holatni yangilash
    window.addEventListener('twa-auth', loadUser)
    return () => window.removeEventListener('twa-auth', loadUser)
  }, [])

  // Access token 15 daqiqada eskiradi — uzoq forma to'ldirilayotganda
  // (masalan admin muassasa ma'lumotlarini kiritayotganda) token eskirib,
  // "Saqlash"da "Tizimga qayta kiring" xatosi bilan yozilgan ma'lumot
  // yo'qolib qolmasligi uchun fonda muntazam (5 daqiqada) jim ravishda
  // yangilab turamiz — refresh token httpOnly cookie'da, foydalanuvchi
  // sahifani ochiq qoldirsa hech qachon "eskirmaydi"
  useEffect(() => {
    const REFRESH_INTERVAL = 5 * 60 * 1000
    const timer = setInterval(() => {
      if (!localStorage.getItem('accessToken')) return
      authApi.refresh()
        .then((data: unknown) => {
          const token = (data as { accessToken?: string })?.accessToken
          if (token) localStorage.setItem('accessToken', token)
        })
        .catch(() => { /* refresh token ham eskirgan bo'lsa — jim o'tkazamiz, keyingi haqiqiy so'rov 401 qaytaradi */ })
    }, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  function logout() {
    const token = localStorage.getItem('accessToken')
    if (token) authApi.logout(token).catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    window.location.href = '/'
  }

  return { user, loading, logout, setUser }
}
