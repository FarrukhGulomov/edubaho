/**
 * Lead CRM — mavjud ma'lumotlardan (User, LeadEvent, TrialBooking, Review,
 * SavedInstitution) lead profilini hisoblab chiqaruvchi xizmat.
 *
 * MUHIM ARXITEKTURA QARORI: "maqsad/byudjet/format" kabi moslik
 * afzalliklari uchun YANGI jadval OCHILMAYDI. Bu ma'lumotlar allaqachon
 * har bir "match_completed" LeadEvent'ining `properties` maydonida bor
 * (apps/web/src/app/match/page.tsx orqali yuboriladi) — shu yerda faqat
 * ENG SO'NGGISI o'qib, tuzilgan "intent" ob'ektiga aylantiriladi.
 * Bu "Do not duplicate data unnecessarily" talabini bajaradi.
 *
 * Xuddi shunday, "Priority" (Hot/Warm/Cold) DB'da SAQLANMAYDI — har
 * safar LeadEvent tarixidan real vaqtda hisoblanadi, aks holda
 * foydalanuvchi faolligi o'zgarganda eskirib qolgan qiymat saqlanib
 * qolar edi. Faqat "leadStatus" (admin qo'lda belgilaydigan holat)
 * User jadvalida saqlanadi — chunki uni boshqa hech qanday manbadan
 * chiqarib bo'lmaydi.
 */
import type { PrismaClient } from '@prisma/client'

// ─── Ro'yxatdan o'tish usuli ────────────────────────────────────

export type RegistrationMethod = 'TELEGRAM' | 'GOOGLE' | 'PHONE' | 'UNKNOWN'

export function computeRegistrationMethod(user: {
  telegramId?: string | null
  googleId?: string | null
  phone?: string | null
}): RegistrationMethod {
  // Ustuvorlik tartibi: qaysi identifikator BIRINCHI marta hisob
  // yaratishda ishlatilgani aniq emas (hammasi bog'lanishi mumkin),
  // shuning uchun eng ko'p ma'lumot beruvchi ijtimoiy usul ko'rsatiladi
  if (user.telegramId) return 'TELEGRAM'
  if (user.googleId) return 'GOOGLE'
  if (user.phone) return 'PHONE'
  return 'UNKNOWN'
}

// ─── Ta'lim maqsadi (intent) — oxirgi moslik so'rovidan ────────

export interface LeadIntent {
  type?: string
  goal?: string
  budget?: number
  shift?: string
  age?: number
  format?: string
  language?: string
  preferPremium?: boolean
  city?: { id: string; nameUz: string; nameRu: string | null; region: { nameUz: string; nameRu: string } | null } | null
  resultCount?: number
  capturedAt: Date
}

/** `match_completed` LeadEvent'lari orasidan ENG SO'NGGISINI intent'ga aylantiradi */
export async function getLatestIntent(prisma: PrismaClient, userId: string): Promise<LeadIntent | null> {
  const event = await prisma.leadEvent.findFirst({
    where: { userId, event: 'match_completed' },
    orderBy: { createdAt: 'desc' },
    select: { properties: true, createdAt: true },
  })
  if (!event) return null

  const props = (event.properties ?? {}) as Record<string, unknown>
  const cityId = typeof props.cityId === 'string' ? props.cityId : undefined

  const city = cityId
    ? await prisma.city.findUnique({
        where: { id: cityId },
        select: { id: true, nameUz: true, nameRu: true, region: { select: { nameUz: true, nameRu: true } } },
      })
    : null

  return {
    type: typeof props.type === 'string' ? props.type : undefined,
    goal: typeof props.goal === 'string' ? props.goal : undefined,
    budget: typeof props.budget === 'number' ? props.budget : undefined,
    shift: typeof props.shift === 'string' ? props.shift : undefined,
    age: typeof props.age === 'number' ? props.age : undefined,
    format: typeof props.format === 'string' ? props.format : undefined,
    language: typeof props.language === 'string' ? props.language : undefined,
    preferPremium: typeof props.preferPremium === 'boolean' ? props.preferPremium : undefined,
    city,
    resultCount: typeof props.resultCount === 'number' ? props.resultCount : undefined,
    capturedAt: event.createdAt,
  }
}

// ─── Faoliyat xulosasi ──────────────────────────────────────────

export interface ActivityItem {
  institutionId: string
  nameUz: string
  nameRu: string | null
  slug: string
  at: Date
}

export interface ActivitySummary {
  viewedCount: number
  savedCount: number
  comparedCount: number
  contactClickCount: number
  searchCount: number
  reviewCount: number
  trialBookingCount: number
  viewed: ActivityItem[]
  saved: ActivityItem[]
  compared: ActivityItem[]
  selected: ActivityItem[] // Probnoy darsga yozilgan yoki sharh qoldirilgan — eng kuchli "tanladi" signali
}

/**
 * Foydalanuvchining muassasalar bilan aloqasini yig'ib chiqaradi.
 * Cheklov: har bir toifadan oxirgi 15 tasi (UI uchun yetarli, DB yukini cheklaydi)
 */
export async function getActivitySummary(prisma: PrismaClient, userId: string): Promise<ActivitySummary> {
  const [viewEvents, saveRows, compareEvents, contactCount, searchCount, reviewRows, trialRows] = await Promise.all([
    prisma.leadEvent.findMany({
      where: { userId, event: 'institution_view', institutionId: { not: null } },
      select: { institutionId: true, createdAt: true, institution: { select: { nameUz: true, nameRu: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.savedInstitution.findMany({
      where: { userId },
      select: { institutionId: true, createdAt: true, institution: { select: { nameUz: true, nameRu: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.leadEvent.findMany({
      where: { userId, event: 'institution_compare', institutionId: { not: null } },
      select: { institutionId: true, createdAt: true, institution: { select: { nameUz: true, nameRu: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.leadEvent.count({ where: { userId, event: 'contact_click' } }),
    prisma.leadEvent.count({ where: { userId, event: { in: ['search_query', 'match_started'] } } }),
    prisma.review.findMany({
      where: { userId },
      select: { institutionId: true, createdAt: true, institution: { select: { nameUz: true, nameRu: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.trialBooking.findMany({
      where: { userId },
      select: { institutionId: true, createdAt: true, institution: { select: { nameUz: true, nameRu: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ])

  const toItem = (r: { institutionId: string | null; createdAt: Date; institution: { nameUz: string; nameRu: string | null; slug: string } | null }): ActivityItem | null =>
    r.institutionId && r.institution
      ? { institutionId: r.institutionId, nameUz: r.institution.nameUz, nameRu: r.institution.nameRu, slug: r.institution.slug, at: r.createdAt }
      : null

  const dedupe = (items: ActivityItem[]) => {
    const seen = new Set<string>()
    return items.filter((i) => (seen.has(i.institutionId) ? false : (seen.add(i.institutionId), true)))
  }

  const viewed = dedupe(viewEvents.map(toItem).filter((x): x is ActivityItem => !!x))
  const saved = dedupe(saveRows.map(toItem).filter((x): x is ActivityItem => !!x))
  const compared = dedupe(compareEvents.map(toItem).filter((x): x is ActivityItem => !!x))
  const selected = dedupe([
    ...trialRows.map(toItem).filter((x): x is ActivityItem => !!x),
    ...reviewRows.map(toItem).filter((x): x is ActivityItem => !!x),
  ])

  return {
    viewedCount: viewed.length,
    savedCount: saved.length,
    comparedCount: compared.length,
    contactClickCount: contactCount,
    searchCount,
    reviewCount: reviewRows.length,
    trialBookingCount: trialRows.length,
    viewed, saved, compared, selected,
  }
}

// ─── Profil to'liqligi ──────────────────────────────────────────

export interface ProfileCompletion {
  percent: number
  complete: boolean
  missing: string[]
}

export function computeProfileCompletion(user: {
  name?: string | null
  phone?: string | null
  cityId?: string | null
}, hasIntent: boolean): ProfileCompletion {
  const checks: Array<[string, boolean]> = [
    ['name', !!user.name],
    ['phone', !!user.phone],
    ['city', !!user.cityId],
    ['goal', hasIntent],
  ]
  const filled = checks.filter(([, ok]) => ok)
  const missing = checks.filter(([, ok]) => !ok).map(([key]) => key)
  const percent = Math.round((filled.length / checks.length) * 100)
  return { percent, complete: missing.length === 0, missing }
}

// ─── Lead ustuvorligi (Hot / Warm / Cold) ───────────────────────

export type LeadPriority = 'HOT' | 'WARM' | 'COLD'

// Configurable: qancha shart bajarilsa HOT/WARM deb hisoblanadi.
// Talabga ko'ra ("bu konfiguratsiyalanadigan bo'lishi kerak") — shu
// ikkita son o'zgartirilsa butun tizim moslashadi, kodning boshqa
// joyiga tegmasdan.
export const HOT_MIN_SIGNALS = 5
export const WARM_MIN_SIGNALS = 2

export interface PrioritySignals {
  profileComplete: boolean
  hasGoal: boolean
  viewedCount: number
  comparedCount: number
  savedCount: number
  hasSelectedCenter: boolean
  hasPhone: boolean
}

export function computePriority(s: PrioritySignals): LeadPriority {
  const hotSignals = [
    s.profileComplete,
    s.hasGoal,
    s.viewedCount >= 3,
    s.comparedCount >= 1,
    s.hasSelectedCenter,
    s.hasPhone,
  ].filter(Boolean).length

  if (hotSignals >= HOT_MIN_SIGNALS) return 'HOT'

  const warmSignals = [
    s.hasGoal,
    s.viewedCount >= 2 || s.savedCount >= 1,
    s.profileComplete || s.hasPhone,
  ].filter(Boolean).length

  if (warmSignals >= WARM_MIN_SIGNALS) return 'WARM'

  return 'COLD'
}

// ─── Lead vaqt jadvali (timeline) ───────────────────────────────

export interface TimelineEntry {
  at: Date
  labelUz: string
  labelRu: string
}

const EVENT_LABELS: Record<string, (props: Record<string, unknown>, instName?: string) => { uz: string; ru: string }> = {
  auth_completed: () => ({ uz: "Ro'yxatdan o'tdi / Tizimga kirdi", ru: 'Зарегистрировался / вошёл в систему' }),
  match_started: () => ({ uz: 'Moslik qidiruvini boshladi', ru: 'Начал подбор рекомендаций' }),
  match_completed: (p) => ({
    uz: `Moslik natijasini oldi${p.goal ? `: "${p.goal}"` : ''}${p.resultCount != null ? ` (${p.resultCount} ta natija)` : ''}`,
    ru: `Получил результат подбора${p.goal ? `: "${p.goal}"` : ''}${p.resultCount != null ? ` (${p.resultCount} результатов)` : ''}`,
  }),
  institution_view: (_p, name) => ({ uz: `Ko'rdi: ${name ?? "muassasa"}`, ru: `Просмотрел: ${name ?? 'учреждение'}` }),
  institution_save: (_p, name) => ({ uz: `Saqladi: ${name ?? 'muassasa'}`, ru: `Сохранил: ${name ?? 'учреждение'}` }),
  institution_compare: (_p, name) => ({ uz: `Solishtirishga qo'shdi: ${name ?? 'muassasa'}`, ru: `Добавил к сравнению: ${name ?? 'учреждение'}` }),
  search_result_click: (_p, name) => ({ uz: `Qidiruv natijasiga bosdi: ${name ?? 'muassasa'}`, ru: `Перешёл из поиска: ${name ?? 'учреждение'}` }),
  match_result_click: (_p, name) => ({ uz: `Tavsiyaga bosdi: ${name ?? 'muassasa'}`, ru: `Перешёл из рекомендации: ${name ?? 'учреждение'}` }),
  contact_click: (p, name) => ({ uz: `Kontaktga bosdi (${String(p.contactType ?? '')}): ${name ?? ''}`, ru: `Нажал на контакт (${String(p.contactType ?? '')}): ${name ?? ''}` }),
  search_query: (p) => ({ uz: `Qidirdi: "${String(p.query ?? '')}"`, ru: `Искал: "${String(p.query ?? '')}"` }),
  review_submitted: (_p, name) => ({ uz: `Sharh qoldirdi: ${name ?? 'muassasa'}`, ru: `Оставил отзыв: ${name ?? 'учреждение'}` }),
}

/** Timeline'da ko'rsatiladigan (jimi/texnik bo'lmagan) voqealar to'plami */
const TIMELINE_EVENTS = Object.keys(EVENT_LABELS)

// ─── Lead ro'yxati — qidiruv/filtr/saralash/sahifalash ──────────
//
// MASSHTABLASHISH HAQIDA: Priority va profil to'liqligi kabi
// HISOBLANADIGAN maydonlar bo'yicha filtrlash/saralash uchun avval
// nomzod foydalanuvchilar to'plami (SQL bilan) topiladi, so'ng ularning
// faoliyat hisoblari GURUHLI (groupBy) so'rovlar bilan BIR MARTA
// olinadi (har bir user uchun alohida so'rov EMAS — N+1 oldini olish),
// va yakuniy filtr/saralash/sahifalash xotirada bajariladi. Bu joriy
// masshtabda (o'nlab-yuzlab ro'yxatdan o'tgan foydalanuvchi) samarali;
// platforma minglab foydalanuvchiga yetganda alohida materiallashtirilgan
// jadval/keshga o'tish kerak bo'ladi — hozircha bu ortiqcha murakkablik.
const LEAD_CANDIDATE_SAFETY_LIMIT = 3000
const LEAD_EXPORT_SAFETY_LIMIT = 5000

export interface LeadListFilters {
  q?: string
  registrationMethod?: RegistrationMethod
  dateFrom?: Date
  dateTo?: Date
  regionId?: string
  cityId?: string
  goal?: string
  direction?: string // Institution.type qiymati ("IT_SCHOOL" va h.k.) — moslik so'rovidagi `type`
  format?: string // online | offline | hybrid
  selectedInstitutionId?: string
  status?: string
  priority?: LeadPriority
  hasPhone?: boolean
  profileComplete?: boolean
}

export type LeadSort =
  | 'newest' | 'oldest' | 'lastActivity' | 'mostActive'
  | 'priority' | 'profileCompletion' | 'status'

export interface LeadListItem {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  telegramUsername: string | null
  registrationMethod: RegistrationMethod
  createdAt: Date
  lastActiveAt: Date | null
  city: { nameUz: string; nameRu: string | null; region: { nameUz: string; nameRu: string } | null } | null
  leadStatus: string
  leadStatusUpdatedAt: Date | null
  priority: LeadPriority
  profileCompletion: ProfileCompletion
  goal: string | null
  direction: string | null
  format: string | null
  selectedCenter: string | null
  activityScore: number
}

async function resolveIntentUserIds(prisma: PrismaClient, filters: LeadListFilters): Promise<Set<string> | null> {
  // Hech qanday intent-asosli filtr yo'q bo'lsa — cheklov qo'yilmaydi (null = cheklovsiz)
  if (!filters.goal && !filters.direction && !filters.format && !filters.selectedInstitutionId) return null

  const sets: Set<string>[] = []

  if (filters.goal || filters.direction || filters.format) {
    const where: Record<string, unknown> = { event: 'match_completed', userId: { not: null } }
    if (filters.goal) where.properties = { path: ['goal'], string_contains: filters.goal }
    if (filters.direction) where.properties = { path: ['type'], equals: filters.direction }
    if (filters.format) where.properties = { path: ['format'], equals: filters.format }
    const rows = await prisma.leadEvent.findMany({ where, select: { userId: true }, distinct: ['userId'] })
    sets.push(new Set(rows.map((r) => r.userId!).filter(Boolean)))
  }

  if (filters.selectedInstitutionId) {
    const [trials, reviews] = await Promise.all([
      prisma.trialBooking.findMany({ where: { institutionId: filters.selectedInstitutionId, userId: { not: null } }, select: { userId: true } }),
      prisma.review.findMany({ where: { institutionId: filters.selectedInstitutionId }, select: { userId: true } }),
    ])
    sets.push(new Set([...trials.map((t) => t.userId!), ...reviews.map((r) => r.userId)].filter(Boolean)))
  }

  // Barcha faol filtrlar KESISHMASI (AND semantikasi)
  return sets.reduce((acc, s) => new Set([...acc].filter((id) => s.has(id))))
}

interface BatchDerived {
  viewedCount: number
  comparedCount: number
  savedCount: number
  hasGoal: boolean
  goal: string | null
  direction: string | null
  format: string | null
  hasSelectedCenter: boolean
  selectedCenter: string | null
}

async function batchComputeDerived(prisma: PrismaClient, userIds: string[]): Promise<Map<string, BatchDerived>> {
  const map = new Map<string, BatchDerived>()
  if (userIds.length === 0) return map
  for (const id of userIds) {
    map.set(id, { viewedCount: 0, comparedCount: 0, savedCount: 0, hasGoal: false, goal: null, direction: null, format: null, hasSelectedCenter: false, selectedCenter: null })
  }

  const [viewGroups, compareGroups, saveGroups, matchEvents, trialRows, reviewRows] = await Promise.all([
    prisma.leadEvent.groupBy({ by: ['userId'], where: { userId: { in: userIds }, event: 'institution_view' }, _count: { _all: true } }),
    prisma.leadEvent.groupBy({ by: ['userId'], where: { userId: { in: userIds }, event: 'institution_compare' }, _count: { _all: true } }),
    prisma.savedInstitution.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { _all: true } }),
    prisma.leadEvent.findMany({
      where: { userId: { in: userIds }, event: 'match_completed' },
      select: { userId: true, properties: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trialBooking.findMany({ where: { userId: { in: userIds } }, select: { userId: true, institution: { select: { nameUz: true } } } }),
    prisma.review.findMany({ where: { userId: { in: userIds } }, select: { userId: true, institution: { select: { nameUz: true } } } }),
  ])

  for (const g of viewGroups) map.get(g.userId!)!.viewedCount = g._count._all
  for (const g of compareGroups) map.get(g.userId!)!.comparedCount = g._count._all
  for (const g of saveGroups) map.get(g.userId!)!.savedCount = g._count._all

  // eng so'nggi match_completed — har userId uchun BIRINCHI uchraganini olamiz (createdAt desc tartiblangan)
  const seenIntent = new Set<string>()
  for (const e of matchEvents) {
    if (!e.userId || seenIntent.has(e.userId)) continue
    seenIntent.add(e.userId)
    const props = (e.properties ?? {}) as Record<string, unknown>
    const entry = map.get(e.userId)
    if (entry) {
      entry.hasGoal = typeof props.goal === 'string' && props.goal.trim().length > 0
      entry.goal = typeof props.goal === 'string' ? props.goal : null
      entry.direction = typeof props.type === 'string' ? props.type : null
      entry.format = typeof props.format === 'string' ? props.format : null
    }
  }

  for (const t of trialRows) {
    const entry = map.get(t.userId!)
    if (entry && !entry.hasSelectedCenter) { entry.hasSelectedCenter = true; entry.selectedCenter = t.institution.nameUz }
  }
  for (const r of reviewRows) {
    const entry = map.get(r.userId)
    if (entry && !entry.hasSelectedCenter) { entry.hasSelectedCenter = true; entry.selectedCenter = r.institution.nameUz }
  }

  return map
}

export async function queryLeads(
  prisma: PrismaClient,
  filters: LeadListFilters,
  sort: LeadSort,
  page: number,
  limit: number,
  exportMode = false,
): Promise<{ items: LeadListItem[]; total: number; truncated: boolean }> {
  const where: Record<string, unknown> = { role: 'USER' }

  if (filters.q) {
    const q = filters.q.trim()
    where.OR = [
      { id: q },
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { telegramUsername: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (filters.registrationMethod === 'TELEGRAM') where.telegramId = { not: null }
  if (filters.registrationMethod === 'GOOGLE') where.googleId = { not: null }
  if (filters.registrationMethod === 'PHONE') { where.telegramId = null; where.googleId = null; where.phone = { not: null } }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom && { gte: filters.dateFrom }),
      ...(filters.dateTo && { lte: filters.dateTo }),
    }
  }
  if (filters.cityId) where.cityId = filters.cityId
  if (filters.regionId) where.city = { regionId: filters.regionId }
  if (filters.status) where.leadStatus = filters.status
  if (filters.hasPhone === true) where.phone = { not: null }
  if (filters.hasPhone === false) where.phone = null

  const intentUserIds = await resolveIntentUserIds(prisma, filters)
  if (intentUserIds) {
    if (intentUserIds.size === 0) return { items: [], total: 0, truncated: false }
    where.id = { in: [...intentUserIds] }
  }

  const safetyLimit = exportMode ? LEAD_EXPORT_SAFETY_LIMIT : LEAD_CANDIDATE_SAFETY_LIMIT
  const needsDerivedFilter = filters.priority !== undefined || filters.profileComplete !== undefined
  const needsDerivedSort = sort === 'priority' || sort === 'profileCompletion' || sort === 'mostActive'

  const candidates = await prisma.user.findMany({
    where,
    select: {
      id: true, name: true, phone: true, email: true, telegramUsername: true,
      telegramId: true, googleId: true, createdAt: true, lastActiveAt: true,
      leadStatus: true, leadStatusUpdatedAt: true, cityId: true,
      city: { select: { nameUz: true, nameRu: true, region: { select: { nameUz: true, nameRu: true } } } },
    },
    orderBy: sort === 'oldest' ? { createdAt: 'asc' }
      : sort === 'lastActivity' ? { lastActiveAt: { sort: 'desc', nulls: 'last' } }
      : sort === 'status' ? { leadStatus: 'asc' }
      : { createdAt: 'desc' }, // newest bo'lmasa ham xavfsiz standart, keyin JS'da qayta saralanadi
    take: safetyLimit,
  })

  const truncated = candidates.length === safetyLimit

  const derivedMap = (needsDerivedFilter || needsDerivedSort || true)
    ? await batchComputeDerived(prisma, candidates.map((c) => c.id))
    : new Map<string, BatchDerived>()

  let items: LeadListItem[] = candidates.map((u) => {
    const derived = derivedMap.get(u.id)!
    const completion = computeProfileCompletion(u, derived.hasGoal)
    const priority = computePriority({
      profileComplete: completion.complete,
      hasGoal: derived.hasGoal,
      viewedCount: derived.viewedCount,
      comparedCount: derived.comparedCount,
      savedCount: derived.savedCount,
      hasSelectedCenter: derived.hasSelectedCenter,
      hasPhone: !!u.phone,
    })
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      telegramUsername: u.telegramUsername,
      registrationMethod: computeRegistrationMethod(u),
      createdAt: u.createdAt,
      lastActiveAt: u.lastActiveAt,
      city: u.city,
      leadStatus: u.leadStatus,
      leadStatusUpdatedAt: u.leadStatusUpdatedAt,
      priority,
      profileCompletion: completion,
      goal: derived.goal,
      direction: derived.direction,
      format: derived.format,
      selectedCenter: derived.selectedCenter,
      activityScore: derived.viewedCount + derived.comparedCount * 2 + derived.savedCount * 2 + (derived.hasSelectedCenter ? 5 : 0),
    }
  })

  if (filters.priority) items = items.filter((i) => i.priority === filters.priority)
  if (filters.profileComplete === true) items = items.filter((i) => i.profileCompletion.complete)
  if (filters.profileComplete === false) items = items.filter((i) => !i.profileCompletion.complete)

  switch (sort) {
    case 'priority': {
      const order: Record<LeadPriority, number> = { HOT: 0, WARM: 1, COLD: 2 }
      items.sort((a, b) => order[a.priority] - order[b.priority])
      break
    }
    case 'profileCompletion':
      items.sort((a, b) => b.profileCompletion.percent - a.profileCompletion.percent)
      break
    case 'mostActive':
      items.sort((a, b) => b.activityScore - a.activityScore)
      break
    case 'newest':
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      break
    default:
      break // boshqa saralashlar allaqachon SQL darajasida qo'llanildi
  }

  const total = items.length
  const paged = exportMode ? items : items.slice((page - 1) * limit, page * limit)

  return { items: paged, total, truncated }
}

export async function getLeadTimeline(prisma: PrismaClient, userId: string, limit = 100): Promise<TimelineEntry[]> {
  const [events, trialBookings] = await Promise.all([
    prisma.leadEvent.findMany({
      where: { userId, event: { in: TIMELINE_EVENTS } },
      select: {
        event: true, properties: true, createdAt: true,
        institution: { select: { nameUz: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.trialBooking.findMany({
      where: { userId },
      select: { createdAt: true, institution: { select: { nameUz: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const fromEvents: TimelineEntry[] = events.map((e) => {
    const build = EVENT_LABELS[e.event]
    const props = (e.properties ?? {}) as Record<string, unknown>
    const label = build ? build(props, e.institution?.nameUz) : { uz: e.event, ru: e.event }
    return { at: e.createdAt, labelUz: label.uz, labelRu: label.ru }
  })

  const fromBookings: TimelineEntry[] = trialBookings.map((b) => ({
    at: b.createdAt,
    labelUz: `Probnoy darsga yozildi: ${b.institution.nameUz}`,
    labelRu: `Записался на пробный урок: ${b.institution.nameUz}`,
  }))

  return [...fromEvents, ...fromBookings].sort((a, b) => b.at.getTime() - a.at.getTime())
}
