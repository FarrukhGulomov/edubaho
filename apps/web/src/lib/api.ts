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
    'Content-Type': 'application/json',
    // ngrok free tier interstitial sahifasini o'tkazib yuborish
    'ngrok-skip-browser-warning': '1',
    ...(init.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
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

export const matchApi = {
  find: (prefs: {
    type: string
    goal?: string
    cityId?: string
    regionId?: string
    budget?: number
    shift?: string
    age?: number
  }) =>
    apiFetch<{ data: MatchItem[]; meta: { total: number } }>('/match', {
      method: 'POST',
      body: JSON.stringify(prefs),
    }),
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

  verifyOtp: (phone: string, otp: string) =>
    apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),

  telegramLogin: (data: object) =>
    apiFetch('/auth/telegram', { method: 'POST', body: JSON.stringify(data) }),

  // Telegram Mini App ichidan avtomatik kirish
  telegramWebAppLogin: (initData: string) =>
    apiFetch('/auth/telegram-webapp', { method: 'POST', body: JSON.stringify({ initData }) }),

  googleLogin: (idToken: string) =>
    apiFetch('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),

  refresh: (refreshToken: string) =>
    apiFetch('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  me: (token: string) =>
    apiFetch('/auth/me', { token }),

  updateProfile: (token: string, data: { name?: string; email?: string; cityId?: string; matchOnboardingCompletedAt?: string }) =>
    apiFetch('/auth/profile', { method: 'PATCH', token, body: JSON.stringify(data) }),

  logout: (token: string) =>
    apiFetch('/auth/logout', { method: 'POST', token }),
}
