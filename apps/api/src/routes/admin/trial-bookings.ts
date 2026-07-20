import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Admin: bepul probnoy dars bronlari (UTP#2)
 *
 * GET   🛡 /admin/trial-bookings            — Ro'yxat (status filtri bilan)
 * PATCH 🛡 /admin/trial-bookings/:id/status — Holatni o'zgartirish (CONFIRMED/CANCELLED)
 */
export default async function adminTrialBookingRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // ─────────────────────────────────────────────
  // GET /admin/trial-bookings?status=PENDING&page=1
  // ─────────────────────────────────────────────

  fastify.get('/admin/trial-bookings', async (request, reply) => {
    const { status, page, limit } = z.object({
      status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).default('PENDING'),
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(50).default(20),
    }).parse(request.query)

    const [bookings, total] = await Promise.all([
      prisma.trialBooking.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          preferredTime: true,
          note: true,
          status: true,
          createdAt: true,
          institution: { select: { id: true, nameUz: true, slug: true } },
        },
      }),
      prisma.trialBooking.count({ where: { status } }),
    ])

    return reply.send({
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /admin/trial-bookings/:id/status
  // Body: { status: 'CONFIRMED' | 'CANCELLED' }
  // ─────────────────────────────────────────────

  fastify.patch<{ Params: { id: string } }>(
    '/admin/trial-bookings/:id/status',
    async (request, reply) => {
      const { id } = request.params
      const { status } = z.object({
        status: z.enum(['CONFIRMED', 'CANCELLED']),
      }).parse(request.body)

      const booking = await prisma.trialBooking.findUnique({
        where: { id },
        select: { id: true },
      })
      if (!booking) return reply.status(404).send({ error: 'Bron topilmadi' })

      await prisma.trialBooking.update({ where: { id }, data: { status } })

      return reply.send({
        success: true,
        message: status === 'CONFIRMED' ? 'Bron tasdiqlandi' : 'Bron bekor qilindi',
      })
    },
  )
}
