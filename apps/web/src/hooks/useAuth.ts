'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api'

export interface AuthUser {
  id: string
  phone?: string | null
  name?: string
  role: string
  avatar?: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
