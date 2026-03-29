'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

// ─── Types ────────────────────────────────────────────────────

interface Summary {
  period: { days: number; since: string }
  totals: {
    totalEvents: number
    uniqueSessions: number
    uniqueUsers: number
    newRegistrations: number
  }
  funnel: {
    gateShown: number
    gateCta: number
    authDone: number
    gateToAuth: number
    ctaToReg: number
  }
  topEvents: { event: string; count: number }[]
  hourlyActivity: { hour: number; count: number }[]
}

interface FunnelStep {
  event: string
  sessions: number
  dropOff: number
  convRate: number
}

interface Lead {
  sessionId: string
  firstSeen?: string
  lastSeen?: string
  score: number
  converted: boolean
  clickedCta: boolean
  eventsCount: number
  viewedInstitutions: number
  gateReached: number
  status: 'converted' | 'warm' | 'cold'
  user?: { phone: string; name?: string } | null
  capturedPhone?: string | null
  capturedEmail?: string | null
  searchQueries?: string[]
}

interface LeadsData {
  data: Lead[]
  summary: { total: number; converted: number; warm: number; cold: number }
}

// ─── Yordamchi funksiyalar ────────────────────────────────────

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('uz-UZ', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeSince(d?: string) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}d avval`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}s avval`
  return `${Math.floor(h / 24)} kun avval`
}

const EVENT_LABELS: Record<string, string> = {
  institution_view:    '👁 Ko\'rildi',
  gate_shown:          '🔐 Gate ko\'rindi',
  gate_cta_click:      '🖱 CTA bosildi',
  auth_started:        '🚪 Auth boshlandi',
  auth_phone_entered:  '📱 Tel. kiritdi',
  auth_otp_sent:       '📨 OTP yuborildi',
  auth_otp_error:      '❌ OTP xato',
  auth_completed:      '✅ Ro\'yxatdan o\'tdi',
  auth_abandoned:      '🏃 Tark etdi',
  contact_click:       '📞 Kontakt bosildi',
  review_started:      '✍ Sharh boshladi',
  review_submitted:    '💬 Sharh yubordi',
  search_query:        '🔍 Qidiruv',
  search_filter:       '🗂 Filter qo\'llandi',
  search_result_click: '🖱 Natijaga bosdi',
  page_view:           '📄 Sahifa',
  filter_applied:      '🔧 Filter',
  price_viewed:        '💰 Narx ko\'rdi',
  compare_opened:      '⇄ Solishtirdi',
}

const FUNNEL_LABELS: Record<string, string> = {
  institution_view:    '👁 Muassasa ko\'rildi',
  gate_shown:          '🔐 Gate ko\'rindi',
  gate_cta_click:      '🖱 CTA bosildi',
  auth_started:        '🚪 Auth sahifasi ochildi',
  auth_phone_entered:  '📱 Telefon kiritildi',
  auth_otp_sent:       '📨 OTP yuborildi',
  auth_completed:      '✅ Ro\'yxatdan o\'tdi',
}

// ─── Komponentlar ─────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'blue' }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    red:    'bg-red-50 text-red-700 border-red-100',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color] ?? colors['blue']}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <p className="text-xs font-semibold opacity-70">{label}</p>
      </div>
      <p className="text-3xl font-black">{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  )
}

function HourlyChart({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.map(d => (
        <div key={d.hour} className="flex-1 group relative">
          <div
            className="w-full rounded-t bg-blue-400 hover:bg-blue-600 transition-colors"
            style={{ height: `${Math.max((d.count / max) * 64, d.count > 0 ? 2 : 0)}px` }}
          />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block text-xs bg-gray-800 text-white px-1.5 py-0.5 rounded whitespace-nowrap z-10">
            {d.hour}:00 — {d.count}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Asosiy sahifa ────────────────────────────────────────────

type Tab = 'summary' | 'funnel' | 'leads' | 'stream'

export default function AnalyticsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [days, setDays] = useState(7)
  const [tab, setTab] = useState<Tab>('summary')

  const [summary, setSummary]   = useState<Summary | null>(null)
  const [funnel, setFunnel]     = useState<FunnelStep[]>([])
  const [leads, setLeads]       = useState<LeadsData | null>(null)
  const [stream, setStream]     = useState<unknown[]>([])
  const [fetching, setFetching] = useState(false)
  const [toast, setToast]       = useState('')

  // Session detail modal
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [sessionEvents, setSessionEvents]     = useState<unknown[]>([])
  const [sessionLoading, setSessionLoading]   = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/admin/login')
  }, [loading, user, router])

  function getHeaders() {
    const token = localStorage.getItem('accessToken') ?? ''
    return {
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': '1',
    }
  }

  const loadData = useCallback(async (currentTab: Tab, d: number) => {
    setFetching(true)
    try {
      const h = getHeaders()
      if (currentTab === 'summary') {
        const r = await fetch(`${API}/super-admin/analytics/summary?days=${d}`, { headers: h })
        const j = await r.json()
        setSummary(j.data)
      } else if (currentTab === 'funnel') {
        const r = await fetch(`${API}/super-admin/analytics/funnel?days=${d}`, { headers: h })
        const j = await r.json()
        setFunnel(j.data ?? [])
      } else if (currentTab === 'leads') {
        const r = await fetch(`${API}/super-admin/analytics/leads?days=${d}`, { headers: h })
        const j = await r.json()
        setLeads(j)
      } else if (currentTab === 'stream') {
        const r = await fetch(`${API}/super-admin/analytics/events?limit=100`, { headers: h })
        const j = await r.json()
        setStream(j.data ?? [])
      }
    } catch {
      setToast('Ma\'lumot yuklanmadi')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') loadData(tab, days)
  }, [user, tab, days, loadData])

  async function loadSession(sid: string) {
    setSessionLoading(true)
    try {
      const r = await fetch(`${API}/super-admin/analytics/sessions/${sid}`, { headers: getHeaders() })
      const j = await r.json()
      setSessionEvents(j.data ?? [])
      setSelectedSession(sid)
    } finally {
      setSessionLoading(false)
    }
  }

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )

  if (user.role !== 'SUPER_ADMIN') {
    router.replace('/admin')
    return null
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'summary', label: 'Umumiy',     icon: '📊' },
    { id: 'funnel',  label: 'Funnel',     icon: '🔻' },
    { id: 'leads',   label: 'Lidlar',     icon: '🎯' },
    { id: 'stream',  label: 'Oqim',       icon: '⚡' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-bold text-primary-600">🎓 EDUBAHO</Link>
            <span className="text-gray-300">›</span>
            <Link href="/admin/super" className="text-gray-500 hover:text-gray-700">Super Admin</Link>
            <span className="text-gray-300">›</span>
            <span className="font-semibold text-gray-700">Analytics</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Kunlar filtr */}
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 outline-none"
            >
              <option value={1}>Bugun</option>
              <option value={7}>7 kun</option>
              <option value={30}>30 kun</option>
              <option value={90}>90 kun</option>
            </select>
            <button
              onClick={() => loadData(tab, days)}
              disabled={fetching}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {fetching ? '...' : '↻ Yangilash'}
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-20 z-50 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">📊 Lead Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Foydalanuvchi xatti-harakati va lid konversiyasi</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {fetching && (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        )}

        {/* ── SUMMARY tab ── */}
        {!fetching && tab === 'summary' && summary && (
          <div className="space-y-6">
            {/* Stat kartochkalar */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon="⚡" label="Jami voqealar"    value={summary.totals.totalEvents}      color="blue"   />
              <StatCard icon="👤" label="Noyob sessiyalar" value={summary.totals.uniqueSessions}    color="purple" />
              <StatCard icon="👥" label="Auth foydalanuvchilar" value={summary.totals.uniqueUsers} color="green"  />
              <StatCard icon="✅" label="Yangi ro'yxatlar" value={summary.totals.newRegistrations}  color="orange" />
            </div>

            {/* Konversiya funnel (mini) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-black text-gray-900">🔻 Konversiya ko'rsatkichlari</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-center">
                  <p className="text-3xl font-black text-orange-700">{summary.funnel.gateShown}</p>
                  <p className="text-sm text-orange-600 mt-1">🔐 Gate ko'rindi</p>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                  <p className="text-3xl font-black text-blue-700">{summary.funnel.gateCta}</p>
                  <p className="text-sm text-blue-600 mt-1">🖱 CTA bosildi</p>
                  <p className="text-xs text-blue-400 mt-0.5">Gate'dan: {summary.funnel.gateToAuth}%</p>
                </div>
                <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-center">
                  <p className="text-3xl font-black text-green-700">{summary.funnel.authDone}</p>
                  <p className="text-sm text-green-600 mt-1">✅ Ro'yxatdan o'tdi</p>
                  <p className="text-xs text-green-400 mt-0.5">CTA'dan: {summary.funnel.ctaToReg}%</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Soatlik faollik */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-black text-gray-900">⏰ Soatlik faollik (24s)</h2>
                <HourlyChart data={summary.hourlyActivity} />
                <div className="mt-2 flex justify-between text-xs text-gray-400">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:00</span>
                </div>
              </div>

              {/* Top voqealar */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-black text-gray-900">🏆 Top voqealar</h2>
                <div className="space-y-2">
                  {summary.topEvents.map((e, i) => {
                    const max = summary.topEvents[0]?.count ?? 1
                    return (
                      <div key={e.event} className="flex items-center gap-3">
                        <span className="w-5 text-xs text-gray-400 shrink-0 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-gray-700 truncate">
                              {EVENT_LABELS[e.event] ?? e.event}
                            </span>
                            <span className="text-xs font-black text-gray-900 ml-2 shrink-0">{e.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary-500"
                              style={{ width: `${(e.count / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FUNNEL tab ── */}
        {!fetching && tab === 'funnel' && funnel.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-black text-gray-900">🔻 Konversiya funnel</h2>
            <div className="space-y-3">
              {funnel.map((step, i) => {
                const maxSessions = funnel[0]?.sessions ?? 1
                const pct = Math.round((step.sessions / maxSessions) * 100)
                return (
                  <div key={step.event}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">
                        {FUNNEL_LABELS[step.event] ?? step.event}
                      </span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-black text-gray-900">{step.sessions.toLocaleString()} sessiya</span>
                        {i > 0 && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            step.convRate >= 60 ? 'bg-green-100 text-green-700' :
                            step.convRate >= 30 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {step.convRate}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-8 rounded-xl bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-xl transition-all flex items-center px-3 ${
                          i === 0 ? 'bg-blue-500' :
                          i === funnel.length - 1 ? 'bg-green-500' :
                          'bg-primary-500'
                        }`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      >
                        <span className="text-xs font-bold text-white truncate">{pct}%</span>
                      </div>
                    </div>
                    {i > 0 && step.dropOff > 0 && (
                      <p className="mt-1 text-xs text-red-500">
                        ↓ {step.dropOff.toLocaleString()} sessiya tushib qoldi
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── LEADS tab ── */}
        {!fetching && tab === 'leads' && leads && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-center">
                <p className="text-2xl font-black text-gray-900">{leads.summary.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Jami lidlar</p>
              </div>
              <div className="rounded-2xl bg-green-50 border border-green-100 p-4 text-center">
                <p className="text-2xl font-black text-green-700">{leads.summary.converted}</p>
                <p className="text-xs text-green-600 mt-0.5">✅ Konvertlangan</p>
              </div>
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 text-center">
                <p className="text-2xl font-black text-orange-700">{leads.summary.warm}</p>
                <p className="text-xs text-orange-600 mt-0.5">🔥 Issiq</p>
              </div>
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-center">
                <p className="text-2xl font-black text-blue-700">{leads.summary.cold}</p>
                <p className="text-xs text-blue-600 mt-0.5">❄️ Sovuq</p>
              </div>
            </div>

            {/* Lidlar jadvali */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Kontakt</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Qidiruvlar</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Gate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Faollik</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads.data.map(lead => (
                      <tr key={lead.sessionId} className="hover:bg-gray-50 transition-colors">
                        {/* Kontakt ustuni */}
                        <td className="px-4 py-3 min-w-[180px]">
                          {lead.user ? (
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                📱 {lead.user.phone}
                              </p>
                              {lead.user.name && (
                                <p className="text-xs text-gray-500">{lead.user.name}</p>
                              )}
                              <span className="mt-0.5 inline-block rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                                ✅ Ro&apos;yxatdan o&apos;tgan
                              </span>
                            </div>
                          ) : lead.capturedPhone ? (
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                📱 {lead.capturedPhone}
                              </p>
                              <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                🎯 Qoldirilgan
                              </span>
                            </div>
                          ) : lead.capturedEmail ? (
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                ✉️ {lead.capturedEmail}
                              </p>
                              <span className="mt-0.5 inline-block rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                📧 Email
                              </span>
                            </div>
                          ) : (
                            <div>
                              <p className="font-mono text-xs text-gray-400">{lead.sessionId.slice(0, 10)}…</p>
                              <span className="mt-0.5 inline-block rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
                                Anonim
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            lead.status === 'converted' ? 'bg-green-100 text-green-700' :
                            lead.status === 'warm'      ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {lead.status === 'converted' ? '✅ Konvertlangan' :
                             lead.status === 'warm'      ? '🔥 Issiq' : '❄️ Sovuq'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  lead.score >= 10 ? 'bg-green-500' :
                                  lead.score >= 5  ? 'bg-orange-400' : 'bg-blue-300'
                                }`}
                                style={{ width: `${Math.min((lead.score / 20) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-gray-700">{lead.score}</span>
                          </div>
                        </td>
                        {/* Qidiruv so'rovlari */}
                        <td className="px-4 py-3 max-w-[180px]">
                          {(lead.searchQueries?.length ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {lead.searchQueries!.map((q, i) => (
                                <span key={i} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-100">
                                  &ldquo;{q}&rdquo;
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{lead.gateReached}x</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{timeSince(lead.lastSeen)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => loadSession(lead.sessionId)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Tarix →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── STREAM tab ── */}
        {!fetching && tab === 'stream' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Oxirgi 100 ta voqea — real vaqt</p>
              <button
                onClick={() => loadData('stream', days)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                ↻ Yangilash
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-50">
              {(stream as {
                id: string; event: string; sessionId: string;
                properties: Record<string, unknown>; page?: string;
                createdAt: string; institution?: { nameUz: string; slug: string };
                user?: { phone: string; name?: string };
              }[]).map((e) => (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                  <span className="text-lg shrink-0 mt-0.5">
                    {e.event.startsWith('auth') ? '🔑' :
                     e.event.startsWith('gate') ? '🔐' :
                     e.event.startsWith('contact') ? '📞' :
                     e.event.startsWith('search') ? '🔍' :
                     e.event.startsWith('institution') ? '🏫' : '⚡'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-800">
                        {EVENT_LABELS[e.event] ?? e.event}
                      </span>
                      {/* Qidiruv so'rovini ajratib ko'rsatamiz */}
                      {(e.event === 'search_query' || e.event === 'search_result_click') && e.properties?.query != null && (
                        <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
                          &ldquo;{String(e.properties.query)}&rdquo;
                        </span>
                      )}
                      {e.event === 'search_query' && e.properties?.resultsCount != null && (
                        <span className="text-xs text-gray-400">{String(e.properties.resultsCount)} natija</span>
                      )}
                      {e.institution && (
                        <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                          {e.institution.nameUz}
                        </span>
                      )}
                      {/* Autentifikatsiya qilingan user */}
                      {e.user ? (
                        <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                          👤 {e.user.name ? `${e.user.name} (${e.user.phone})` : e.user.phone}
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-50 text-gray-400 rounded-full px-2 py-0.5">mehmon</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 font-mono">{e.sessionId.slice(0, 8)}…</span>
                      {e.page && <span className="text-xs text-gray-400 truncate max-w-xs">{e.page}</span>}
                    </div>
                    {/* search_query va search_filter dagi qo'shimcha properties */}
                    {Object.keys(e.properties ?? {}).length > 0 &&
                      !['search_query', 'search_result_click'].includes(e.event) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(e.properties).filter(([, v]) => v !== null).map(([k, v]) => (
                          <span key={k} className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">{fmt(e.createdAt)}</span>
                </div>
              ))}
              {stream.length === 0 && (
                <div className="py-12 text-center text-gray-400">
                  <p className="text-3xl mb-2">⚡</p>
                  <p>Hozircha voqealar yo'q</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Session detail modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">Sessiya tarixi</h2>
                {/* Sessiyadan user yoki mehmon kontaktini ko'rsatamiz */}
                {(() => {
                  type SE = { user?: { phone: string; name?: string }; properties?: Record<string, unknown>; event?: string }
                  const evts = sessionEvents as SE[]
                  const authUser = evts.find(e => e.user)?.user
                  const captureEvt = evts.find(e =>
                    ['lead_capture', 'lead_capture_email'].includes(String(e.properties?.contactType ?? ''))
                  )
                  if (authUser) return (
                    <p className="mt-1 text-sm font-semibold text-green-700">
                      📱 {authUser.phone}{authUser.name ? ` — ${authUser.name}` : ''}
                    </p>
                  )
                  if (captureEvt?.properties?.phone) return (
                    <p className="mt-1 text-sm font-semibold text-amber-700">
                      📱 {String(captureEvt.properties.phone)} <span className="text-xs text-amber-500">(qoldirilgan)</span>
                    </p>
                  )
                  if (captureEvt?.properties?.email) return (
                    <p className="mt-1 text-sm font-semibold text-blue-700">
                      ✉️ {String(captureEvt.properties.email)}
                    </p>
                  )
                  return <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedSession}</p>
                })()}
              </div>
              <button
                onClick={() => { setSelectedSession(null); setSessionEvents([]) }}
                className="flex items-center gap-1.5 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
              >
                ✕ Yopish
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {sessionLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                </div>
              ) : (sessionEvents as {
                event: string; properties: Record<string, unknown>;
                createdAt: string; page?: string;
                institution?: { nameUz: string }; user?: { phone: string };
              }[]).map((e, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-800">
                        {EVENT_LABELS[e.event] ?? e.event}
                      </span>
                      {e.institution && (
                        <span className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">
                          {e.institution.nameUz}
                        </span>
                      )}
                    </div>
                    {e.page && <p className="text-xs text-gray-400 mt-0.5 truncate">{e.page}</p>}
                    {Object.keys(e.properties ?? {}).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(e.properties).map(([k, v]) => (
                          <span key={k} className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{fmt(e.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
