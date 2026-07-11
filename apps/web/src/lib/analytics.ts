/**
 * EDULA Lead Analytics
 *
 * Barcha voqealar shu modul orqali yuboriladi.
 * React'siz ham ishlaydi (plain TypeScript).
 *
 * Voqea turlari:
 *  page_view          — sahifa ko'rildi
 *  search_query       — qidiruv
 *  search_result_click— natijaga bosdi
 *  institution_view   — muassasa sahifasini ko'rdi
 *  institution_save   — saqladi
 *  institution_compare— solishtirishga qo'shdi
 *  gate_shown         — auth gate ko'rindi (issiq lid signali)
 *  gate_cta_click     — "Ro'yxatdan o'tish" CTAsiga bosdi
 *  auth_started       — auth sahifasiga o'tdi
 *  auth_phone_entered — telefon raqam kiritdi
 *  auth_otp_sent      — OTP yuborildi
 *  auth_otp_error     — OTP xato
 *  auth_completed     — muvaffaqiyatli kird / ro'yxatdan o'tdi
 *  auth_abandoned     — auth jarayonini tark etdi
 *  contact_click      — telefon/telegram/instagram/sayt bosildi
 *  review_started     — sharh yozishni boshladi
 *  review_submitted   — sharh yubordi
 *  filter_applied     — filter qo'lladi
 *  price_viewed       — narx bo'limini ko'rdi
 *  compare_opened     — solishtirish paneli ochildi
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

// Voqea kategoriyalari
export type EventCategory = 'page' | 'search' | 'institution' | 'gate' | 'auth' | 'engagement'

// Kuzatiladigan voqealar
export type TrackEvent =
  | 'page_view'
  | 'search_query' | 'search_filter' | 'search_result_click'
  | 'institution_view' | 'institution_save' | 'institution_compare'
  | 'gate_shown' | 'gate_cta_click'
  | 'auth_started' | 'auth_phone_entered' | 'auth_otp_sent'
  | 'auth_otp_error' | 'auth_completed' | 'auth_abandoned'
  | 'contact_click' | 'review_started' | 'review_submitted'
  | 'filter_applied' | 'price_viewed' | 'compare_opened'
  | 'match_started' | 'match_completed' | 'match_result_click'

export interface TrackPayload {
  category:      EventCategory
  properties?:   Record<string, unknown>
  institutionId?: string
}

// ─── Session ID ───────────────────────────────────────────────

const SESSION_KEY = 'edu_sid'

function getOrCreateSession(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    let sid = sessionStorage.getItem(SESSION_KEY)
    if (!sid) {
      // localStorage'dan ko'chiramiz (sahifalar orasida bir xil bo'lsin)
      sid = localStorage.getItem(SESSION_KEY)
      if (!sid) {
        sid = crypto.randomUUID()
        localStorage.setItem(SESSION_KEY, sid)
      }
      sessionStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch {
    return 'unknown'
  }
}

export function getSessionId(): string {
  return getOrCreateSession()
}

// ─── Debounce queue (batching uchun) ─────────────────────────

const queue: Array<() => Promise<void>> = []
let flushing = false

async function flush() {
  if (flushing || queue.length === 0) return
  flushing = true
  while (queue.length > 0) {
    const task = queue.shift()
    if (task) await task().catch(() => { /* silent fail */ })
  }
  flushing = false
}

// ─── Asosiy track funksiyasi ──────────────────────────────────

export function track(event: TrackEvent, payload: TrackPayload): void {
  if (typeof window === 'undefined') return // SSR'da kuzatmaymiz

  const sessionId = getOrCreateSession()
  const token = (() => {
    try { return localStorage.getItem('accessToken') ?? undefined } catch { return undefined }
  })()

  const body = {
    sessionId,
    event,
    category:      payload.category,
    properties:    payload.properties ?? {},
    institutionId: payload.institutionId,
    page:          window.location.pathname + window.location.search,
    referrer:      document.referrer || undefined,
  }

  queue.push(async () => {
    await fetch(`${API}/track`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      keepalive: true, // sahifa yopilganda ham yuborilsin
    })
  })

  // Keyingi event loop'da flush qilamiz (non-blocking)
  setTimeout(flush, 0)
}

// ─── Qulay yordamchi funksiyalar ──────────────────────────────

/** Muassasa sahifasi ko'rildi */
export function trackInstitutionView(institutionId: string, props?: Record<string, unknown>) {
  track('institution_view', { category: 'institution', institutionId, properties: props })
}

/** Auth gate ko'rindi — eng muhim lid signali */
export function trackGateShown(gateType: string, institutionId?: string) {
  track('gate_shown', {
    category: 'gate',
    institutionId,
    properties: { gateType },
  })
}

/** "Ro'yxatdan o'tish" CTA'siga bosdi */
export function trackGateCta(gateType: string, institutionId?: string) {
  track('gate_cta_click', {
    category: 'gate',
    institutionId,
    properties: { gateType },
  })
}

/** Kontakt tugmasiga bosdi */
export function trackContactClick(contactType: string, institutionId: string) {
  track('contact_click', {
    category: 'engagement',
    institutionId,
    properties: { contactType },
  })
}

/** Qidiruv so'rovi */
export function trackSearch(query: string, resultsCount?: number) {
  track('search_query', {
    category: 'search',
    properties: { query, resultsCount },
  })
}

/** Qidiruv natijasiga bosdi */
export function trackSearchClick(institutionId: string, position: number, query: string) {
  track('search_result_click', {
    category: 'search',
    institutionId,
    properties: { position, query },
  })
}

/** Auth funnel voqealari */
export const authTrack = {
  started:      () => track('auth_started',       { category: 'auth' }),
  phoneEntered: () => track('auth_phone_entered', { category: 'auth' }),
  otpSent:      () => track('auth_otp_sent',      { category: 'auth' }),
  otpError:     (attempts: number) => track('auth_otp_error', { category: 'auth', properties: { attempts } }),
  completed:    (isNewUser: boolean) => track('auth_completed', { category: 'auth', properties: { isNewUser } }),
  abandoned:    (step: string) => track('auth_abandoned', { category: 'auth', properties: { step } }),
}
