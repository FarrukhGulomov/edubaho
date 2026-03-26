import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ReviewStatus } from '@prisma/client'
import { moderateReviewSchema } from '../../schemas/reviews'
import { listPendingReviews, approveReview, rejectReview } from '../../services/reviewService'

/**
 * Admin review moderation routes
 * Barcha route'lar 🛡️ Admin roli talab qiladi
 *
 * GET   /admin/reviews/pending        — Moderatsiya kutuvchi sharhlar
 * PATCH /admin/reviews/:id/approve    — Tasdiqlash
 * PATCH /admin/reviews/:id/reject     — Rad etish
 */
export default async function adminReviewRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // ─────────────────────────────────────────────
  // GET /admin/reviews/pending
  // Status filter: PENDING (default), FLAGGED, REJECTED
  // ─────────────────────────────────────────────

  const pendingQuerySchema = z.object({
    status: z.enum(['PENDING', 'FLAGGED', 'REJECTED']).optional().default('PENDING'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })

  fastify.get('/admin/reviews/pending', async (request, reply) => {
    const { status, page, limit } = pendingQuerySchema.parse(request.query)
    const result = await listPendingReviews(prisma, page, limit, status as ReviewStatus)
    return reply.send(result)
  })

  // ─────────────────────────────────────────────
  // PATCH /admin/reviews/:id/approve
  // ─────────────────────────────────────────────

  fastify.patch<{ Params: { id: string } }>(
    '/admin/reviews/:id/approve',
    async (request, reply) => {
      const { id } = request.params

      try {
        const result = await approveReview(prisma, id)
        return reply.send({ ...result, message: 'Sharh tasdiqlandi' })
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string }
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message })
        }
        throw err
      }
    },
  )

  // ─────────────────────────────────────────────
  // PATCH /admin/reviews/:id/reject
  // Body: { reason?: string }
  // ─────────────────────────────────────────────

  fastify.patch<{ Params: { id: string } }>(
    '/admin/reviews/:id/reject',
    async (request, reply) => {
      const { id } = request.params
      const { reason } = moderateReviewSchema.parse(request.body)

      try {
        const result = await rejectReview(prisma, id, reason)
        return reply.send({ ...result, message: 'Sharh rad etildi' })
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string }
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ error: error.message })
        }
        throw err
      }
    },
  )
}
