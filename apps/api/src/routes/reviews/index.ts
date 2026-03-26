import type { FastifyInstance } from 'fastify'
import {
  createReviewSchema,
  updateReviewSchema,
  listReviewsQuerySchema,
  voteReviewSchema,
  replyReviewSchema,
  reportReviewSchema,
} from '../../schemas/reviews'
import {
  listReviews,
  createReview,
  updateReview,
  deleteReview,
  voteReview,
  replyToReview,
  reportReview,
} from '../../services/reviewService'

/**
 * /reviews routes
 *
 * GET    🔓 /reviews/:institutionId   — Sharh ro'yxati (paginated)
 * POST   🔑 /reviews                  — Yangi sharh yaratish
 * PUT    🔑 /reviews/:id              — Tahrirlash (faqat o'z sharhi)
 * DELETE 🔑 /reviews/:id              — O'chirish (faqat o'z sharhi)
 * POST   🔑 /reviews/:id/vote         — Foydali/foydasiz ovoz
 * POST   🔑 /reviews/:id/reply        — Foydalanuvchi javobi
 * POST   🔑 /reviews/:id/report       — Shikoyat
 */
export default async function reviewRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  // ─────────────────────────────────────────────
  // GET /reviews/me
  // Auth required — joriy foydalanuvchining o'z sharhlari
  // ─────────────────────────────────────────────

  fastify.get(
    '/reviews/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as { id: string }).id

      const reviews = await prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          institution: {
            select: { nameUz: true, slug: true, type: true },
          },
        },
      })

      return reply.send({ data: reviews })
    },
  )

  // ─────────────────────────────────────────────
  // GET /reviews/:institutionId
  // Public — token shart emas, lekin bo'lsa isOwn ko'rsatiladi
  // ─────────────────────────────────────────────

  fastify.get<{
    Params: { institutionId: string }
    Querystring: Record<string, unknown>
  }>(
    '/reviews/:institutionId',
    {
      schema: {
        params: {
          type: 'object',
          properties: { institutionId: { type: 'string' } },
          required: ['institutionId'],
        },
      },
    },
    async (request, reply) => {
      const query = listReviewsQuerySchema.parse(request.query)
      const { institutionId } = request.params

      let requestUserId: string | undefined
      try {
        await request.jwtVerify()
        requestUserId = (request.user as { id: string }).id
      } catch {
        // Token yo'q — public mode
      }

      const result = await listReviews(prisma, institutionId, query, requestUserId)
      return reply.send(result)
    },
  )

  // ─────────────────────────────────────────────
  // POST /reviews
  // Auth required | Rate limit: 5 req/hour/User
  // ─────────────────────────────────────────────

  fastify.post(
    '/reviews',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = createReviewSchema.parse(request.body)
      const userId = (request.user as { id: string }).id

      try {
        const review = await createReview(prisma, userId, body)
        return reply.status(201).send({
          data: review,
          message: 'Sharhingiz qabul qilindi va moderatsiyaga yuborildi',
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

  // ─────────────────────────────────────────────
  // PUT /reviews/:id
  // Auth required | Faqat o'z sharhi
  // ─────────────────────────────────────────────

  fastify.put<{ Params: { id: string } }>(
    '/reviews/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const body = updateReviewSchema.parse(request.body)
      const userId = (request.user as { id: string }).id

      try {
        const review = await updateReview(prisma, id, userId, body)
        return reply.send({
          data: review,
          message: 'Sharh yangilandi va qayta moderatsiyaga yuborildi',
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

  // ─────────────────────────────────────────────
  // DELETE /reviews/:id
  // Auth required | Faqat o'z sharhi
  // ─────────────────────────────────────────────

  fastify.delete<{ Params: { id: string } }>(
    '/reviews/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const userId = (request.user as { id: string }).id

      try {
        await deleteReview(prisma, id, userId)
        return reply.send({ success: true, message: "Sharh o'chirildi" })
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
  // POST /reviews/:id/vote
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/reviews/:id/vote',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const body = voteReviewSchema.parse(request.body)
      const userId = (request.user as { id: string }).id

      try {
        const result = await voteReview(prisma, id, userId, body)
        return reply.send(result)
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
  // POST /reviews/:id/reply
  // Foydalanuvchi javobi (fromInstitution: false)
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/reviews/:id/reply',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const body = replyReviewSchema.parse(request.body)
      const userId = (request.user as { id: string }).id

      try {
        const replyData = await replyToReview(prisma, id, userId, body, false)
        return reply.status(201).send({ data: replyData })
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
  // POST /reviews/:id/report
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/reviews/:id/report',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const body = reportReviewSchema.parse(request.body)
      const userId = (request.user as { id: string }).id

      try {
        const result = await reportReview(prisma, id, userId, body.reason, body.note)
        return reply.send({ ...result, message: 'Shikoyat qabul qilindi' })
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
