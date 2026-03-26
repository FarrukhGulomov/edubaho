import type { FastifyInstance } from 'fastify'
import { dashboardReviewsQuerySchema, replyReviewSchema } from '../../schemas/reviews'
import { listInstitutionReviews, replyToReview } from '../../services/reviewService'

/**
 * Dashboard (B2B) review routes
 * Barcha route'lar 🏢 INSTITUTION_OWNER roli talab qiladi
 *
 * GET  /dashboard/reviews             — O'z muassasasiga kelgan barcha sharhlar
 * POST /dashboard/reviews/:id/reply   — Sharhga muassasa nomidan javob
 */
export default async function dashboardReviewRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireB2B)

  // ─────────────────────────────────────────────
  // GET /dashboard/reviews
  // Status filter: PENDING, APPROVED, REJECTED, FLAGGED
  // ─────────────────────────────────────────────

  fastify.get('/dashboard/reviews', async (request, reply) => {
    const user = request.user as { id: string; institutionId?: string }

    if (!user.institutionId) {
      return reply.status(403).send({
        error: "Siz hech qanday muassasaga bog'lanmagansiz",
      })
    }

    const query = dashboardReviewsQuerySchema.parse(request.query)
    const result = await listInstitutionReviews(prisma, user.institutionId, query)
    return reply.send(result)
  })

  // ─────────────────────────────────────────────
  // POST /dashboard/reviews/:id/reply
  // Muassasa nomidan javob (fromInstitution: true)
  // Bir sharhga faqat 1 ta muassasa javobi
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/dashboard/reviews/:id/reply',
    async (request, reply) => {
      const { id: reviewId } = request.params
      const user = request.user as { id: string; institutionId?: string }
      const body = replyReviewSchema.parse(request.body)

      if (!user.institutionId) {
        return reply.status(403).send({
          error: "Siz hech qanday muassasaga bog'lanmagansiz",
        })
      }

      // Sharh bu muassasaga tegishli + oldin javob berilmaganini tekshirish
      const review = await prisma.review.findFirst({
        where: { id: reviewId, institutionId: user.institutionId },
        select: {
          id: true,
          status: true,
          replies: {
            where: { fromInstitution: true },
            select: { id: true },
          },
        },
      })

      if (!review) {
        return reply.status(404).send({ error: 'Sharh topilmadi' })
      }

      if (review.replies.length > 0) {
        return reply.status(409).send({
          error: 'Siz bu sharhga allaqachon javob bergansiz',
        })
      }

      try {
        const replyData = await replyToReview(prisma, reviewId, user.id, body, true)
        return reply.status(201).send({
          data: replyData,
          message: "Javob muvaffaqiyatli qo'shildi",
        })
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
