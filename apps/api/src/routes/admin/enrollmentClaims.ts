import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { EnrollmentClaimStatus } from '@prisma/client'
import { approveEnrollmentClaim, rejectEnrollmentClaim } from '../../services/enrollmentClaimService'
import { logAdminAction } from '../../services/auditLog'

/**
 * Admin: "Men kurs sotib oldim" xabarlari moderatsiyasi.
 *
 * GET  🛡 /admin/enrollment-claims          — ro'yxat (status/muassasa/qidiruv filtri)
 * GET  🛡 /admin/enrollment-claims/summary  — muassasa bo'yicha APPROVED soni
 *   (markazga hisob-kitob/invoyce qilishda ishlatiladi — narx alohida
 *   kelishiladi, bu yerda faqat TASDIQLANGAN, haqiqiy foydalanuvchidan
 *   kelgan sonlar ko'rsatiladi, markazning o'z hisoboti emas)
 * POST 🛡 /admin/enrollment-claims/:id/approve — bonus beriladi
 * POST 🛡 /admin/enrollment-claims/:id/reject  — sabab majburiy
 */
export default async function adminEnrollmentClaimRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // ─────────────────────────────────────────────
  // GET /admin/enrollment-claims
  // ─────────────────────────────────────────────

  const listQuerySchema = z.object({
    status:        z.nativeEnum(EnrollmentClaimStatus).optional(),
    institutionId: z.string().optional(),
    q:             z.string().optional(), // foydalanuvchi ism/telefon bo'yicha
    page:          z.coerce.number().int().min(1).default(1),
    limit:         z.coerce.number().int().min(1).max(100).default(20),
  })

  fastify.get('/admin/enrollment-claims', async (request, reply) => {
    const { status, institutionId, q, page, limit } = listQuerySchema.parse(request.query)
    const skip = (page - 1) * limit

    const where = {
      ...(status && { status }),
      ...(institutionId && { institutionId }),
      ...(q && {
        user: { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q } }] },
      }),
    }

    const [claims, total] = await Promise.all([
      prisma.enrollmentClaim.findMany({
        where,
        select: {
          id: true, courseNote: true, receiptUrl: true, status: true,
          reviewNote: true, reviewedAt: true, createdAt: true,
          user:        { select: { id: true, name: true, phone: true, telegramUsername: true } },
          institution: { select: { id: true, nameUz: true, slug: true } },
          reward:      { select: { amount: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.enrollmentClaim.count({ where }),
    ])

    return reply.send({
      data: claims,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // ─────────────────────────────────────────────
  // GET /admin/enrollment-claims/summary
  // ─────────────────────────────────────────────

  const summaryQuerySchema = z.object({
    from: z.string().datetime().optional(),
    to:   z.string().datetime().optional(),
  })

  fastify.get('/admin/enrollment-claims/summary', async (request, reply) => {
    const { from, to } = summaryQuerySchema.parse(request.query)

    const createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    }

    const approved = await prisma.enrollmentClaim.groupBy({
      by: ['institutionId'],
      where: { status: 'APPROVED', ...(Object.keys(createdAt).length > 0 && { createdAt }) },
      _count: true,
    })

    const institutionIds = approved.map((a) => a.institutionId)
    const institutions = await prisma.institution.findMany({
      where: { id: { in: institutionIds } },
      select: { id: true, nameUz: true, slug: true, phone: true },
    })
    const byId = new Map(institutions.map((i) => [i.id, i]))

    const rows = approved
      .map((a) => ({
        institution: byId.get(a.institutionId) ?? null,
        approvedCount: a._count,
      }))
      .filter((r) => r.institution)
      .sort((a, b) => b.approvedCount - a.approvedCount)

    return reply.send({ data: rows })
  })

  // ─────────────────────────────────────────────
  // POST /admin/enrollment-claims/:id/approve
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>('/admin/enrollment-claims/:id/approve', async (request, reply) => {
    const { id } = request.params
    const { id: adminId } = request.user as { id: string }

    const result = await approveEnrollmentClaim(prisma, id, adminId)
    if (!result.ok) {
      return reply.status(409).send({ error: "Bu xabar allaqachon ko'rib chiqilgan yoki topilmadi" })
    }

    logAdminAction(prisma, request, {
      action: 'enrollment_claim.approve',
      entityType: 'EnrollmentClaim',
      entityId: id,
      after: { status: 'APPROVED', userId: result.userId },
    })

    return reply.send({ success: true, message: 'Tasdiqlandi — foydalanuvchiga bonus berildi' })
  })

  // ─────────────────────────────────────────────
  // POST /admin/enrollment-claims/:id/reject
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>('/admin/enrollment-claims/:id/reject', async (request, reply) => {
    const { id } = request.params
    const { id: adminId } = request.user as { id: string }

    // MUHIM: .parse() emas .safeParse() — global xato handleriga tayanmasdan
    // to'g'ridan-to'g'ri toza 400 qaytaramiz
    const parsed = z.object({ reason: z.string().min(3, 'Sabab kiritilishi shart').max(500) }).safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Sabab kiritilishi shart' })
    }
    const { reason } = parsed.data

    const result = await rejectEnrollmentClaim(prisma, id, adminId, reason)
    if (!result.ok) {
      return reply.status(409).send({ error: "Bu xabar allaqachon ko'rib chiqilgan yoki topilmadi" })
    }

    logAdminAction(prisma, request, {
      action: 'enrollment_claim.reject',
      entityType: 'EnrollmentClaim',
      entityId: id,
      after: { status: 'REJECTED', reason },
    })

    return reply.send({ success: true, message: 'Rad etildi' })
  })
}
