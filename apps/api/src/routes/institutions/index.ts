import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { listInstitutionsQuerySchema, nearbyQuerySchema, compareQuerySchema } from '../../schemas/institutions'
import type { InstitutionStatus } from '@prisma/client'
import { normalizeQuery } from '../../utils/transliterate'
import { expandSearchTerms } from '../../utils/subjectSynonyms'
import { notifyUser } from '../../services/notify'

/**
 * Institutions routes
 *
 * GET  🔓 /institutions                     — Ro'yxat (filter, sort, paginate)
 * GET  🔓 /institutions/nearby              — Koordinat bo'yicha
 * GET  🔓 /institutions/compare             — 2-3 ta solishtirish
 * GET  🔓 /institutions/:slug               — To'liq profil
 * POST 🔑 /institutions/:id/save            — Saqlash/olib tashlash (toggle)
 * POST 🔓 /institutions/:id/view            — Ko'rishlar (analytics)
 * POST 🔓 /institutions/:id/trial-bookings  — Bepul probnoy darsga bron (UTP#2)
 */
export default async function institutionRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  // Muassasa kartochkasi uchun umumiy select (N+1 yo'q)
  const cardSelect = {
    id: true,
    nameUz: true,
    nameRu: true,
    slug: true,
    type: true,
    status: true,
    avgRating: true,
    reviewCount: true,
    viewCount: true,
    isVerified: true,
    address: true,
    lat: true,
    lng: true,
    telegram: true,
    city:   { select: { id: true, nameUz: true, nameRu: true } },
    region: { select: { id: true, nameUz: true, nameRu: true } },
    pricing: { select: { monthlyMin: true, monthlyMax: true, currency: true } },
    details: {
      select: {
        studentCount: true,
        teacherCount: true,
        foundedYear:  true,
        programs:     true,
      },
    },
    media: {
      where: { type: 'IMAGE' as const },
      select: { url: true, thumbnailUrl: true },
      orderBy: { sortOrder: 'asc' as const },
      take: 1,
    },
  } as const

  // ─────────────────────────────────────────────
  // GET /institutions
  // ─────────────────────────────────────────────

  fastify.get('/institutions', async (request, reply) => {
    const query = listInstitutionsQuerySchema.parse(request.query)
    const { page, limit, sortBy, minRating, monthlyMax, type, cityId, regionId, q, subject } = query
    const skip = (page - 1) * limit
    const qTrimmed = q?.trim()

    // 1) Kirill → lotin transliteratsiya
    const { latin: latinQ, hasCyrillic: isCyrillic } = qTrimmed
      ? normalizeQuery(qTrimmed)
      : { latin: '', hasCyrillic: false }

    // 2) Sinonimlari kengaytirish: "химия" → ["химия","кимё","kimyo","chemistry",...]
    //    Transliteratsiyalangan variantni ham qo'shamiz
    const baseTerms = qTrimmed ? expandSearchTerms(qTrimmed) : []
    const allTerms = isCyrillic && latinQ && latinQ !== qTrimmed
      ? [...new Set([...baseTerms, ...expandSearchTerms(latinQ)])]
      : baseTerms

    // 3) Fan (programs) bo'yicha qisman qidiruv — barcha sinonim variantlar uchun
    let programMatchIds: string[] = []
    if (allTerms.length > 0) {
      // Prisma.join bilan xavfsiz dinamik OR shartlar
      const conditions = Prisma.join(
        allTerms.map(t => Prisma.sql`prog ILIKE ${'%' + t + '%'}`),
        ' OR ',
      )
      const rows = await prisma.$queryRaw<{ institutionId: string }[]>`
        SELECT d."institutionId"
        FROM "InstitutionDetail" d
        WHERE EXISTS (
          SELECT 1 FROM unnest(d.programs) AS prog
          WHERE ${conditions}
        )
      `
      programMatchIds = rows.map(r => r.institutionId)
    }

    // 4) Nom va manzil bo'yicha OR shartlar — barcha sinonim variantlar
    const nameOrConditions = allTerms.length > 0
      ? [
          // Asl so'rov bilan manzil qidiruvi (sinonim kengaytirish kerak emas)
          { address: { contains: qTrimmed!, mode: 'insensitive' as const } },
          // Barcha sinonim variantlar bilan nom qidiruvi
          ...allTerms.flatMap(t => [
            { nameUz: { contains: t, mode: 'insensitive' as const } },
            { nameRu: { contains: t, mode: 'insensitive' as const } },
          ]),
          ...(programMatchIds.length > 0 ? [{ id: { in: programMatchIds } }] : []),
        ]
      : []

    const where = {
      status: { in: ['ACTIVE', 'PREMIUM'] as InstitutionStatus[] },
      ...(type       && { type }),
      ...(cityId     && { cityId }),
      ...(regionId   && { regionId }),
      ...(minRating  && { avgRating: { gte: minRating } }),
      ...(monthlyMax && { pricing: { monthlyMin: { lte: monthlyMax } } }),

      // Nom, manzil, va program bo'yicha qisman qidiruv (katta-kichik harf farqsiz)
      // Kirill yozuvida yozilgan so'rovlar ham lotin yozuvidagi ma'lumotlarda topiladi
      ...(qTrimmed && { OR: nameOrConditions }),

      // Fan bo'yicha exact filter (chip orqali tanlanadi)
      ...(subject?.trim() && {
        details: { programs: { hasSome: [subject.trim()] } },
      }),
    }

    // UTP#5 — Narx-sifat indeksi: Prisma darajasida hisoblab bo'lmaydigan
    // formula (reyting/narx) uchun kandidatlarni JS'da hisoblab, saralab,
    // qo'lda sahifalaymiz. Real hajm (~40-50 muassasa) uchun bu yetarli.
    if (sortBy === 'value') {
      const candidates = await prisma.institution.findMany({
        where: { ...where, pricing: { monthlyMin: { not: null } } },
        select: cardSelect,
        take: 500,
      })

      const rated = candidates.filter((c) => c.avgRating != null)
      const globalAvg = rated.length > 0
        ? rated.reduce((s, c) => s + (c.avgRating ?? 0), 0) / rated.length
        : 4.0
      const BAYES_PRIOR = 10

      const withScore = candidates.map((c) => {
        const n = c.reviewCount
        const r = c.avgRating
        // Bayesian silliqlangan reyting — kam sharhli 5.0 ko'p sharhli 4.6'dan
        // yuqori chiqmasin (xuddi EduFit Fit Score'dagi "Sifat" komponenti kabi)
        const adjustedRating = r != null ? (BAYES_PRIOR * globalAvg + r * n) / (BAYES_PRIOR + n) : globalAvg
        const priceIn100k = (c.pricing?.monthlyMin ?? 1) / 100_000
        const valueScore = adjustedRating / Math.max(priceIn100k, 0.1)
        return { ...c, valueScore }
      })

      withScore.sort((a, b) => b.valueScore - a.valueScore)

      const total = withScore.length
      const paged = withScore.slice(skip, skip + limit)

      return reply.send({
        data: paged,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      })
    }

    const orderBy = buildOrderBy(sortBy)

    const [institutions, total] = await Promise.all([
      prisma.institution.findMany({ where, select: cardSelect, orderBy, skip, take: limit }),
      prisma.institution.count({ where }),
    ])

    return reply.send({
      data: institutions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // ─────────────────────────────────────────────
  // GET /institutions/subjects
  // Barcha mavjud fanlar ro'yxati (programs)
  // ─────────────────────────────────────────────
  fastify.get('/institutions/subjects', async (_request, reply) => {
    const rows = await prisma.institutionDetail.findMany({
      where: { NOT: { programs: { isEmpty: true } } },
      select: { programs: true },
    })
    const all = rows.flatMap(r => r.programs)
    // Takrorlarsiz, tartiblab
    const unique = [...new Set(all)].sort((a, b) => a.localeCompare(b, 'uz'))
    return reply.send({ data: unique })
  })

  // ─────────────────────────────────────────────
  // GET /institutions/nearby
  // Haversine formula bilan masofani hisoblash
  // ─────────────────────────────────────────────

  fastify.get('/institutions/nearby', async (request, reply) => {
    const { lat, lng, radius, type, limit } = nearbyQuerySchema.parse(request.query)

    // PostgreSQL'da Haversine formula
    // 6371000 — Yer radiusi (metr)
    const radiusKm = radius / 1000

    const typeFilter = type ? Prisma.sql`AND type = ${type}::text` : Prisma.empty

    const institutions = await prisma.$queryRaw<
      Array<{ id: string; distance: number }>
    >`
      SELECT id, distance FROM (
        SELECT id,
          (6371000 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(lat)) *
              cos(radians(lng) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(lat))
            )
          )) AS distance
        FROM "Institution"
        WHERE status IN ('ACTIVE', 'PREMIUM')
          AND lat IS NOT NULL AND lng IS NOT NULL
          ${typeFilter}
      ) subq
      WHERE distance <= ${radius}
      ORDER BY distance ASC
      LIMIT ${limit}
    `

    const ids = institutions.map((i) => i.id)
    const distanceMap = new Map(institutions.map((i) => [i.id, Math.round(i.distance)]))

    const details = await prisma.institution.findMany({
      where: { id: { in: ids } },
      select: cardSelect,
    })

    // Masofani qo'shib tartiblaymiz
    const sorted = ids
      .map((id) => {
        const inst = details.find((d) => d.id === id)
        return inst ? { ...inst, distance: distanceMap.get(id) } : null
      })
      .filter(Boolean)

    return reply.send({ data: sorted, meta: { radiusKm, total: sorted.length } })
  })

  // ─────────────────────────────────────────────
  // GET /institutions/compare?ids=id1,id2,id3
  // ─────────────────────────────────────────────

  fastify.get('/institutions/compare', async (request, reply) => {
    const { ids } = compareQuerySchema.parse(request.query)

    const institutions = await prisma.institution.findMany({
      where: {
        id: { in: ids },
        status: { in: ['ACTIVE', 'PREMIUM'] },
      },
      select: {
        id: true,
        nameUz: true,
        nameRu: true,
        slug: true,
        type: true,
        avgRating: true,
        reviewCount: true,
        viewCount: true,
        isVerified: true,
        address: true,
        telegram: true,
        city: { select: { nameUz: true, nameRu: true } },
        details: {
          select: {
            descriptionUz: true,
            descriptionRu: true,
            foundedYear: true,
            studentCount: true,
            teacherCount: true,
            minAge: true,
            maxAge: true,
            languages: true,
            programs: true,
            shifts: true,
          },
        },
        pricing: {
          select: { monthlyMin: true, monthlyMax: true, currency: true, paymentMethods: true },
        },
        features: { select: { key: true, value: true } },
        media: {
          where: { type: 'IMAGE' },
          select: { url: true, thumbnailUrl: true },
          take: 1,
        },
      },
    })

    return reply.send({ data: institutions })
  })

  // ─────────────────────────────────────────────
  // GET /institutions/:slug
  // To'liq profil + oxirgi 5 ta APPROVED sharh
  // ─────────────────────────────────────────────

  fastify.get<{ Params: { slug: string } }>(
    '/institutions/:slug',
    async (request, reply) => {
      const { slug } = request.params

      const institution = await prisma.institution.findUnique({
        where: { slug },
        select: {
          id: true,
          nameUz: true,
          nameRu: true,
          slug: true,
          type: true,
          status: true,
          phone: true,
          phone2: true,
          email: true,
          website: true,
          telegram: true,
          instagram: true,
          address: true,
          lat: true,
          lng: true,
          isVerified: true,
          avgRating: true,
          reviewCount: true,
          viewCount: true,
          city: { select: { id: true, nameUz: true, nameRu: true } },
          details: {
            select: {
              descriptionUz: true,
              descriptionRu: true,
              foundedYear: true,
              studentCount: true,
              teacherCount: true,
              minAge: true,
              maxAge: true,
              languages: true,
              programs: true,
              shifts: true,
              specializations: true,
              achievements: true,
            },
          },
          pricing: {
            select: {
              monthlyMin: true,
              monthlyMax: true,
              yearlyMin: true,
              yearlyMax: true,
              currency: true,
              paymentMethods: true,
              hasDiscount: true,
              discountNote: true,
            },
          },
          media: {
            select: { id: true, url: true, thumbnailUrl: true, type: true, caption: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' },
          },
          features: { select: { key: true, value: true, note: true } },
          accreditations: {
            select: { id: true, name: true, issuedBy: true, issuedAt: true, expiresAt: true },
          },
          subscription: { select: { plan: true, isActive: true } },
          reviews: {
            where: { status: 'APPROVED' },
            select: {
              id: true,
              overallRating: true,
              teacherRating: true,
              facilityRating: true,
              valueRating: true,
              serviceRating: true,
              atmosphereRating: true,
              title: true,
              body: true,
              isAnonymous: true,
              outcomeText: true,
              isVerified: true,
              helpfulCount: true,
              createdAt: true,
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      })

      if (!institution) {
        return reply.status(404).send({ error: 'Muassasa topilmadi' })
      }

      if (!['ACTIVE', 'PREMIUM'].includes(institution.status)) {
        return reply.status(404).send({ error: 'Muassasa topilmadi' })
      }

      // Anonymous sharhlar uchun user ma'lumotlarini yashirish
      const data = {
        ...institution,
        reviews: institution.reviews.map((r) => ({
          ...r,
          user: r.isAnonymous ? null : r.user,
        })),
      }

      return reply.send({ data })
    },
  )

  // ─────────────────────────────────────────────
  // POST /institutions/:id/save (toggle)
  // Auth required
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/institutions/:id/save',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: institutionId } = request.params
      const { id: userId } = request.user as { id: string }

      const institution = await prisma.institution.findUnique({
        where: { id: institutionId },
        select: { id: true },
      })

      if (!institution) {
        return reply.status(404).send({ error: 'Muassasa topilmadi' })
      }

      const existing = await prisma.savedInstitution.findUnique({
        where: { userId_institutionId: { userId, institutionId } },
      })

      if (existing) {
        // Toggle: olib tashlash
        await prisma.$transaction([
          prisma.savedInstitution.delete({
            where: { userId_institutionId: { userId, institutionId } },
          }),
          prisma.institution.update({
            where: { id: institutionId },
            data: { saveCount: { decrement: 1 } },
          }),
        ])
        return reply.send({ saved: false, message: "Saqlangan ro'yxatdan olib tashlandi" })
      } else {
        // Saqlash
        await prisma.$transaction([
          prisma.savedInstitution.create({ data: { userId, institutionId } }),
          prisma.institution.update({
            where: { id: institutionId },
            data: { saveCount: { increment: 1 } },
          }),
        ])
        return reply.send({ saved: true, message: "Saqlangan ro'yxatga qo'shildi" })
      }
    },
  )

  // ─────────────────────────────────────────────
  // POST /institutions/:id/view
  // Analytics event — fire and forget
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/institutions/:id/view',
    async (request, reply) => {
      const { id: institutionId } = request.params

      // JWT ixtiyoriy
      let userId: string | undefined
      try {
        await request.jwtVerify()
        userId = (request.user as { id: string }).id
      } catch {
        // Anonymous ko'rish
      }

      // Fire and forget — client kutmasin
      void prisma.$transaction([
        prisma.analyticsEvent.create({
          data: {
            institutionId,
            eventType: 'view',
            userId: userId ?? null,
            ip: request.ip,
            userAgent: request.headers['user-agent'] ?? null,
            referrer: request.headers.referer ?? null,
          },
        }),
        prisma.institution.update({
          where: { id: institutionId },
          data: { viewCount: { increment: 1 } },
        }),
      ])

      return reply.send({ success: true })
    },
  )

  // ─────────────────────────────────────────────
  // POST /institutions/:id/claim
  // Hamkor (muassasa egasi) egalik so'rovi yuboradi.
  // Korporativ email talab qilinmaydi — telefon/Telegram/Google
  // orqali kirgan har qanday foydalanuvchi so'rov yubora oladi,
  // tasdiqlash admin moderatsiyasi orqali amalga oshiriladi.
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/institutions/:id/claim',
    {
      preHandler: [fastify.authenticate],
      config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const { id: institutionId } = request.params
      const { id: userId } = request.user as { id: string }

      const { note, contactPhone, position } = z.object({
        // Ariza izohi: lavozim, muassasa haqida qo'shimcha ma'lumot
        note:         z.string().max(1000).optional(),
        contactPhone: z.string().max(20).optional(),
        position:     z.string().max(100).optional(),
      }).parse(request.body ?? {})

      const institution = await prisma.institution.findUnique({
        where: { id: institutionId },
        select: { id: true, nameUz: true },
      })
      if (!institution) {
        return reply.status(404).send({ error: 'Muassasa topilmadi' })
      }

      // Muassasa allaqachon boshqa ega tomonidan tasdiqlangan bo'lsa
      const approved = await prisma.institutionClaim.findFirst({
        where: { institutionId, status: 'APPROVED' },
        select: { id: true },
      })
      if (approved) {
        return reply.status(409).send({
          error: "Bu muassasa allaqachon egasi tomonidan boshqarilmoqda. Xatolik deb hisoblasangiz, Telegram orqali murojaat qiling.",
        })
      }

      // Shu foydalanuvchining kutilayotgan so'rovi bormi?
      const pending = await prisma.institutionClaim.findFirst({
        where: { institutionId, userId, status: 'PENDING' },
        select: { id: true },
      })
      if (pending) {
        return reply.status(409).send({
          error: "So'rovingiz allaqachon yuborilgan va ko'rib chiqilmoqda",
        })
      }

      const claim = await prisma.institutionClaim.create({
        data: {
          institutionId,
          userId,
          note: [
            position && `Lavozim: ${position}`,
            contactPhone && `Aloqa: ${contactPhone}`,
            note,
          ].filter(Boolean).join('\n') || null,
        },
        select: { id: true, status: true, createdAt: true },
      })

      return reply.status(201).send({
        data: claim,
        message: "So'rovingiz qabul qilindi! Moderatorlarimiz 1 ish kuni ichida ko'rib chiqib, siz bilan bog'lanadi.",
      })
    },
  )

  // ─────────────────────────────────────────────
  // GET /institutions/claims/me
  // Foydalanuvchining o'z egalik so'rovlari holati
  // ─────────────────────────────────────────────

  fastify.get(
    '/institutions/claims/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: userId } = request.user as { id: string }

      const claims = await prisma.institutionClaim.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          institution: { select: { id: true, nameUz: true, slug: true } },
        },
      })

      return reply.send({ data: claims })
    },
  )

  // ─────────────────────────────────────────────
  // POST /institutions/:id/trial-bookings
  // UTP#2: bepul probnoy darsga bron — mehmon ham, auth bo'lgan ham
  // (login talab qilinmaydi, konversiya to'sig'i bo'lmasin uchun)
  // ─────────────────────────────────────────────

  const trialBookingSchema = z.object({
    name:          z.string().min(2, 'Ism kamida 2 ta belgi').max(100),
    phone:         z.string().min(9, "Noto'g'ri telefon raqam").max(20),
    preferredTime: z.string().max(200).optional(),
    note:          z.string().max(500).optional(),
  })

  fastify.post<{ Params: { id: string } }>(
    '/institutions/:id/trial-bookings',
    { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const { id: institutionId } = request.params
      const body = trialBookingSchema.parse(request.body)

      const institution = await prisma.institution.findUnique({
        where: { id: institutionId },
        select: { id: true, nameUz: true },
      })
      if (!institution) {
        return reply.status(404).send({ error: 'Muassasa topilmadi' })
      }

      // Auth bo'lsa userId biriktiramiz, bo'lmasa mehmon sifatida qabul qilinadi
      let userId: string | undefined
      try {
        await request.jwtVerify()
        userId = (request.user as { id: string }).id
      } catch {
        // Mehmon — davom etamiz
      }

      const booking = await prisma.trialBooking.create({
        data: { institutionId, userId, ...body },
        select: { id: true, status: true, createdAt: true },
      })

      // Muassasa tasdiqlangan egasiga bildirishnoma (B2B qiymat — UTP#4 infratuzilmasi qayta ishlatiladi)
      const owner = await prisma.institutionClaim.findFirst({
        where: { institutionId, status: 'APPROVED' },
        select: { userId: true },
      })
      if (owner) {
        notifyUser(prisma, {
          userId: owner.userId,
          type: 'trial_booking_received',
          title: 'Yangi probnoy dars so\'rovi',
          body: `${body.name} (${body.phone}) — ${institution.nameUz}'ga bepul probnoy darsga yozildi.`,
          data: { bookingId: booking.id, institutionId },
        })
      }

      return reply.status(201).send({
        data: booking,
        message: "So'rovingiz qabul qilindi! Muassasa siz bilan tez orada bog'lanadi.",
      })
    },
  )
}

// sortBy → Prisma orderBy
function buildOrderBy(sortBy: string) {
  switch (sortBy) {
    case 'price_asc':  return { pricing: { monthlyMin: 'asc'  as const } }
    case 'price_desc': return { pricing: { monthlyMin: 'desc' as const } }
    case 'newest':     return { createdAt: 'desc' as const }
    case 'popular':    return { viewCount:  'desc' as const }
    default:           return { avgRating:  'desc' as const }
  }
}
