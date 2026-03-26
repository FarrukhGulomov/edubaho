// ─────────────────────────────────────────────────────────────
// EduReyting.uz — Umumiy TypeScript tiplar
// API va Web o'rtasida umumiy ishlatiladi
// ─────────────────────────────────────────────────────────────

export type Role = 'USER' | 'INSTITUTION_OWNER' | 'ADMIN' | 'SUPER_ADMIN'

export type InstitutionType =
  | 'KINDERGARTEN'
  | 'SCHOOL'
  | 'LYCEUM'
  | 'COLLEGE'
  | 'UNIVERSITY'
  | 'COURSE_CENTER'
  | 'LANGUAGE_CENTER'
  | 'IT_SCHOOL'
  | 'TUTORING'
  | 'SPORTS_SCHOOL'
  | 'ARTS_SCHOOL'

export type InstitutionStatus = 'PENDING' | 'ACTIVE' | 'PREMIUM' | 'SUSPENDED' | 'INACTIVE'

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED'

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

export type MediaType = 'IMAGE' | 'VIDEO' | 'VIRTUAL_TOUR'

// ─── API Response wrapperlari ────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

// ─── Muassasa ────────────────────────────────────────────────

export interface InstitutionCard {
  id: string
  nameUz: string
  nameRu?: string
  slug: string
  type: InstitutionType
  status: InstitutionStatus
  avgRating?: number
  reviewCount: number
  viewCount: number
  isVerified: boolean
  address?: string
  lat?: number
  lng?: number
  telegram?: string
  city?: { id: string; nameUz: string; nameRu: string }
  pricing?: {
    monthlyMin?: number
    monthlyMax?: number
    currency: string
  }
  media?: Array<{ url: string; thumbnailUrl?: string }>
}

// ─── Sharh ───────────────────────────────────────────────────

export interface ReviewAuthor {
  id: string
  name?: string
  avatarUrl?: string
}

export interface ReviewReply {
  id: string
  body: string
  fromInstitution: boolean
  authorId?: string
  createdAt: string
}

export interface Review {
  id: string
  status: ReviewStatus
  overallRating: number
  teacherRating?: number
  facilityRating?: number
  valueRating?: number
  atmosphereRating?: number
  serviceRating?: number
  title?: string
  body: string
  isAnonymous: boolean
  isVerified: boolean
  helpfulCount: number
  replyCount: number
  photos: string[]
  createdAt: string
  updatedAt: string
  user: ReviewAuthor | null
  replies: ReviewReply[]
  isOwn?: boolean
}

// ─── Auth ────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  phone: string
  name?: string
  role: Role
  institutionId?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}
