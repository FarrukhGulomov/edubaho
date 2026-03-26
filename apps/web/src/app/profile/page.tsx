'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StarRating from '@/components/shared/StarRating'
import { useAuth } from '@/hooks/useAuth'
import { useSaved, useCompare } from '@/hooks/useCompare'
import { useLang, t } from '@/contexts/LangContext'

interface MyReview {
  id: string
  status: string
  overallRating: number
  title?: string
  body: string
  createdAt: string
  institution?: { nameUz: string; nameRu?: string; slug: string; type: string }
}

const TYPE_ICONS: Record<string, string> = {
  IT_SCHOOL: '💻', UNIVERSITY: '🎓', SCHOOL: '📚', KINDERGARTEN: '🎨',
  LANGUAGE_CENTER: '🌐', COURSE_CENTER: '✏️', SPORTS_SCHOOL: '⚽', LYCEUM: '🏫',
}

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",        ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',         ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',         ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',         ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet',   ru: 'Университет' },
  COURSE_CENTER:   { uz: 'Kurs',          ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi',   ru: 'Языковой центр' },
  IT_SCHOOL:       { uz: 'IT maktab',     ru: 'IT школа' },
  TUTORING:        { uz: 'Repetitor',     ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport',         ru: 'Спортшкола' },
  ARTS_SCHOOL:     { uz: "San'at",        ru: 'Школа искусств' },
}

const REVIEW_STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-100 text-gray-500',
  FLAGGED:  'bg-red-100 text-red-700',
}

const REVIEW_STATUS_LABELS: Record<string, { uz: string; ru: string }> = {
  PENDING:  { uz: '⏳ Kutilmoqda',   ru: '⏳ На модерации' },
  APPROVED: { uz: '✅ Tasdiqlangan', ru: '✅ Одобрено' },
  REJECTED: { uz: '❌ Rad etilgan',  ru: '❌ Отклонено' },
  FLAGGED:  { uz: '🚩 Shikoyat',    ru: '🚩 Жалоба' },
}

const ROLE_LABELS: Record<string, { uz: string; ru: string }> = {
  USER:               { uz: 'Foydalanuvchi',  ru: 'Пользователь' },
  INSTITUTION_OWNER:  { uz: 'Muassasa egasi', ru: 'Владелец' },
  ADMIN:              { uz: 'Administrator',  ru: 'Администратор' },
  MODERATOR:          { uz: 'Moderator',      ru: 'Модератор' },
}

function formatUzs(amount?: number) {
  if (!amount) return null
  return `${amount.toLocaleString('uz-UZ').replace(/,/g, ' ')} so'm`
}

export default function ProfilePage() {
  const { user, loading, logout, setUser } = useAuth()
  const router = useRouter()
  const { lang } = useLang()
  const { saved, toggleSave } = useSaved()
  const { items: compareItems } = useCompare()

  const ui = {
    editName:        { uz: 'Tahrirlash',                            ru: 'Редактировать' },
    namePlaceholder: { uz: 'Ism familiya',                          ru: 'Имя и фамилия' },
    save:            { uz: 'Saqlash',                               ru: 'Сохранить' },
    cancel:          { uz: 'Bekor',                                 ru: 'Отмена' },
    noName:          { uz: 'Ism kiritilmagan',                      ru: 'Имя не указано' },
    saved_:          { uz: 'Saqlangan',                             ru: 'Сохранено' },
    compare_:        { uz: 'Solishtirish',                          ru: 'Сравнение' },
    adminCard:       { uz: 'Admin panel',                           ru: 'Панель админа' },
    adminSub:        { uz: 'Sharhlarni moderatsiya qilish',         ru: 'Модерация отзывов' },
    reviews_:        { uz: 'Sharhlar',                              ru: 'Отзывы' },
    institutions_:   { uz: 'Muassasalar',                           ru: 'Учреждения' },
    addNew:          { uz: "Yangi qo'shish",                        ru: 'Добавить новое' },
    adminHome:       { uz: 'Admin bosh',                            ru: 'Главная' },
    openAdmin:       { uz: 'Admin panelni ochish →',                ru: 'Открыть панель админа →' },
    compareList:     { uz: "⇄ Solishtirish ro'yxati",              ru: '⇄ Список для сравнения' },
    compareBtn:      { uz: "Solishtirishni ko'rish →",              ru: 'Смотреть сравнение →' },
    savedTitle:      { uz: '⭐ Saqlangan muassasalar',              ru: '⭐ Сохранённые учреждения' },
    noSaved:         { uz: "Hali saqlangan muassasa yo'q",          ru: 'Нет сохранённых учреждений' },
    noSavedSub:      { uz: 'Qidiruv sahifasida ☆ tugmasini bosib saqlang', ru: 'Нажмите ☆ на странице поиска' },
    browsBtn:        { uz: "Muassasalarni ko'rish",                 ru: 'Смотреть учреждения' },
    removeSaved:     { uz: 'Saqlangandan olib tashlash',            ru: 'Убрать из сохранённых' },
    myReviews:       { uz: '✍️ Mening sharhlarim',                  ru: '✍️ Мои отзывы' },
    noReviews:       { uz: 'Hali sharh yozmadingiz',                ru: 'Вы ещё не писали отзывов' },
    noReviewsSub:    { uz: 'Muassasa sahifasiga kirib sharh qoldiring', ru: 'Зайдите на страницу учреждения и оставьте отзыв' },
    quickActions:    { uz: 'Tezkor harakatlar',                     ru: 'Быстрые действия' },
    logout:          { uz: 'Tizimdan chiqish',                      ru: 'Выйти из системы' },
    logoutShort:     { uz: 'Chiqish',                               ru: 'Выйти' },
    saveSuccess:     { uz: '✅ Ism muvaffaqiyatli saqlandi!',       ru: '✅ Имя успешно сохранено!' },
    saveErr:         { uz: "Saqlashda xatolik. Qayta urinib ko'ring.", ru: 'Ошибка при сохранении. Попробуйте ещё раз.' },
    loading_:        { uz: 'Yuklanmoqda...',                        ru: 'Загрузка...' },
    support:         { uz: 'Muammo bormi?',                         ru: 'Есть проблемы?' },
    qSearch:         { uz: 'Muassasa qidirish',                     ru: 'Поиск учреждений' },
    qIT:             { uz: 'IT maktablar',                          ru: 'IT школы' },
    qUni:            { uz: 'Universitetlar',                        ru: 'Университеты' },
    qTelegram:       { uz: 'Telegram kanal',                        ru: 'Telegram канал' },
  }

  const [name, setName] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')
  const [myReviews, setMyReviews] = useState<MyReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [loading, user, router])

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user])

  // Foydalanuvchining o'z sharhlarini yuklash
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setReviewsLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/reviews/me`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
    })
      .then((r) => r.json())
      .then((d) => setMyReviews(d.data ?? []))
      .catch(() => {})
      .finally(() => setReviewsLoading(false))
  }, [user])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('accessToken')!
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/auth/profile`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
          body: JSON.stringify({ name }),
        },
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUser(data.data)
      setEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setError(t(lang, ui.saveErr))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-gray-500">{t(lang, ui.loading_)}</p>
        </div>
      </div>
    )
  }
  if (!user) return null

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.phone.slice(-2)

  const roleLabel = ROLE_LABELS[user.role]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary-600">
            <span className="text-xl">🎓</span> EduReyting.uz
          </Link>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            {t(lang, ui.logoutShort)}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">

        {/* Profile card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-600 text-2xl font-black text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <form onSubmit={handleSaveName} className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t(lang, ui.namePlaceholder)}
                    autoFocus
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? '...' : t(lang, ui.save)}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setName(user.name ?? '') }}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-600"
                  >
                    {t(lang, ui.cancel)}
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-lg leading-tight">
                      {user.name ?? t(lang, ui.noName)}
                    </p>
                    <p className="text-sm text-gray-500">{user.phone}</p>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {t(lang, ui.editName)}
                  </button>
                </div>
              )}
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
          </div>

          {saveSuccess && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-sm text-green-700">
              {t(lang, ui.saveSuccess)}
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50 text-center">
            <div className="py-3">
              <p className="text-xl font-black text-primary-600">{saved.length}</p>
              <p className="text-xs text-gray-500">{t(lang, ui.saved_)}</p>
            </div>
            <div className="py-3">
              <p className="text-xl font-black text-primary-600">{compareItems.length}</p>
              <p className="text-xs text-gray-500">{t(lang, ui.compare_)}</p>
            </div>
            <div className="py-3">
              <p className="text-xl font-black text-primary-600">
                {user.role === 'USER' ? '👤' : '⭐'}
              </p>
              <p className="text-xs text-gray-500">
                {roleLabel ? t(lang, roleLabel) : user.role}
              </p>
            </div>
          </div>
        </div>

        {/* Admin panel card — faqat admin/moderator uchun */}
        {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-2xl">
                🛡️
              </span>
              <div>
                <h2 className="font-black text-red-900 text-lg leading-tight">{t(lang, ui.adminCard)}</h2>
                <p className="text-sm text-red-700">{t(lang, ui.adminSub)}</p>
              </div>
              <span className="ml-auto rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">
                {user.role}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Link
                href="/admin/reviews"
                className="flex items-center gap-2 rounded-xl bg-white/60 px-4 py-3 text-sm font-semibold text-red-800 hover:bg-white/80 transition-colors"
              >
                <span>📋</span>
                <span>{t(lang, ui.reviews_)}</span>
              </Link>
              <Link
                href="/admin/institutions"
                className="flex items-center gap-2 rounded-xl bg-white/60 px-4 py-3 text-sm font-semibold text-red-800 hover:bg-white/80 transition-colors"
              >
                <span>🏫</span>
                <span>{t(lang, ui.institutions_)}</span>
              </Link>
              <Link
                href="/admin/institutions/new"
                className="flex items-center gap-2 rounded-xl bg-white/60 px-4 py-3 text-sm font-semibold text-red-800 hover:bg-white/80 transition-colors"
              >
                <span>➕</span>
                <span>{t(lang, ui.addNew)}</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-xl bg-white/60 px-4 py-3 text-sm font-semibold text-red-800 hover:bg-white/80 transition-colors"
              >
                <span>🛡️</span>
                <span>{t(lang, ui.adminHome)}</span>
              </Link>
            </div>
            <Link
              href="/admin"
              className="block w-full rounded-xl bg-red-600 py-3 text-center font-bold text-white hover:bg-red-700 transition-colors"
            >
              🛡️ {t(lang, ui.openAdmin)}
            </Link>
          </div>
        )}

        {/* Compare list */}
        {compareItems.length >= 2 && (
          <div className="rounded-2xl border-2 border-primary-200 bg-primary-50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-primary-800">{t(lang, ui.compareList)}</h2>
              <span className="text-sm text-primary-600">
                {compareItems.length} {lang === 'uz' ? 'ta' : 'шт.'}
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {compareItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-primary-700">
                  <span>{TYPE_ICONS[item.type] ?? '🏫'}</span>
                  <span className="line-clamp-1">{item.nameUz}</span>
                </div>
              ))}
            </div>
            <Link
              href={`/compare?ids=${compareItems.map((i) => i.id).join(',')}`}
              className="block w-full rounded-xl bg-primary-600 py-3 text-center font-bold text-white hover:bg-primary-700 transition-colors"
            >
              {t(lang, ui.compareBtn)}
            </Link>
          </div>
        )}

        {/* Saved institutions */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">{t(lang, ui.savedTitle)}</h2>
            {saved.length > 0 && (
              <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-sm font-semibold text-primary-700">
                {saved.length}
              </span>
            )}
          </div>

          {saved.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mb-3 text-4xl">☆</div>
              <p className="font-medium text-gray-700 mb-1">{t(lang, ui.noSaved)}</p>
              <p className="text-sm text-gray-400 mb-4">{t(lang, ui.noSavedSub)}</p>
              <Link
                href="/search"
                className="inline-block rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                {t(lang, ui.browsBtn)}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {saved.map((item) => {
                const typeLabel = TYPE_LABELS[item.type]
                return (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
                      {TYPE_ICONS[item.type] ?? '🏫'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/institutions/${item.slug}`}
                        className="block font-semibold text-gray-900 hover:text-primary-600 line-clamp-1"
                      >
                        {item.nameUz}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {typeLabel ? t(lang, typeLabel) : item.type}
                        </span>
                        {item.avgRating && (
                          <>
                            <span className="text-gray-200">•</span>
                            <StarRating rating={item.avgRating} size="sm" />
                          </>
                        )}
                        {item.pricing?.monthlyMin && (
                          <>
                            <span className="text-gray-200">•</span>
                            <span className="text-xs text-gray-500">{formatUzs(item.pricing.monthlyMin)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSave(item)}
                      className="shrink-0 rounded-lg p-2 text-yellow-500 hover:bg-yellow-50"
                      title={t(lang, ui.removeSaved)}
                    >
                      ⭐
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Mening sharhlarim */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">{t(lang, ui.myReviews)}</h2>
            {myReviews.length > 0 && (
              <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-sm font-semibold text-primary-700">
                {myReviews.length}
              </span>
            )}
          </div>

          {reviewsLoading ? (
            <div className="px-5 py-8 text-center text-gray-400">{t(lang, ui.loading_)}</div>
          ) : myReviews.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mb-3 text-4xl">✍️</div>
              <p className="font-medium text-gray-700 mb-1">{t(lang, ui.noReviews)}</p>
              <p className="text-sm text-gray-400 mb-4">{t(lang, ui.noReviewsSub)}</p>
              <Link
                href="/search"
                className="inline-block rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                {t(lang, ui.browsBtn)}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myReviews.map((review) => {
                const statusLabel = REVIEW_STATUS_LABELS[review.status]
                const instName = lang === 'ru' && review.institution?.nameRu
                  ? review.institution.nameRu
                  : review.institution?.nameUz
                return (
                  <div key={review.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {review.institution && (
                        <Link
                          href={`/institutions/${review.institution.slug}`}
                          className="font-semibold text-gray-900 hover:text-primary-600 text-sm leading-tight line-clamp-1"
                        >
                          {TYPE_ICONS[review.institution.type] ?? '🏫'} {instName}
                        </Link>
                      )}
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${REVIEW_STATUS_COLORS[review.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel ? t(lang, statusLabel) : review.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < review.overallRating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                      ))}
                    </div>
                    {review.title && <p className="text-sm font-semibold text-gray-800 mb-0.5">{review.title}</p>}
                    <p className="text-sm text-gray-600 line-clamp-2">{review.body}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ')}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-900">{t(lang, ui.quickActions)}</h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { href: '/search',              icon: '🔍', labelKey: 'qSearch' },
              { href: '/search?type=IT_SCHOOL', icon: '💻', labelKey: 'qIT' },
              { href: '/search?type=UNIVERSITY', icon: '🎓', labelKey: 'qUni' },
              { href: 'https://t.me/edureyting', icon: '✈️', labelKey: 'qTelegram' },
            ] as const).map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-100 p-4 text-center hover:border-primary-300 hover:bg-primary-50 transition-all"
              >
                <span className="text-3xl">{action.icon}</span>
                <span className="text-sm font-semibold text-gray-700 leading-tight">
                  {t(lang, ui[action.labelKey])}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full rounded-2xl border border-red-200 bg-white py-4 font-semibold text-red-600 hover:bg-red-50 transition-colors shadow-sm"
        >
          {t(lang, ui.logout)}
        </button>

        <p className="text-center text-xs text-gray-400 pb-2">
          {t(lang, ui.support)}{' '}
          <a href="https://t.me/edureyting" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">
            @edureyting Telegram
          </a>
        </p>
      </main>
    </div>
  )
}
