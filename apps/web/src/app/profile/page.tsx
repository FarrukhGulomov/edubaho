'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Pencil, Phone, CheckCircle2, AlertCircle, Star, ArrowLeftRight, PencilLine,
  ShieldCheck, ClipboardList, School, Plus, Search, Laptop, GraduationCap,
  Send, LogOut, MessageCircle, Calendar, Globe2, Palette, Dumbbell, Trophy,
} from 'lucide-react'
import StarRating, { RatingHint } from '@/components/shared/StarRating'
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

const TYPE_ICONS: Record<string, typeof School> = {
  IT_SCHOOL: Laptop, UNIVERSITY: GraduationCap, SCHOOL: School, KINDERGARTEN: Palette,
  LANGUAGE_CENTER: Globe2, COURSE_CENTER: PencilLine, SPORTS_SCHOOL: Dumbbell, LYCEUM: Trophy,
}

const TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  KINDERGARTEN:    { uz: "Bog'cha",      ru: 'Детский сад' },
  SCHOOL:          { uz: 'Maktab',       ru: 'Школа' },
  LYCEUM:          { uz: 'Litsey',       ru: 'Лицей' },
  COLLEGE:         { uz: 'Kollej',       ru: 'Колледж' },
  UNIVERSITY:      { uz: 'Universitet', ru: 'Университет' },
  COURSE_CENTER:   { uz: 'Kurs',        ru: 'Учебный центр' },
  LANGUAGE_CENTER: { uz: 'Til markazi', ru: 'Языковой' },
  IT_SCHOOL:       { uz: 'IT maktab',   ru: 'IT школа' },
  TUTORING:        { uz: 'Repetitor',   ru: 'Репетитор' },
  SPORTS_SCHOOL:   { uz: 'Sport',       ru: 'Спорт' },
  ARTS_SCHOOL:     { uz: "San'at",      ru: 'Искусство' },
}

const STATUS_STYLE: Record<string, { bg: string; label: { uz: string; ru: string } }> = {
  PENDING:  { bg: 'bg-amber-50 text-amber-700',  label: { uz: "Ko'rib chiqilmoqda", ru: 'На проверке' } },
  APPROVED: { bg: 'bg-emerald-50 text-emerald-700', label: { uz: 'Tasdiqlangan',    ru: 'Одобрено' } },
  REJECTED: { bg: 'bg-gray-100 text-gray-600',   label: { uz: 'Rad etilgan',        ru: 'Отклонено' } },
  FLAGGED:  { bg: 'bg-red-50 text-red-700',      label: { uz: 'Shikoyat',           ru: 'Жалоба' } },
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-lg text-gray-500">{uz ? 'Yuklanmoqda...' : 'Загрузка...'}</p>
        </div>
      </div>
    </div>
  )

  if (!user) return null

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.phone ?? '').slice(-2)

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(user.role)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-5">

        {/* ══ Avatar + ism bloki ══════════════════════════════════ */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Rangli banner */}
          <div className="h-20 bg-primary-600" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="-mt-10 mb-4 flex items-end justify-between">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white ring-4 ring-white">
                {initials}
              </div>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-base font-semibold text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-600"
                >
                  <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {uz ? 'Tahrirlash' : 'Изменить'}
                </button>
              )}
            </div>

            {/* Ism tahrirlash */}
            {editing ? (
              <form onSubmit={handleSaveName} className="mb-4 space-y-3">
                <div>
                  <label className="mb-2 block text-base font-bold text-gray-700">
                    {uz ? 'Ism va familiya' : 'Имя и фамилия'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={uz ? 'Masalan: Alisher Ergashev' : 'Например: Алишер Эргашев'}
                    autoFocus
                    className="input"
                  />
                </div>
                {saveErr && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-base text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} /> {saveErr}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="btn-primary flex-1"
                  >
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
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.name ?? <span className="text-gray-400 italic">{uz ? 'Ism kiritilmagan' : 'Имя не указано'}</span>}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-base text-gray-500">
                  <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {user.phone}
                </p>
              </div>
            )}

            {/* Saqlash muvaffaqiyatli xabari */}
            {saveOk && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} /> {uz ? 'Ism muvaffaqiyatli saqlandi!' : 'Имя успешно сохранено!'}
              </div>
            )}

            {/* Statistika */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { value: saved.length,         Icon: Star,           label: { uz: 'Saqlangan',    ru: 'Сохранено' } },
                { value: compareItems.length,  Icon: ArrowLeftRight, label: { uz: 'Solishtirish', ru: 'Сравнение' } },
                { value: reviews.length,       Icon: PencilLine,     label: { uz: 'Sharhlar',     ru: 'Отзывов' } },
              ].map(s => (
                <div key={s.label.uz} className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 py-3 text-center">
                  <s.Icon className="h-5 w-5 text-primary-500" strokeWidth={1.75} />
                  <span className="text-xl font-bold text-primary-600 sm:text-2xl">{s.value}</span>
                  <span className="text-xs font-semibold text-gray-500 sm:text-sm">{uz ? s.label.uz : s.label.ru}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ Admin panel — faqat adminlar uchun ═════════════════ */}
        {isAdmin && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="mb-5 flex items-center gap-4">
              <span className="icon-chip h-14 w-14 shrink-0 bg-red-600 text-white">
                <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-red-900">
                  {uz ? 'Admin paneli' : 'Панель администратора'}
                </h2>
                <p className="text-base text-red-700">
                  {uz ? 'Sharhlar va muassasalarni boshqaring' : 'Управление отзывами и учреждениями'}
                </p>
              </div>
              <span className="ml-auto shrink-0 whitespace-nowrap rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">
                {user.role}
              </span>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              {[
                { href: '/admin/reviews',          Icon: ClipboardList, uz: 'Sharhlar',        ru: 'Отзывы' },
                { href: '/admin/institutions',     Icon: School,        uz: 'Muassasalar',     ru: 'Учреждения' },
                { href: '/admin/institutions/new', Icon: Plus,          uz: "Yangi qo'shish", ru: 'Добавить' },
                { href: '/admin',                  Icon: ShieldCheck,   uz: 'Bosh panel',      ru: 'Главная' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 whitespace-nowrap rounded-xl bg-white/70 px-4 py-3.5 text-base font-semibold text-red-800 transition-colors hover:bg-white"
                >
                  <link.Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                  {uz ? link.uz : link.ru}
                </Link>
              ))}
            </div>
            <Link
              href="/admin"
              className="block w-full rounded-xl bg-red-600 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-red-700"
            >
              {uz ? 'Admin panelni ochish →' : 'Открыть панель администратора →'}
            </Link>
          </div>
        )}

        {/* ══ Solishtirish ro'yxati ════════════════════════════════ */}
        {compareItems.length >= 2 && (
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-primary-900">
                <ArrowLeftRight className="h-5 w-5 shrink-0" strokeWidth={1.75} /> {uz ? "Solishtirish ro'yxati" : 'Список сравнения'}
              </h2>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white">
                {compareItems.length} ta
              </span>
            </div>
            <div className="mb-4 space-y-2.5">
              {compareItems.map(item => {
                const TypeIcon = TYPE_ICONS[item.type] ?? School
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3">
                    <TypeIcon className="h-5 w-5 shrink-0 text-primary-500" strokeWidth={1.75} />
                    <span className="line-clamp-1 text-base font-semibold text-primary-800">{item.nameUz}</span>
                  </div>
                )
              })}
            </div>
            <Link
              href={`/compare?ids=${compareItems.map(i => i.id).join(',')}`}
              className="block w-full rounded-xl bg-primary-600 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-primary-700"
            >
              {uz ? "Solishtirishni ko'rish →" : 'Смотреть сравнение →'}
            </Link>
          </div>
        )}

        {/* ══ Saqlangan muassasalar ═══════════════════════════════ */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Star className="h-5 w-5 shrink-0 text-amber-500" strokeWidth={1.75} /> {uz ? 'Saqlangan muassasalar' : 'Сохранённые учреждения'}
            </h2>
            {saved.length > 0 && (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                {saved.length} ta
              </span>
            )}
          </div>

          {saved.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                <Star className="h-7 w-7 text-amber-400" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-800">
                {uz ? "Hali saqlangan muassasa yo'q" : 'Нет сохранённых учреждений'}
              </h3>
              <p className="mb-6 text-base leading-relaxed text-gray-500">
                {uz
                  ? "Qidiruv sahifasida muassasa kartochkasidagi Saqlash tugmasini bosing"
                  : 'Нажмите «Сохранить» на карточке учреждения на странице поиска'}
              </p>
              <Link href="/search" className="btn-primary inline-flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {uz ? "Muassasalarni ko'rish" : 'Смотреть учреждения'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {saved.map(item => {
                const typeLabel = TYPE_LABELS[item.type]
                const TypeIcon = TYPE_ICONS[item.type] ?? School
                return (
                  <div key={item.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50">
                    <span className="icon-chip h-14 w-14 shrink-0">
                      <TypeIcon className="h-6 w-6" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/institutions/${item.slug}`}
                        className="block line-clamp-1 text-lg font-semibold text-gray-900 transition-colors hover:text-primary-600"
                      >
                        {item.nameUz}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {typeLabel ? t(lang, typeLabel) : item.type}
                        </span>
                        {item.avgRating && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-300">•</span>
                            <RatingHint rating={item.avgRating} lang={lang} />
                          </div>
                        )}
                        {item.pricing?.monthlyMin && (
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                            {fmtUzs(item.pricing.monthlyMin)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSave(item)}
                      title={uz ? "Saqlangandan olib tashlash" : 'Убрать из сохранённых'}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-amber-500 transition-colors hover:bg-amber-50"
                    >
                      <Star className="h-5 w-5" fill="currentColor" strokeWidth={2} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ══ Mening sharhlarim ═══════════════════════════════════ */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <PencilLine className="h-5 w-5 shrink-0 text-primary-500" strokeWidth={1.75} /> {uz ? 'Mening sharhlarim' : 'Мои отзывы'}
            </h2>
            {reviews.length > 0 && (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700">
                {reviews.length} ta
              </span>
            )}
          </div>

          {revLoading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <PencilLine className="h-7 w-7 text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-800">
                {uz ? 'Hali sharh yozmadingiz' : 'Вы ещё не писали отзывов'}
              </h3>
              <p className="mb-6 text-base leading-relaxed text-gray-500">
                {uz
                  ? "Muassasa sahifasiga kirib boshqalarga yordam bering"
                  : 'Зайдите на страницу учреждения и помогите другим'}
              </p>
              <Link href="/search" className="btn-primary inline-flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {uz ? "Muassasa topish" : 'Найти учреждение'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reviews.map(review => {
                const st = STATUS_STYLE[review.status]
                const instName = lang === 'ru' && review.institution?.nameRu
                  ? review.institution.nameRu
                  : review.institution?.nameUz
                return (
                  <div key={review.id} className="px-6 py-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      {review.institution && (
                        <Link
                          href={`/institutions/${review.institution.slug}`}
                          className="line-clamp-1 text-lg font-semibold text-gray-900 transition-colors hover:text-primary-600"
                        >
                          {instName}
                        </Link>
                      )}
                      <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${st?.bg ?? 'bg-gray-100 text-gray-600'}`}>
                        {st ? t(lang, st.label) : review.status}
                      </span>
                    </div>
                    <div className="mb-2 flex items-center gap-1">
                      <StarRating rating={review.overallRating} size="sm" showValue={false} />
                      <span className="ml-1 text-base font-semibold text-gray-700">{review.overallRating}/5</span>
                    </div>
                    {review.title && (
                      <p className="mb-1 text-base font-semibold text-gray-800">{review.title}</p>
                    )}
                    <p className="line-clamp-2 text-base leading-relaxed text-gray-600">{review.body}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
                      <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      {new Date(review.createdAt).toLocaleDateString(uz ? 'uz-UZ' : 'ru-RU')}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ══ Tezkor harakatlar ═══════════════════════════════════ */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">
            {uz ? 'Tezkor harakatlar' : 'Быстрые действия'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/search',                 Icon: Search,        uz: 'Qidiruv',        ru: 'Поиск' },
              { href: '/search?type=IT_SCHOOL',  Icon: Laptop,        uz: 'IT maktablar',   ru: 'IT школы' },
              { href: '/search?type=UNIVERSITY', Icon: GraduationCap, uz: 'Universitetlar', ru: 'Университеты' },
              { href: 'https://t.me/TrustboxInc', Icon: Send,         uz: 'Telegram kanal', ru: 'Telegram канал' },
            ].map(a => (
              <Link
                key={a.href}
                href={a.href}
                target={a.href.startsWith('http') ? '_blank' : undefined}
                rel={a.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex flex-col items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-5 text-center transition-colors hover:border-primary-200 hover:bg-primary-50"
              >
                <a.Icon className="h-7 w-7 text-primary-500" strokeWidth={1.5} />
                <span className="text-base font-semibold leading-tight text-gray-700">
                  {uz ? a.uz : a.ru}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ══ Tizimdan chiqish ════════════════════════════════════ */}
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-4 text-lg font-semibold text-red-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} /> {uz ? 'Tizimdan chiqish' : 'Выйти из системы'}
        </button>

        {/* ══ Yordam ══════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
          <p className="flex items-center justify-center gap-1.5 text-base font-semibold text-blue-800">
            <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {uz ? 'Muammo bormi?' : 'Есть проблемы?'}
          </p>
          <a
            href="https://t.me/TrustboxInc"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-base font-semibold text-blue-600 hover:text-blue-800"
          >
            <Send className="h-4 w-4 shrink-0" strokeWidth={1.75} /> @TrustboxInc {uz ? "Telegram kanaliga yozing" : '— пишите нам'}
          </a>
        </div>

        <div className="h-4" />
      </main>
    </div>
  )
}
