'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  GraduationCap, Phone, Mail, Send as TelegramIcon, User, Calendar, Clock,
  Target, MapPin, Wallet, Laptop, Languages, Crown, Eye, Bookmark,
  ArrowLeftRight, CheckCircle2, Flame, Sun, Snowflake, ChevronDown,
  Ban, AlertCircle, Sparkles, History, ExternalLink, ClipboardCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface ActivityItem { institutionId: string; nameUz: string; nameRu: string | null; slug: string; at: string }

interface LeadDetail {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  avatarUrl: string | null
  telegramId: string | null
  telegramUsername: string | null
  googleId: string | null
  isVerified: boolean
  isActive: boolean
  createdAt: string
  lastActiveAt: string | null
  leadStatus: string
  leadStatusUpdatedAt: string | null
  registrationMethod: 'TELEGRAM' | 'GOOGLE' | 'PHONE' | 'UNKNOWN'
  city: { id: string; nameUz: string; nameRu: string | null; region: { nameUz: string; nameRu: string } | null } | null
  profileCompletion: { percent: number; complete: boolean; missing: string[] }
  priority: 'HOT' | 'WARM' | 'COLD'
  intent: {
    type?: string; goal?: string; budget?: number; shift?: string; age?: number
    format?: string; language?: string; preferPremium?: boolean
    city?: { nameUz: string; nameRu: string | null; region: { nameUz: string; nameRu: string } | null } | null
    resultCount?: number; capturedAt: string
  } | null
  activity: {
    viewedCount: number; savedCount: number; comparedCount: number
    contactClickCount: number; searchCount: number; reviewCount: number; trialBookingCount: number
    viewed: ActivityItem[]; saved: ActivityItem[]; compared: ActivityItem[]; selected: ActivityItem[]
  }
  timeline: Array<{ at: string; labelUz: string; labelRu: string }>
}

const STATUS_OPTIONS = [
  'NEW', 'CONTACT_REQUIRED', 'CONTACTED', 'INTERESTED', 'CENTER_SELECTED',
  'APPLICATION_STARTED', 'APPLICATION_SUBMITTED', 'CONVERTED', 'NOT_INTERESTED', 'LOST',
] as const

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Yangi', CONTACT_REQUIRED: "Bog'lanish kerak", CONTACTED: "Bog'lanildi",
  INTERESTED: 'Qiziqmoqda', CENTER_SELECTED: 'Markaz tanlandi', APPLICATION_STARTED: 'Ariza boshlandi',
  APPLICATION_SUBMITTED: 'Ariza topshirildi', CONVERTED: 'Mijozga aylandi',
  NOT_INTERESTED: 'Qiziqmayapti', LOST: "Yo'qotildi",
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800', CONTACT_REQUIRED: 'bg-amber-100 text-amber-800',
  CONTACTED: 'bg-indigo-100 text-indigo-800', INTERESTED: 'bg-purple-100 text-purple-800',
  CENTER_SELECTED: 'bg-teal-100 text-teal-800', APPLICATION_STARTED: 'bg-cyan-100 text-cyan-800',
  APPLICATION_SUBMITTED: 'bg-sky-100 text-sky-800', CONVERTED: 'bg-green-100 text-green-800',
  NOT_INTERESTED: 'bg-gray-100 text-gray-600', LOST: 'bg-red-100 text-red-700',
}

const PRIORITY_META = {
  HOT: { label: 'Hot', Icon: Flame, cls: 'bg-red-100 text-red-700 border-red-200' },
  WARM: { label: 'Warm', Icon: Sun, cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  COLD: { label: 'Cold', Icon: Snowflake, cls: 'bg-blue-100 text-blue-700 border-blue-200' },
} as const

const METHOD_LABELS: Record<string, string> = { TELEGRAM: 'Telegram', GOOGLE: 'Google', PHONE: 'Telefon', UNKNOWN: "Noma'lum" }
const FORMAT_LABELS: Record<string, string> = { online: 'Onlayn', offline: 'Offlayn', hybrid: 'Gibrid' }
const SHIFT_LABELS: Record<string, string> = { morning: 'Ertalabki', afternoon: 'Tushki', evening: 'Kechki', weekend: 'Hafta oxiri' }

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' })
}
function fmtUzs(n?: number) {
  if (!n) return '—'
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
}

export default function AdminLeadDetailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [loading, user, router])

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [toast, setToast] = useState('')

  const fetchLead = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !id) return
    const res = await fetch(`${API}/admin/leads/${id}`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
    })
    const data = await res.json()
    if (!res.ok) { setFetchError(data.error ?? 'Lid topilmadi'); return }
    setLead(data.data)
  }, [id])

  useEffect(() => { if (user) fetchLead() }, [user, fetchLead])

  async function handleStatusChange(status: string) {
    const token = localStorage.getItem('accessToken')
    if (!token || !lead) return
    setStatusSaving(true)
    try {
      const res = await fetch(`${API}/admin/leads/${lead.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setLead((prev) => prev ? { ...prev, leadStatus: status, leadStatusUpdatedAt: new Date().toISOString() } : prev)
        setToast('Lid holati yangilandi')
        setTimeout(() => setToast(''), 3000)
      }
    } finally {
      setStatusSaving(false)
    }
  }

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4">
        <div>
          <Ban className="mx-auto mb-4 h-12 w-12 text-gray-300" strokeWidth={1.5} />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Ruxsat yo&apos;q</h1>
          <Link href="/" className="text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <AdminBreadcrumb items={[
            { label: 'Lidlar', href: '/admin/leads' },
            { label: lead?.name ?? id },
          ]} />
          <Link href="/admin/leads" className="shrink-0 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50">
            ← Orqaga
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        {toast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{toast}</div>
        )}

        {fetchError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-400" strokeWidth={1.5} />
            <p className="font-semibold text-red-700">{fetchError}</p>
          </div>
        ) : !lead ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : (
          <>
            {/* ══ LEAD STATUS & PRIORITY ══════════════════════════ */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="icon-chip h-16 w-16 shrink-0 text-2xl">
                    {lead.name ? lead.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : <User className="h-7 w-7" strokeWidth={1.5} />}
                  </span>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{lead.name ?? <span className="italic text-gray-400">Ism kiritilmagan</span>}</h1>
                    <p className="text-sm text-gray-400">Lead ID: {lead.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const pm = PRIORITY_META[lead.priority]
                    return (
                      <span className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-bold ${pm.cls}`}>
                        <pm.Icon className="h-4 w-4 shrink-0" strokeWidth={2} /> {pm.label}
                      </span>
                    )
                  })()}
                  <div className="relative">
                    <select
                      value={lead.leadStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusSaving}
                      className={`cursor-pointer appearance-none rounded-full border-0 py-1.5 pl-3.5 pr-8 text-sm font-bold outline-none disabled:opacity-50 ${STATUS_COLORS[lead.leadStatus] ?? 'bg-gray-100'}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" strokeWidth={2} />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Profil to'liqligi" value={`${lead.profileCompletion.percent}%`} />
                <MiniStat label="Ro'yxatdan o'tgan" value={fmtDate(lead.createdAt)} small />
                <MiniStat label="Oxirgi faollik" value={fmtDate(lead.lastActiveAt)} small />
                <MiniStat label="Status o'zgargan" value={fmtDate(lead.leadStatusUpdatedAt)} small />
              </div>

              {!lead.profileCompletion.complete && (
                <p className="mt-4 text-xs text-amber-600">
                  To&apos;liqsiz: {lead.profileCompletion.missing.join(', ')}
                </p>
              )}
            </div>

            {/* ══ CONTACT INFORMATION ═════════════════════════════ */}
            <SectionCard icon={Phone} title="Kontakt ma'lumotlari">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow Icon={User} label="Ism" value={lead.name ?? '—'} />
                <InfoRow Icon={Phone} label="Telefon" value={lead.phone ?? "Kiritilmagan"} href={lead.phone ? `tel:${lead.phone}` : undefined} warn={!lead.phone} />
                <InfoRow Icon={Mail} label="Email" value={lead.email ?? '—'} href={lead.email ? `mailto:${lead.email}` : undefined} />
                <InfoRow Icon={TelegramIcon} label="Telegram" value={lead.telegramUsername ? `@${lead.telegramUsername}` : '—'} href={lead.telegramUsername ? `https://t.me/${lead.telegramUsername}` : undefined} />
                <InfoRow Icon={Sparkles} label="Ro'yxatdan o'tish usuli" value={METHOD_LABELS[lead.registrationMethod]} />
                <InfoRow Icon={CheckCircle2} label="Tasdiqlangan" value={lead.isVerified ? 'Ha' : "Yo'q"} />
              </div>
            </SectionCard>

            {/* ══ EDUCATION PROFILE (INTENT) ══════════════════════ */}
            <SectionCard icon={Target} title="Ta'lim profili (nima xohlaydi)">
              {lead.intent ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow Icon={Target} label="Maqsad" value={lead.intent.goal || '—'} />
                  <InfoRow Icon={GraduationCap} label="Yo'nalish" value={lead.intent.type || '—'} />
                  <InfoRow Icon={MapPin} label="Shahar" value={lead.intent.city?.nameUz || lead.city?.nameUz || '—'} />
                  <InfoRow Icon={MapPin} label="Viloyat" value={lead.intent.city?.region?.nameUz || lead.city?.region?.nameUz || '—'} />
                  <InfoRow Icon={Laptop} label="Format" value={lead.intent.format ? FORMAT_LABELS[lead.intent.format] ?? lead.intent.format : '—'} />
                  <InfoRow Icon={Wallet} label="Byudjet" value={fmtUzs(lead.intent.budget)} />
                  <InfoRow Icon={Clock} label="Dars vaqti" value={lead.intent.shift ? SHIFT_LABELS[lead.intent.shift] ?? lead.intent.shift : '—'} />
                  <InfoRow Icon={Languages} label="O'qitish tili" value={lead.intent.language?.toUpperCase() || '—'} />
                  <InfoRow Icon={Crown} label="Premium afzallik" value={lead.intent.preferPremium ? 'Ha' : "Yo'q"} />
                  <InfoRow Icon={Calendar} label="So'nggi qidiruv" value={fmtDate(lead.intent.capturedAt)} />
                </div>
              ) : (
                <EmptyHint text="Bu lid hali 'Menga mosini top' qidiruvidan foydalanmagan" />
              )}
            </SectionCard>

            {/* ══ RECOMMENDATION ═══════════════════════════════════ */}
            <SectionCard icon={Sparkles} title="Tavsiya">
              {lead.intent ? (
                <div className="space-y-3">
                  <InfoRow Icon={ClipboardCheck} label="Ko'rsatilgan natijalar soni" value={lead.intent.resultCount != null ? `${lead.intent.resultCount} ta muassasa` : '—'} />
                  <InfoRow
                    Icon={CheckCircle2}
                    label="Tanlangan markaz"
                    value={lead.activity.selected[0]?.nameUz ?? "Hali tanlanmagan"}
                    href={lead.activity.selected[0] ? `/institutions/${lead.activity.selected[0].slug}` : undefined}
                  />
                  <p className="text-xs text-gray-400">
                    Moslik ballari har bir qidiruvda real vaqtda hisoblanadi va alohida saqlanmaydi — tavsiya
                    sabablarini ko&apos;rish uchun lidning o&apos;zi qidiruv natijasini ko&apos;rgan paytdagi holatga qarang.
                  </p>
                </div>
              ) : (
                <EmptyHint text="Hali tavsiya so'ralmagan" />
              )}
            </SectionCard>

            {/* ══ ACTIVITY ══════════════════════════════════════════ */}
            <SectionCard icon={History} title="Faoliyat">
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Ko'rilgan" value={String(lead.activity.viewedCount)} />
                <MiniStat label="Saqlangan" value={String(lead.activity.savedCount)} />
                <MiniStat label="Solishtirilgan" value={String(lead.activity.comparedCount)} />
                <MiniStat label="Kontaktga bosgan" value={String(lead.activity.contactClickCount)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <ActivityList title="Ko'rgan markazlar" Icon={Eye} items={lead.activity.viewed} />
                <ActivityList title="Saqlagan markazlar" Icon={Bookmark} items={lead.activity.saved} />
                <ActivityList title="Solishtirgan markazlar" Icon={ArrowLeftRight} items={lead.activity.compared} />
              </div>
              {lead.activity.selected.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <ActivityList title="Tanlagan markazlar (probnoy/sharh)" Icon={CheckCircle2} items={lead.activity.selected} />
                </div>
              )}
            </SectionCard>

            {/* ══ TIMELINE ══════════════════════════════════════════ */}
            <SectionCard icon={Clock} title="Vaqt jadvali">
              {lead.timeline.length === 0 ? (
                <EmptyHint text="Hali faoliyat qayd etilmagan" />
              ) : (
                <ol className="relative space-y-5 border-l-2 border-gray-100 pl-5">
                  {lead.timeline.map((e, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primary-500" />
                      <p className="text-xs font-semibold text-gray-400">{fmtDate(e.at)}</p>
                      <p className="text-sm text-gray-800">{e.labelUz}</p>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          </>
        )}
      </main>
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }: { icon: typeof Phone; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
        <span className="icon-chip h-9 w-9"><Icon className="h-4 w-4" strokeWidth={1.75} /></span>
        {title}
      </h2>
      {children}
    </div>
  )
}

function InfoRow({ Icon, label, value, href, warn }: { Icon: typeof Phone; label: string; value: string; href?: string; warn?: boolean }) {
  const content = (
    <div className="flex items-start gap-2.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${warn ? 'text-amber-500' : 'text-gray-400'}`} strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className={`truncate text-sm font-semibold ${warn ? 'text-amber-600' : 'text-gray-800'}`}>{value}</p>
      </div>
      {href && <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-300" strokeWidth={1.75} />}
    </div>
  )
  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="rounded-xl px-2 py-1.5 -mx-2 -my-1.5 transition-colors hover:bg-gray-50">
        {content}
      </a>
    )
  }
  return <div>{content}</div>
}

function MiniStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
      <p className={`font-bold text-gray-900 ${small ? 'text-xs' : 'text-lg'}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
    </div>
  )
}

function ActivityList({ title, Icon, items }: { title: string; Icon: typeof Eye; items: ActivityItem[] }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-300">—</p>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 6).map((item) => (
            <li key={item.institutionId}>
              <Link href={`/institutions/${item.slug}`} target="_blank" className="text-sm font-medium text-primary-600 hover:underline">
                {item.nameUz}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-gray-400">{text}</p>
}
