import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { subDays, startOfDay, format } from 'date-fns'

/**
 * Dashboard (B2B) main routes
 * Barcha route'lar 🏢 INSTITUTION_OWNER roli talab qiladi
 *
 * GET  /dashboard/overview             — KPI va umumiy statistika
 * GET  /dashboard/analytics/chart      — Kunlik tashriflar grafigi
 * GET  /dashboard/profile-completeness — Profil to'liqligi
 * PUT  /dashboard/institution          — Profil yangilash
 * POST /dashboard/media                — Rasm yuklash
 * DELETE /dashboard/media/:id         — Mediani o'chirish
 * GET  /dashboard/subscription         — Tarif ma'lumoti
 */
export default async function dashboardRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireB2B)

  // institutionId ni har bir handlerda tekshiruvchi helper
  async function getInstitutionId(request: { user: unknown }, reply: { status: (c: number) => { send: (v: unknown) => unknown } }) {
    const user = request.user as { institutionId?: string }
    if (!user.institutionId) {
      reply.status(403).send({ error: "Siz hech qanday muassasaga bog'lanmagansiz" })
      return null
    }
    return user.institutionId
  }

  // ─────────────────────────────────────────────
  // GET /dashboard/overview
  // ─────────────────────────────────────────────

  fastify.get('/dashboard/overview', async (request, reply) => {
    const institutionId = await getInstitutionId(request, reply)
    if (!institutionId) return

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [institution, viewsThisMonth, viewsLastMonth, savesThisMonth, recentReviews] =
      await Promise.all([
        prisma.institution.findUnique({
          where: { id: institutionId },
          select: {
            id: true,
            nameUz: true,
            slug: true,
            status: true,
            avgRating: true,
            reviewCount: true,
          },
        }),
        prisma.analyticsEvent.count({
          where: { institutionId, eventType: 'view', createdAt: { gte: startOfMonth } },
        }),
        prisma.analyticsEvent.count({
          where: {
            institutionId,
            eventType: 'view',
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
        }),
        prisma.analyticsEvent.count({
          where: { institutionId, eventType: 'save', createdAt: { gte: startOfMonth } },
        }),
        prisma.review.findMany({
          where: { institutionId },
          select: {
            id: true,
            overallRating: true,
            title: true,
            body: true,
            status: true,
            isAnonymous: true,
            createdAt: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ])

    if (!institution) {
      return reply.status(404).send({ error: 'Muassasa topilmadi' })
    }

    // O'sish foizi
    const viewsGrowth =
      viewsLastMonth === 0
        ? 100
        : Math.round(((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100)

    return reply.send({
      data: {
        institution,
        kpi: {
          viewsThisMonth,
          viewsGrowth,
          savesThisMonth,
          reviewCount: institution.reviewCount,
          avgRating: institution.avgRating,
        },
        recentReviews: recentReviews.map((r) => ({
          ...r,
          user: r.isAnonymous ? null : r.user,
        })),
      },
    })
  })

  // ─────────────────────────────────────────────
  // GET /dashboard/analytics/chart?days=7|30|90
  // ─────────────────────────────────────────────

  fastify.get('/dashboard/analytics/chart', async (request, reply) => {
    const institutionId = await getInstitutionId(request, reply)
    if (!institutionId) return

    const { days } = z.object({
      days: z.coerce.number().refine((v) => [7, 30, 90].includes(v), {
        message: 'days 7, 30 yoki 90 bo\'lishi kerak',
      }).default(30),
    }).parse(request.query)

    const startDate = startOfDay(subDays(new Date(), days - 1))

    // DATE_TRUNC('day') bilan kunlik aggregatsiya (Prisma groupBy timestamp'ni aniq guruhlamaydi)
    const rawRows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
      FROM "AnalyticsEvent"
      WHERE "institutionId" = ${institutionId}
        AND "eventType" = 'view'
        AND "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `

    const countByDate = new Map<string, number>()
    for (const row of rawRows) {
      const dateKey = format(row.day, 'yyyy-MM-dd')
      countByDate.set(dateKey, Number(row.count))
    }

    // Barcha kunlarni (0 ham) to'ldirish
    const data: Array<{ date: string; count: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      data.push({ date, count: countByDate.get(date) ?? 0 })
    }

    return reply.send({ data })
  })

  // ─────────────────────────────────────────────
  // GET /dashboard/profile-completeness
  // ─────────────────────────────────────────────

  fastify.get('/dashboard/profile-completeness', async (request, reply) => {
    const institutionId = await getInstitutionId(request, reply)
    if (!institutionId) return

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        phone: true,
        telegram: true,
        instagram: true,
        website: true,
        address: true,
        lat: true,
        details: { select: { descriptionUz: true, foundedYear: true, studentCount: true } },
        pricing: { select: { monthlyMin: true } },
        media: { select: { id: true }, take: 1 },
        accreditations: { select: { id: true }, take: 1 },
      },
    })

    if (!institution) {
      return reply.status(404).send({ error: 'Muassasa topilmadi' })
    }

    // To'liqlik ballari
    const checks = [
      { key: 'phone',         done: !!institution.phone,                           points: 10, label: 'Telefon raqam' },
      { key: 'telegram',      done: !!institution.telegram,                        points: 10, label: 'Telegram havolasi' },
      { key: 'address',       done: !!institution.address,                         points: 10, label: 'Manzil' },
      { key: 'location',      done: !!institution.lat,                             points: 10, label: 'Xaritada joylashuv' },
      { key: 'description',   done: !!institution.details?.descriptionUz,          points: 15, label: 'Tavsif (UZ)' },
      { key: 'founding',      done: !!institution.details?.foundedYear,            points: 5,  label: 'Tashkil etilgan yil' },
      { key: 'students',      done: !!institution.details?.studentCount,           points: 5,  label: "O'quvchilar soni" },
      { key: 'pricing',       done: !!institution.pricing?.monthlyMin,             points: 15, label: 'Narxlar' },
      { key: 'photo',         done: institution.media.length > 0,                  points: 15, label: 'Rasm' },
      { key: 'accreditation', done: institution.accreditations.length > 0,         points: 5,  label: 'Akkreditatsiya' },
    ]

    const totalPoints = checks.reduce((s, c) => s + c.points, 0)
    const earnedPoints = checks.filter((c) => c.done).reduce((s, c) => s + c.points, 0)
    const percentage = Math.round((earnedPoints / totalPoints) * 100)

    const recommendations = checks
      .filter((c) => !c.done)
      .map((c) => ({ key: c.key, label: c.label, points: c.points }))

    return reply.send({
      data: { percentage, earnedPoints, totalPoints, checks, recommendations },
    })
  })

  // ─────────────────────────────────────────────
  // PUT /dashboard/institution — Profil yangilash
  // ─────────────────────────────────────────────

  const updateInstitutionSchema = z.object({
    nameUz:    z.string().min(2).max(200).optional(),
    nameRu:    z.string().max(200).optional(),
    phone:     z.string().optional(),
    phone2:    z.string().optional(),
    email:     z.string().email().optional(),
    website:   z.string().url().optional(),
    telegram:  z.string().optional(),
    instagram: z.string().optional(),
    address:   z.string().optional(),
    lat:       z.number().optional(),
    lng:       z.number().optional(),
    details: z.object({
      descriptionUz:   z.string().max(3000).optional(),
      descriptionRu:   z.string().max(3000).optional(),
      foundedYear:     z.number().int().min(1900).max(new Date().getFullYear()).optional(),
      studentCount:    z.number().int().positive().optional(),
      teacherCount:    z.number().int().positive().optional(),
      minAge:          z.number().int().min(0).max(99).optional(),
      maxAge:          z.number().int().min(0).max(99).optional(),
      languages:       z.array(z.string()).optional(),
      programs:        z.array(z.string()).optional(),
      shifts:          z.array(z.string()).optional(),
    }).optional(),
    pricing: z.object({
      monthlyMin:     z.number().int().positive().optional(),
      monthlyMax:     z.number().int().positive().optional(),
      paymentMethods: z.array(z.string()).optional(),
      hasDiscount:    z.boolean().optional(),
      discountNote:   z.string().max(200).optional(),
    }).optional(),
  })

  fastify.put('/dashboard/institution', async (request, reply) => {
    const institutionId = await getInstitutionId(request, reply)
    if (!institutionId) return

    const { details, pricing, ...mainFields } = updateInstitutionSchema.parse(request.body)

    await prisma.$transaction(async (tx) => {
      if (Object.keys(mainFields).length > 0) {
        await tx.institution.update({ where: { id: institutionId }, data: mainFields })
      }

      if (details) {
        await tx.institutionDetail.upsert({
          where: { institutionId },
          create: { institutionId, ...details },
          update: details,
        })
      }

      if (pricing) {
        await tx.institutionPricing.upsert({
          where: { institutionId },
          create: { institutionId, ...pricing },
          update: pricing,
        })
      }
    })

    return reply.send({ success: true, message: 'Profil yangilandi' })
  })

  // ─────────────────────────────────────────────
  // DELETE /dashboard/media/:id
  // ─────────────────────────────────────────────

  fastify.delete<{ Params: { id: string } }>(
    '/dashboard/media/:id',
    async (request, reply) => {
      const institutionId = await getInstitutionId(request, reply)
      if (!institutionId) return

      const { id: mediaId } = request.params

      const media = await prisma.institutionMedia.findFirst({
        where: { id: mediaId, institutionId },
      })

      if (!media) {
        return reply.status(404).send({ error: 'Fayl topilmadi' })
      }

      await prisma.institutionMedia.delete({ where: { id: mediaId } })

      // TODO: R2'dan ham o'chirish (storage.ts orqali)

      return reply.send({ success: true, message: 'Fayl o\'chirildi' })
    },
  )

  // ─────────────────────────────────────────────
  // GET /dashboard/subscription
  // ─────────────────────────────────────────────

  fastify.get('/dashboard/subscription', async (request, reply) => {
    const institutionId = await getInstitutionId(request, reply)
    if (!institutionId) return

    const subscription = await prisma.subscription.findUnique({
      where: { institutionId },
      select: {
        plan: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
        features: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { amountUzs: true, paymentMethod: true, status: true, paidAt: true },
        },
      },
    })

    return reply.send({ data: subscription ?? { plan: 'FREE', isActive: false } })
  })
}
