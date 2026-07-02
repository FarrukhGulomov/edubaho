import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Admin: muassasa egaligi so'rovlari (claims) moderatsiyasi
 *
 * GET  🛡 /admin/claims               — So'rovlar ro'yxati (status filtri bilan)
 * POST 🛡 /admin/claims/:id/approve   — Tasdiqlash → user INSTITUTION_OWNER bo'ladi
 * POST 🛡 /admin/claims/:id/reject    — Rad etish (sabab bilan)
 */
export default async function adminClaimRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // ─────────────────────────────────────────────
  // GET /admin/claims?status=PENDING&page=1
  // ─────────────────────────────────────────────

  fastify.get('/admin/claims', async (request, reply) => {
    const { status, page, limit } = z.object({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(50).default(20),
    }).parse(request.query)

    const [claims, total] = await Promise.all([
      prisma.institutionClaim.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          note: true,
          documents: true,
          createdAt: true,
          user:        { select: { id: true, name: true, phone: true, email: true, telegramUsername: true } },
          institution: { select: { id: true, nameUz: true, slug: true, type: true, phone: true } },
        },
      }),
      prisma.institutionClaim.count({ where: { status } }),
    ])

    return reply.send({
      data: claims,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // ─────────────────────────────────────────────
  // POST /admin/claims/:id/approve
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/admin/claims/:id/approve',
    async (request, reply) => {
      const { id } = request.params
      const { id: adminId } = request.user as { id: string }

      const claim = await prisma.institutionClaim.findUnique({
        where: { id },
        select: { id: true, status: true, userId: true, institutionId: true },
      })
      if (!claim) return reply.status(404).send({ error: "So'rov topilmadi" })
      if (claim.status !== 'PENDING') {
        return reply.status(409).send({ error: "Bu so'rov allaqachon ko'rib chiqilgan" })
      }

      await prisma.$transaction(async (tx) => {
        // So'rovni tasdiqlash
        await tx.institutionClaim.update({
          where: { id },
          data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() },
        })

        // Shu muassasaga boshqa kutilayotgan so'rovlarni rad etish
        await tx.institutionClaim.updateMany({
          where: { institutionId: claim.institutionId, status: 'PENDING', id: { not: id } },
          data: { status: 'REJECTED', reviewedBy: adminId, reviewedAt: new Date() },
        })

        // Oddiy foydalanuvchini muassasa egasiga ko'tarish
        // (admin rollari pasaytirilmaydi)
        await tx.user.updateMany({
          where: { id: claim.userId, role: 'USER' },
          data: { role: 'INSTITUTION_OWNER' },
        })

        // Egasi tasdiqlangan muassasa "verified" belgisini oladi
        await tx.institution.update({
          where: { id: claim.institutionId },
          data: { isVerified: true },
        })
      })

      return reply.send({ success: true, message: "So'rov tasdiqlandi — foydalanuvchi endi muassasa egasi" })
    },
  )

  // ─────────────────────────────────────────────
  // POST /admin/claims/:id/reject
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/admin/claims/:id/reject',
    async (request, reply) => {
      const { id } = request.params
      const { id: adminId } = request.user as { id: string }
      const { reason } = z.object({ reason: z.string().max(500).optional() }).parse(request.body ?? {})

      const claim = await prisma.institutionClaim.findUnique({
        where: { id },
        select: { id: true, status: true, note: true },
      })
      if (!claim) return reply.status(404).send({ error: "So'rov topilmadi" })
      if (claim.status !== 'PENDING') {
        return reply.status(409).send({ error: "Bu so'rov allaqachon ko'rib chiqilgan" })
      }

      await prisma.institutionClaim.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          note: reason ? `${claim.note ?? ''}\nRad etish sababi: ${reason}`.trim() : claim.note,
        },
      })

      return reply.send({ success: true, message: "So'rov rad etildi" })
    },
  )
}
