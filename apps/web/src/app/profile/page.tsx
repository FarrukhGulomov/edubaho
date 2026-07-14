'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bookmark, Scale, PencilLine, ShieldCheck, LogOut, Edit2, Check,
  AlertCircle, CheckCircle2, Search, Laptop, GraduationCap, ArrowRight,
  Send, MessageCircle, User, Calendar, Star,
} from 'lucide-react'
import StarRating from '@/components/shared/StarRating'
import TypeIcon from '@/components/shared/TypeIcon'
import Header from '@/components/shared/Header'
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

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",      ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',       ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',       ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',       ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet',  ru: 'Университет' },
  COURSE_CENTER:   { uz: 'Kurs',         ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi',  ru: 'Языковой' },
  IT_SCHOOL:       { uz: 'IT maktab',    ru: 'IT школа' },
  TUTORING:        { uz: 'Repetitor',    ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport',        ru: 'Спорт' },
  ARTS_SCHOOL:     { uz: "San'at",       ru: 'Искусство' },
}

const STATUS_CONFIG: Record<string, { cls: string; label: { uz: string; ru: string } }> = {
  PENDING:  { cls: 'bg-amber-50  text-amber-700  dark:bg-amber-500/10  dark:text-amber-400',  label: { uz: "Ko'rib chiqilmoqda", ru: 'На проверке' } },
  APPROVED: { cls: 'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400', label: { uz: 'Tasdiqlangan',       ru: 'Одобрено' } },
  REJECTED: { cls: 'bg-surface-2 text-mute',                                                  label: { uz: 'Rad etilgan',        ru: 'Отклонено' } },
  FLAGGED:  { cls: 'bg-red-50    text-red-700    dark:bg-red-500/10    dark:text-red-400',    label: { uz: 'Shikoyat',           ru: 'Жалоба' } },
}

function fmtUzs(n?: number) {
  if (!n) return null
  return `${n.toLocaleString('uz-UZ').replace(/,/g, ' ')} so'm`
}

export default function ProfilePage() {
  const { user, loading, logout, setUser } = useAuth()
  const router = useRouter()
  const { lang } = useLang()
  const { saved, toggleSave } = useSaved()
  const { items: compareItems } = useCompare()

  const [name, setName]           = useState('')
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveOk, setSaveOk]       = useState(false)
  const [saveErr, setSaveErr]     = useState('')
  const [reviews, setReviews]     = useState<MyReview[]>([])
  const [revLoading, setRevLoading] = useState(false)

  const uz = lang === 'uz'
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [loading, user, router])

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user])

  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setRevLoading(true)
    fetch(`${API}/reviews/me`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
    })
      .then(r => r.json())
      .then(d => setReviews(d.data ?? []))
      .catch(() => {})
      .finally(() => setRevLoading(false))
  }, [user, API])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveErr('')
    try {
      const token = localStorage.getItem('accessToken')!
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUser(data.data)
      setEditing(false)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch {
      setSaveErr(uz ? "Saqlashda xatolik. Qayta urinib ko'ring." : 'Ошибка при сохранении. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <Header />
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
      </div>
    </div>
  )

  if (!user) return null

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.phone ?? '').slice(-2)

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(user.role)

  const quickLinks = [
    { href: '/search',                 Icon: Search,        uz: 'Qidiruv',         ru: 'Поиск' },
    { href: '/search?type=IT_SCHOOL',  Icon: Laptop,        uz: 'IT maktablar',    ru: 'IT школы' },
    { href: '/search?type=UNIVERSITY', Icon: GraduationCap, uz: 'Universitetlar',  ru: 'Университeтlar' },
    { href: 'https://t.me/edureyting', Icon: Send,          uz: 'Telegram kanal',  ru: 'Telegram канал' },
  ]

  const adminLinks = [
    { href: '/admin/reviews',          uz: 'Sharhlar',         ru: 'Отзывы' },
    { href: '/admin/institutions',     uz: 'Muassasalar',      ru: 'Учреждения' },
    { href: '/admin/institutions/new', uz: "Yangi qo'shish",   ru: 'Добавить' },
    { href: '/admin',                  uz: 'Bosh panel',       ru: 'Главная' },
  ]

  return (
    <div className="min-h-dvh bg-canvas">
      <Header />

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-8">

        {/* Profile card */}
        <div className="card overflow-hidden p-0">
          <div className="h-20 bg-gradient-to-r from-primary-700 to-primary-500" />
          <div className="px-6 pb-6">
            <div className="-mt-10 mb-4 flex items-end justify-between">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-black text-white shadow-pop ring-4 ring-surface">
                {initials}
              </div>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary btn-sm"
                  aria-label={uz ? 'Profilni tahrirlash' : 'Редактировать профиль'}
                >
                  <Edit2 className="h-3.5 w-3.5" aria-hidden />
                  {uz ? 'Tahrirlash' : 'Изменить'}
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSaveName} className="mb-4 space-y-3">
                <div>
                  <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-ink">
                    {uz ? 'Ism va familiya' : 'Имя и фамилия'}
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={uz ? 'Masalan: Alisher Ergashev' : 'Например: Алишер Эргашев'}
                    autoFocus
                    className="input"
                  />
                </div>
                {saveErr && (
                  <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                    {saveErr}
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="submit" disabled={saving || !name.trim()} className="btn-primary flex-1">
                    {saving ? (uz ? 'Saqlanmoqda...' : 'Сохранение...') : (uz ? 'Saqlash' : 'Сохранить')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setName(user.name ?? '') }}
                    className="btn-secondary"
                  >
                    {uz ? 'Bekor' : 'Отмена'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-ink">
                  {user.name ?? <span className="italic text-faint">{uz ? 'Ism kiritilmagan' : 'Имя не указано'}</span>}
                </h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-mute">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  {user.phone}
                </p>
              </div>
            )}

            {saveOk && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700 dark:bg-accent-500/10 dark:text-accent-400">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {uz ? 'Ism muvaffaqiyatli saqlandi!' : 'Имя успешно сохранено!'}
              </div>
            )}

            {/* Stats */}
            <dl className="mt-5 grid grid-cols-3 gap-3">
              {[
                { Icon: Bookmark, value: saved.length,       label: { uz: 'Saqlangan',     ru: 'Сохранено' } },
                { Icon: Scale,    value: compareItems.length, label: { uz: 'Solishtirish',  ru: 'Сравнение' } },
                { Icon: PencilLine, value: reviews.length,   label: { uz: 'Sharhlar',      ru: 'Отзывов' } },
              ].map(s => (
                <div key={s.label.uz} className="flex flex-col items-center gap-1 rounded-xl bg-canvas px-3 py-3 text-center">
                  <s.Icon className="h-4 w-4 text-mute" aria-hidden />
                  <span className="text-xl font-bold tabular-nums text-primary-600">{s.value}</span>
                  <span className="text-xs text-faint">{uz ? s.label.uz : s.label.ru}</span>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Admin panel */}
        {isAdmin && (
          <div className="card border-red-200 bg-red-50/50 p-6 dark:border-red-500/20 dark:bg-red-500/5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600">
                <ShieldCheck className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-red-900 dark:text-red-300">
                  {uz ? 'Admin paneli' : 'Панель администратора'}
                </h2>
                <p className="text-xs text-red-600 dark:text-red-400">{user.role}</p>
              </div>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {adminLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2.5 text-sm font-medium text-red-800 transition-colors hover:bg-white/80 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                >
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  {uz ? link.uz : link.ru}
                </Link>
              ))}
            </div>
            <Link href="/admin" className="block w-full rounded-lg bg-red-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-red-700">
              {uz ? 'Admin panelni ochish' : 'Открыть панель администратора'}
            </Link>
          </div>
        )}

        {/* Compare list */}
        {compareItems.length >= 2 && (
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Scale className="h-4 w-4 text-primary-600" aria-hidden />
                {uz ? "Solishtirish ro'yxati" : 'Список сравнения'}
              </h2>
              <span className="badge tabular-nums">{compareItems.length}</span>
            </div>
            <div className="mb-3 space-y-1.5">
              {compareItems.map(item => (
                <div key={item.id} className="flex items-center gap-2.5 rounded-lg bg-canvas px-3 py-2">
                  <TypeIcon type={item.type} className="h-4 w-4 shrink-0 text-mute" />
                  <span className="line-clamp-1 text-sm font-medium text-ink">{item.nameUz}</span>
                </div>
              ))}
            </div>
            <Link
              href={`/compare?ids=${compareItems.map(i => i.id).join(',')}`}
              className="btn-primary w-full"
            >
              <Scale className="h-4 w-4" aria-hidden />
              {uz ? "Solishtirishni ko'rish" : 'Смотреть сравнение'}
            </Link>
          </div>
        )}

        {/* Saved */}
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Bookmark className="h-4 w-4 text-amber-500" aria-hidden />
              {uz ? 'Saqlangan muassasalar' : 'Сохранённые учреждения'}
            </h2>
            {saved.length > 0 && <span className="badge tabular-nums">{saved.length}</span>}
          </div>

          {saved.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10">
                <Bookmark className="h-7 w-7 text-amber-400" aria-hidden />
              </div>
              <h3 className="mb-1 text-sm font-bold text-ink">
                {uz ? "Hali saqlangan muassasa yo'q" : 'Нет сохранённых учреждений'}
              </h3>
              <p className="mb-5 text-xs leading-relaxed text-mute">
                {uz ? "Qidiruv sahifasida muassasa kartochkasidagi belgini bosing" : 'Нажмите на закладку на карточке учреждения'}
              </p>
              <Link href="/search" className="btn-secondary btn-sm">
                <Search className="h-3.5 w-3.5" aria-hidden />
                {uz ? "Muassasalarni ko'rish" : 'Смотреть учреждения'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {saved.map(item => {
                const typeLabel = TYPE_LABELS[item.type]
                return (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas">
                      <TypeIcon type={item.type} className="h-5 w-5 text-mute" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/institutions/${item.slug}`}
                        className="block text-sm font-semibold text-ink transition-colors hover:text-primary-600 line-clamp-1"
                      >
                        {item.nameUz}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-faint">
                          {typeLabel ? t(lang, typeLabel) : item.type}
                        </span>
                        {item.avgRating ? (
                          <>
                            <span className="text-line-2">·</span>
                            <div className="flex items-center gap-1">
                              <StarRating rating={item.avgRating} size="sm" />
                              <span className="tabular-nums text-xs font-semibold text-mute">{item.avgRating.toFixed(1)}</span>
                            </div>
                          </>
                        ) : null}
                        {item.pricing?.monthlyMin ? (
                          <span className="price-badge text-xs">{fmtUzs(item.pricing.monthlyMin)}</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSave(item)}
                      aria-label={uz ? "Saqlangandan olib tashlash" : 'Убрать из сохранённых'}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-amber-500 transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10"
                    >
                      <Bookmark className="h-4 w-4 fill-current" aria-hidden />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* My reviews */}
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <PencilLine className="h-4 w-4 text-primary-600" aria-hidden />
              {uz ? 'Mening sharhlarim' : 'Мои отзывы'}
            </h2>
            {reviews.length > 0 && <span className="badge tabular-nums">{reviews.length}</span>}
          </div>

          {revLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-line-2 border-t-primary-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-500/10">
                <PencilLine className="h-7 w-7 text-primary-400" aria-hidden />
              </div>
              <h3 className="mb-1 text-sm font-bold text-ink">
                {uz ? 'Hali sharh yozmadingiz' : 'Вы ещё не писали отзывов'}
              </h3>
              <p className="mb-5 text-xs leading-relaxed text-mute">
                {uz ? "Muassasa sahifasiga kirib boshqalarga yordam bering" : 'Зайдите на страницу учреждения и помогите другим'}
              </p>
              <Link href="/search" className="btn-secondary btn-sm">
                <Search className="h-3.5 w-3.5" aria-hidden />
                {uz ? "Muassasa topish" : 'Найти учреждение'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {reviews.map(review => {
                const st = STATUS_CONFIG[review.status]
                const instName = lang === 'ru' && review.institution?.nameRu
                  ? review.institution.nameRu
                  : review.institution?.nameUz
                return (
                  <div key={review.id} className="px-5 py-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      {review.institution && (
                        <Link
                          href={`/institutions/${review.institution.slug}`}
                          className="flex items-center gap-1.5 text-sm font-semibold text-ink transition-colors hover:text-primary-600 line-clamp-1"
                        >
                          <TypeIcon type={review.institution.type} className="h-3.5 w-3.5 shrink-0 text-mute" />
                          {instName}
                        </Link>
                      )}
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${st?.cls ?? 'bg-surface-2 text-mute'}`}>
                        {st ? t(lang, st.label) : review.status}
                      </span>
                    </div>
                    <StarRating rating={review.overallRating} size="sm" />
                    {review.title && <p className="mt-1.5 text-sm font-semibold text-ink">{review.title}</p>}
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-mute">{review.body}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-faint">
                      <Calendar className="h-3 w-3" aria-hidden />
                      {new Date(review.createdAt).toLocaleDateString(uz ? 'uz-UZ' : 'ru-RU')}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-ink">
            {uz ? 'Tezkor harakatlar' : 'Быстрые действия'}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map(a => (
              <Link
                key={a.href}
                href={a.href}
                target={a.href.startsWith('http') ? '_blank' : undefined}
                rel={a.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas px-4 py-3 text-sm font-medium text-ink transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/20"
              >
                <a.Icon className="h-4 w-4 shrink-0 text-mute" aria-hidden />
                {uz ? a.uz : a.ru}
              </Link>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="btn-ghost w-full border border-line text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {uz ? 'Tizimdan chiqish' : 'Выйти из системы'}
        </button>

        {/* Help */}
        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4 text-center dark:border-primary-500/20 dark:bg-primary-500/5">
          <p className="text-xs font-medium text-primary-700 dark:text-primary-400">
            {uz ? 'Muammo bormi?' : 'Есть проблемы?'}
          </p>
          <a
            href="https://t.me/edureyting"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            @edureyting
          </a>
        </div>

        <div className="h-4" />
      </main>
    </div>
  )
}
