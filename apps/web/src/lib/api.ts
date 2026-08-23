/**
 * API client — fetch wrapper
 * Base URL: NEXT_PUBLIC_API_URL dan olinadi
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface FetchOptions extends RequestInit {
  token?: string
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...init } = options

  const headers: Record<string, string> = {
    // Faqat body bor so'rovlarda qo'yiladi — aks holda Fastify
    // FST_ERR_CTP_EMPTY_JSON_BODY xatosini beradi (Content-Type: json
    // header'i bor, lekin body bo'sh bo'lgan POST so'rovlarda, masalan
    // logout/refresh/verify-phone kabi ma'lumotsiz endpoint'larda)
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    // ngrok free tier interstitial sahifasini o'tkazib yuborish
    'ngrok-skip-browser-warning': '1',
    ...(init.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    // Refresh token httpOnly cookie orqali yuboriladi/qabul qilinadi (XSS himoyasi)
    credentials: 'include',
    ...init,
    headers,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new ApiError(data.error ?? "Noma'lum xato", res.status, data.code)
  }

  return data as T
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Institutions ─────────────────────────────────────────────

export const institutionsApi = {
  list: (params?: Record<string, string>) =>
    apiFetch<{ data: unknown[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/institutions?${new URLSearchParams(params)}`,
    ),

  get: (slug: string) =>
    apiFetch<{ data: unknown }>(`/institutions/${slug}`),

  nearby: (lat: number, lng: number, radius?: number) =>
    apiFetch<{ data: unknown[] }>(`/institutions/nearby?lat=${lat}&lng=${lng}&radius=${radius ?? 5000}`),

  compare: (ids: string[]) =>
    apiFetch<{ data: unknown[] }>(`/institutions/compare?ids=${ids.join(',')}`),

  save: (id: string, token: string) =>
    apiFetch<{ saved: boolean }>(`/institutions/${id}/save`, { method: 'POST', token }),

  view: (id: string) =>
    apiFetch(`/institutions/${id}/view`, { method: 'POST' }),

  // Muassasa egaligi so'rovi (hamkorlar uchun)
  claim: (id: string, data: { note?: string; contactPhone?: string; position?: string }, token: string) =>
    apiFetch<{ data: unknown; message: string }>(`/institutions/${id}/claim`, {
      method: 'POST', body: JSON.stringify(data), token,
    }),

  myClaims: (token: string) =>
    apiFetch<{ data: Array<{ id: string; status: string; institution: { id: string; nameUz: string; slug: string } }> }>(
      '/institutions/claims/me', { token },
    ),

  // Bepul probnoy darsga bron (UTP#2) — token ixtiyoriy, mehmon ham yubora oladi
  trialBooking: (
    id: string,
    data: { name: string; phone: string; preferredTime?: string; note?: string },
    token?: string | null,
  ) =>
    apiFetch<{ data: unknown; message: string }>(`/institutions/${id}/trial-bookings`, {
      method: 'POST', body: JSON.stringify(data), token: token ?? undefined,
    }),
}

// ─── Saqlangan solishtirishlar ──────────────────────────────────

export interface SavedComparison {
  id: string
  institutionIds: string[]
  label: string | null
  createdAt: string
  institutions: Array<{ id: string; nameUz: string; nameRu?: string | null; slug: string }>
}

export const compareApi = {
  save: (institutionIds: string[], token: string, label?: string) =>
    apiFetch<{ data: unknown; message: string }>('/compare/saved', {
      method: 'POST', body: JSON.stringify({ institutionIds, label }), token,
    }),

  saved: (token: string) =>
    apiFetch<{ data: SavedComparison[] }>('/compare/saved', { token }),

  removeSaved: (id: string, token: string) =>
    apiFetch<{ message: string }>(`/compare/saved/${id}`, { method: 'DELETE', token }),
}

// ─── Geo ──────────────────────────────────────────────────────

export const geoApi = {
  regions: () => apiFetch<{ data: unknown[] }>('/geo/regions'),
  cities: (q?: string, regionId?: string) =>
    apiFetch<{ data: unknown[] }>(`/geo/cities?${new URLSearchParams({ ...(q && { q }), ...(regionId && { regionId }) })}`),
}

// ─── EduFit (moslik bo'yicha tavsiya) ─────────────────────────

export interface MatchInstitution {
  id: string
  nameUz: string
  nameRu?: string | null
  slug: string
  type: string
  isVerified: boolean
  avgRating?: number | null
  reviewCount: number
  address?: string | null
  city?: { nameUz: string; nameRu?: string | null } | null
  pricing?: { monthlyMin?: number | null; monthlyMax?: number | null } | null
  deliveryMode?: string
}

export interface MatchComponent {
  key: string
  labelUz: string
  labelRu: string
  score: number
  weight: number
  hasData: boolean
  reasonUz: string
  reasonRu: string
}

export interface MatchItem {
  institution: MatchInstitution
  match: {
    score: number
    confidence: number
    components: MatchComponent[]
    topReasonsUz: string[]
    topReasonsRu: string[]
  }
}

export interface MatchInsights {
  totalInThisType: number
  matchingCount: number
  cityCount: number | null
  locationRelaxed: boolean
  matchedCategory: { code: string; labelUz: string; labelRu: string } | null
  matchedPrograms: string[]
  priceRange: { min: number | null; max: number | null }
  avgRating: number | null
  withinBudgetCount: number | null
  sampleInstitutions: Array<{
    nameUz: string
    nameRu?: string | null
    slug: string
    avgRating: number | null
    city?: { nameUz: string; nameRu?: string | null } | null
  }>
}

export const matchApi = {
  find: (prefs: {
    type: string
    goal?: string
    cityId?: string
    regionId?: string
    budget?: number
    shift?: string
    age?: number
    language?: string
    format?: string
    preferPremium?: boolean
    limit?: number
  }) =>
    apiFetch<{
      data: MatchItem[]
      meta: {
        total: number
        locationRelaxed?: boolean
        usedRegionFallback?: boolean
        noSpecializationMatch?: boolean
        belowThreshold?: boolean
        minScore?: number
      }
    }>('/match', {
      method: 'POST',
      body: JSON.stringify(prefs),
    }),

  // Anketa to'ldirilayotganda live, real ma'lumot (hali "Ko'rish" bosilmasdan)
  insights: (prefs: { type: string; goal?: string; cityId?: string; budget?: number; format?: string }) => {
    const params = new URLSearchParams({ type: prefs.type })
    if (prefs.goal?.trim()) params.set('goal', prefs.goal.trim())
    if (prefs.cityId) params.set('cityId', prefs.cityId)
    if (prefs.budget) params.set('budget', String(prefs.budget))
    if (prefs.format) params.set('format', prefs.format)
    return apiFetch<{ data: MatchInsights }>(`/match/insights?${params}`)
  },
}

// ─── Search ───────────────────────────────────────────────────

export const searchApi = {
  search: (params: Record<string, string>) =>
    apiFetch<{ data: unknown[]; meta: unknown; facets: unknown }>(`/search?${new URLSearchParams(params)}`),

  suggest: (q: string) =>
    apiFetch<{ data: unknown[] }>(`/search/suggest?q=${encodeURIComponent(q)}`),
}

// ─── Reviews ──────────────────────────────────────────────────

export const reviewsApi = {
  list: (institutionId: string, params?: Record<string, string>, token?: string) =>
    apiFetch(`/reviews/${institutionId}?${new URLSearchParams(params)}`, { token }),

  create: (data: unknown, token: string) =>
    apiFetch('/reviews', { method: 'POST', body: JSON.stringify(data), token }),

  update: (id: string, data: unknown, token: string) =>
    apiFetch(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),

  delete: (id: string, token: string) =>
    apiFetch(`/reviews/${id}`, { method: 'DELETE', token }),

  vote: (id: string, isHelpful: boolean, token: string) =>
    apiFetch(`/reviews/${id}/vote`, { method: 'POST', body: JSON.stringify({ isHelpful }), token }),

  reply: (id: string, body: string, token: string) =>
    apiFetch(`/reviews/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }), token }),

  report: (id: string, data: { reason: string; note?: string }, token: string) =>
    apiFetch(`/reviews/${id}/report`, { method: 'POST', body: JSON.stringify(data), token }),
}

// ─── Auth ────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string) =>
    apiFetch('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  // referralCode — faqat ?ref= bilan kelgan YANGI foydalanuvchilar uchun
  // ta'sir qiladi, backend mavjud userlarni referralga aylantirmaydi
  verifyOtp: (phone: string, otp: string, referralCode?: string | null) =>
    apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp, referralCode: referralCode || undefined }) }),

  telegramLogin: (data: object, referralCode?: string | null) =>
    apiFetch('/auth/telegram', { method: 'POST', body: JSON.stringify({ ...data, referralCode: referralCode || undefined }) }),

  // Telegram Mini App ichidan avtomatik kirish
  telegramWebAppLogin: (initData: string, referralCode?: string | null) =>
    apiFetch('/auth/telegram-webapp', { method: 'POST', body: JSON.stringify({ initData, referralCode: referralCode || undefined }) }),

  googleLogin: (idToken: string, referralCode?: string | null) =>
    apiFetch('/auth/google', { method: 'POST', body: JSON.stringify({ idToken, referralCode: referralCode || undefined }) }),

  // Refresh token httpOnly cookie'dan olinadi — parametr shart emas
  refresh: () =>
    apiFetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),

  me: (token: string) =>
    apiFetch('/auth/me', { token }),

  // Telefonni Telegram bot orqali tasdiqlash jarayonini boshlaydi —
  // bir martalik bot deep-link qaytaradi (login usulidan qat'i nazar ishlaydi)
  startTelegramPhoneVerify: (token: string) =>
    apiFetch<{ deepLink: string; expiresIn: number }>('/auth/telegram/verify-phone', { method: 'POST', token }),

  updateProfile: (token: string, data: { name?: string; email?: string; cityId?: string; phone?: string; matchOnboardingCompletedAt?: string }) =>
    apiFetch('/auth/profile', { method: 'PATCH', token, body: JSON.stringify(data) }),

  logout: (token: string) =>
    apiFetch('/auth/logout', { method: 'POST', token }),
}

// ─── Referral & Rewards ─────────────────────────────────────────

export interface ReferralStats {
  referralCode: string
  referralReward: number
  minWithdrawal: number
  availableBalance: number
  totalEarned: number
  totalReferralEarned?: number
  totalEnrollmentEarned?: number
  totalWithdrawn: number
  potentialPending: number
  totalReferrals: number
  activeReferrals: number
  pendingReferrals: number
  rejectedReferrals: number
  canWithdraw: boolean
  remainingAmount: number
  remainingActiveReferrals: number
  progressPercent: number
}

export interface ReferralHistoryItem {
  id: string
  referredUserLabel: string
  status: 'PENDING' | 'QUALIFIED' | 'REJECTED'
  createdAt: string
  qualifiedAt: string | null
  rewardAmount: number
  rewardStatus: string | null
}

export interface ReferralWithdrawalItem {
  id: string
  amount: number
  paymentMethod: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
  requestedAt: string
  processedAt: string | null
  rejectionReason: string | null
}

export const referralsApi = {
  me: (token: string) =>
    apiFetch<{ data: ReferralStats }>('/referrals/me', { token }),

  history: (token: string, page = 1) =>
    apiFetch<{ data: ReferralHistoryItem[]; meta: { total: number; totalPages: number } }>(
      `/referrals/me/history?page=${page}`, { token },
    ),

  withdrawals: (token: string) =>
    apiFetch<{ data: ReferralWithdrawalItem[] }>('/referrals/me/withdrawals', { token }),

  withdraw: (token: string, data: { amount: number; paymentMethod: string; paymentDetails: string }) =>
    apiFetch<{ data: ReferralWithdrawalItem; message: string }>('/referrals/withdraw', {
      method: 'POST', token, body: JSON.stringify(data),
    }),
}

// ─── Enrollment Claims ("Men kurs sotib oldim") ─────────────────

export interface EnrollmentClaimItem {
  id: string
  courseNote: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  createdAt: string
  reviewedAt: string | null
  institution: { id: string; nameUz: string; slug: string }
  reward: { amount: number; status: string } | null
}

export const enrollmentClaimsApi = {
  listMine: (token: string) =>
    apiFetch<{ data: EnrollmentClaimItem[]; meta: { rewardAmount: number } }>('/enrollment-claims/me', { token }),

  create: (token: string, data: { institutionId: string; courseNote?: string; receiptUrl?: string }) =>
    apiFetch<{ data: EnrollmentClaimItem; message: string }>('/enrollment-claims', {
      method: 'POST', token, body: JSON.stringify(data),
    }),
}
