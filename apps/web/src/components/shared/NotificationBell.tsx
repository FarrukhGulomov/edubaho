'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLang, t } from '@/contexts/LangContext'
import { notificationsApi, type NotificationItem } from '@/lib/api'

/**
 * Bildirishnomalar qo'ng'irog'i — Header'da (desktop va mobil, bitta
 * komponent ikkalasida ham ishlaydi). Faqat tizimga kirgan foydalanuvchiga
 * ko'rinadi. Ochilganda ro'yxat yuklanadi va barchasi o'qilgan deb belgilanadi.
 */
export default function NotificationBell() {
  const { user } = useAuth()
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    notificationsApi.list(token)
      .then((res) => {
        setItems(res.data)
        setUnreadCount(res.meta.unreadCount)
        setLoaded(true)
      })
      .catch(() => {})
  }, [])

  // Bildirishnoma sonini fon rejimida yangilab turish (yangi BCN xabarini
  // ko'ngil to'lqinsiz sezish uchun) — panel yopiq bo'lsa ham
  useEffect(() => {
    if (!user) return
    load()
    const timer = setInterval(load, 60_000)
    return () => clearInterval(timer)
  }, [user, load])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleToggle() {
    setOpen((v) => !v)
    if (!open && unreadCount > 0) {
      const token = localStorage.getItem('accessToken')
      if (token) {
        notificationsApi.markAllRead(token).catch(() => {})
        setUnreadCount(0)
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      }
    }
  }

  if (!user) return null

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-600"
        aria-label={t(lang, { uz: 'Bildirishnomalar', ru: 'Уведомления' })}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        // Mobilda `absolute right-0` qo'ng'iroq tugmasi ekranning o'ng
        // chetiga yaqin turgani uchun panelni chapga (ekrandan tashqariga)
        // chiqarib yuborardi — shuning uchun mobilda `fixed inset-x-4`
        // (har doim ekran ichida), faqat `sm:` dan boshlab tugma ostiga
        // absolute qilib biriktiriladi
        <div className="animate-slide-down fixed inset-x-4 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96 sm:max-w-sm">
          <div className="sticky top-0 border-b border-gray-100 bg-white px-4 py-3">
            <p className="text-sm font-bold text-gray-900">
              {t(lang, { uz: 'Bildirishnomalar', ru: 'Уведомления' })}
            </p>
          </div>

          {!loaded ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              {t(lang, { uz: 'Hozircha bildirishnoma yo\'q', ru: 'Пока нет уведомлений' })}
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((n) => (
                <div key={n.id} className={`px-4 py-3 ${n.isRead ? '' : 'bg-primary-50/40'}`}>
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-gray-400">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                {t(lang, { uz: 'Barchasi o\'qildi', ru: 'Все прочитано' })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
