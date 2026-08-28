'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, RefreshCw, Users, Phone, Mail, Send as TelegramIcon,
  ChevronDown, Download, MapPin, Target, Flame, Sun, Snowflake, Clock,
  SlidersHorizontal, Ban, PhoneOff, FileSpreadsheet, FileText, FileType,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface LeadCity { nameUz: string; nameRu: string | null; region: { nameUz: string; nameRu: string } | null }

interface Lead {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  telegramUsername: string | null
  registrationMethod: 'TELEGRAM' | 'GOOGLE' | 'PHONE' | 'UNKNOWN'
  createdAt: string
  lastActiveAt: string | null
  city: LeadCity | null
  leadStatus: string
  priority: 'HOT' | 'WARM' | 'COLD'
  profileCompletion: { percent: number; complete: boolean }
  goal: string | null
  direction: string | null
  selectedCenter: string | null
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
  HOT: { label: 'Hot', Icon: Flame, cls: 'bg-red-100 text-red-700' },
  WARM: { label: 'Warm', Icon: Sun, cls: 'bg-amber-100 text-amber-700' },
  COLD: { label: 'Cold', Icon: Snowflake, cls: 'bg-blue-100 text-blue-700' },
} as const

const METHOD_LABELS: Record<string, string> = { TELEGRAM: 'Telegram', GOOGLE: 'Google', PHONE: 'Telefon', UNKNOWN: "Noma'lum" }

const SORT_OPTIONS = [
  { value: 'newest', label: 'Eng yangi' },
  { value: 'oldest', label: 'Eng eski' },
  { value: 'lastActivity', label: 'Oxirgi faollik' },
  { value: 'mostActive', label: 'Eng faol' },
  { value: 'priority', label: 'Ustuvorlik' },
  { value: 'profileCompletion', label: 'Profil to\'liqligi' },
  { value: 'status', label: 'Status' },
]

const EXPORT_FORMATS = [
  { value: 'xlsx', label: 'Excel (.xlsx)', Icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', Icon: FileText },
  { value: 'pdf', label: 'PDF', Icon: FileText },
  { value: 'docx', label: 'Word (.docx)', Icon: FileType },
]

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AdminLeadsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [loading, user, router])

  const [leads, setLeads] = useState<Lead[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [fetching, setFetching] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [q, setQ] = useState('')
  const [sort, setSort] = useState('newest')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [registrationMethod, setRegistrationMethod] = useState('')
  const [hasPhone, setHasPhone] = useState('')
  const [profileComplete, setProfileComplete] = useState('')
  const [format, setFormat] = useState('')
  const [page, setPage] = useState(1)

  const buildParams = useCallback((forPage: number) => {
    const params = new URLSearchParams({ page: String(forPage), limit: '20', sort })
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (priority) params.set('priority', priority)
    if (registrationMethod) params.set('registrationMethod', registrationMethod)
    if (hasPhone) params.set('hasPhone', hasPhone)
    if (profileComplete) params.set('profileComplete', profileComplete)
    if (format) params.set('format', format)
    return params
  }, [q, sort, status, priority, registrationMethod, hasPhone, profileComplete, format])

  const fetchLeads = useCallback(async (forPage = 1) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setFetching(true)
    try {
      const params = buildParams(forPage)
      const res = await fetch(`${API}/admin/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      if (!res.ok) return
      const data = await res.json()
      setLeads(data.data ?? [])
      setMeta(data.meta ?? { total: 0, page: 1, totalPages: 1 })
      setPage(forPage)
    } finally {
      setFetching(false)
    }
  }, [buildParams])

  useEffect(() => {
    if (user) fetchLeads(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleExport(exportFormat: string) {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setExporting(true)
    setExportMenuOpen(false)
    try {
      const params = buildParams(1)
      params.set('exportFormat', exportFormat)
      const res = await fetch(`${API}/admin/leads/export?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const filenameMatch = disposition.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] ?? `bilimon-leads.${exportFormat}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
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
          <div className="mb-4 flex justify-center">
            <Ban className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ruxsat yo&apos;q</h1>
          <Link href="/" className="text-primary-600 hover:underline">Bosh sahifaga qaytish</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <AdminBreadcrumb items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Lidlar' },
          ]} />
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin"
              className="tap-center whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              ← Orqaga
            </Link>
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen((v) => !v)}
                disabled={exporting || meta.total === 0}
                className="flex items-center gap-1.5 tap-center whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {exporting ? 'Yuklanmoqda...' : 'Eksport'}
              </button>
              {exportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                  <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg">
                    {EXPORT_FORMATS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => handleExport(f.value)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <f.Icon className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} /> {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Qidiruv + asosiy filtrlar */}
        <div className="mb-4 flex flex-wrap gap-3">
          <form
            onSubmit={(e) => { e.preventDefault(); fetchLeads(1) }}
            className="flex min-w-64 flex-1 gap-2"
          >
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ism, telefon, email, Telegram yoki Lead ID bo'yicha qidirish..."
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 tap-center whitespace-nowrap rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Qidirish
            </button>
          </form>

          <ChevronSelect value={status} onChange={(v) => { setStatus(v); fetchLeads(1) }} placeholder="Barcha statuslar" refresh={() => fetchLeads(1)}>
            <option value="">Barcha statuslar</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </ChevronSelect>

          <ChevronSelect value={priority} onChange={(v) => { setPriority(v); fetchLeads(1) }} placeholder="Barcha ustuvorliklar">
            <option value="">Barcha ustuvorliklar</option>
            <option value="HOT">🔥 Hot</option>
            <option value="WARM">☀️ Warm</option>
            <option value="COLD">❄️ Cold</option>
          </ChevronSelect>

          <ChevronSelect value={sort} onChange={(v) => { setSort(v); fetchLeads(1) }} placeholder="Saralash">
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </ChevronSelect>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              showFilters ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Ko&apos;proq filtrlar
          </button>

          <button
            onClick={() => fetchLeads(page)}
            disabled={fetching}
            className="flex items-center gap-1.5 tap-center whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${fetching ? 'animate-spin' : ''}`} strokeWidth={1.75} /> Yangilash
          </button>
        </div>

        {/* Qo'shimcha filtrlar paneli */}
        {showFilters && (
          <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <ChevronSelect value={registrationMethod} onChange={(v) => { setRegistrationMethod(v); fetchLeads(1) }} placeholder="Ro'yxatdan o'tish usuli">
              <option value="">Barcha usullar</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="GOOGLE">Google</option>
              <option value="PHONE">Telefon</option>
            </ChevronSelect>
            <ChevronSelect value={hasPhone} onChange={(v) => { setHasPhone(v); fetchLeads(1) }} placeholder="Telefon holati">
              <option value="">Telefon: hammasi</option>
              <option value="true">Telefon bor</option>
              <option value="false">Telefon yo&apos;q</option>
            </ChevronSelect>
            <ChevronSelect value={profileComplete} onChange={(v) => { setProfileComplete(v); fetchLeads(1) }} placeholder="Profil holati">
              <option value="">Profil: hammasi</option>
              <option value="true">To&apos;liq</option>
              <option value="false">To&apos;liqsiz</option>
            </ChevronSelect>
            <ChevronSelect value={format} onChange={(v) => { setFormat(v); fetchLeads(1) }} placeholder="O'qish formati">
              <option value="">Format: hammasi</option>
              <option value="online">Onlayn</option>
              <option value="offline">Offlayn</option>
              <option value="hybrid">Gibrid</option>
            </ChevronSelect>
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Jami: <strong className="text-gray-900">{meta.total} ta lid</strong>
          </p>
        </div>

        {fetching ? (
          <div className="py-16 text-center text-gray-400">Yuklanmoqda...</div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mb-3 flex justify-center">
              <Users className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-gray-600">Lid topilmadi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => {
              const pm = PRIORITY_META[lead.priority]
              return (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex flex-wrap items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-primary-300"
                >
                  <span className="icon-chip h-12 w-12 shrink-0">
                    <Users className="h-5 w-5" strokeWidth={1.75} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {lead.name ?? <span className="italic text-gray-400">Ism kiritilmagan</span>}
                      </span>
                      <span className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${pm.cls}`}>
                        <pm.Icon className="h-3 w-3 shrink-0" strokeWidth={2} /> {pm.label}
                      </span>
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[lead.leadStatus] ?? 'bg-gray-100'}`}>
                        {STATUS_LABELS[lead.leadStatus] ?? lead.leadStatus}
                      </span>
                      {!lead.profileCompletion.complete && (
                        <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                          Profil {lead.profileCompletion.percent}%
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        {lead.registrationMethod === 'TELEGRAM' ? <TelegramIcon className="h-3 w-3 shrink-0" strokeWidth={1.75} /> : <Mail className="h-3 w-3 shrink-0" strokeWidth={1.75} />}
                        {METHOD_LABELS[lead.registrationMethod]}
                      </span>
                      {lead.phone ? (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {lead.phone}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400"><PhoneOff className="h-3 w-3 shrink-0" strokeWidth={1.75} /> Telefon yo&apos;q</span>
                      )}
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {lead.email}</span>}
                      {lead.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {lead.city.nameUz}</span>}
                      {lead.goal && <span className="flex items-center gap-1"><Target className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {lead.goal}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {fmtDate(lead.lastActiveAt)}</span>
                    </div>
                  </div>

                  <span className="shrink-0 whitespace-nowrap text-xs text-gray-400">{fmtDate(lead.createdAt)}</span>
                </Link>
              )
            })}
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchLeads(p)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  meta.page === p
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ChevronSelect({ value, onChange, children, placeholder }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  placeholder?: string
  refresh?: () => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={placeholder}
        className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm font-medium text-gray-700 outline-none transition-colors focus:border-primary-400"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
    </div>
  )
}
