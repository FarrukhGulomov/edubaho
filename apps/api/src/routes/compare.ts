import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Solishtirishni saqlash — foydalanuvchi keyinroq qaytib ochishi uchun
 * Barcha route'lar 🔑 auth talab qiladi
 *
 * POST   /compare/saved      — Joriy solishtirishni saqlash
 * GET    /compare/saved      — Saqlangan solishtirishlar ro'yxati
 * DELETE /compare/saved/:id  — O'chirish
 */
export default async function compareRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)

  const saveSchema = z.object({
    institutionIds: z.array(z.string().min(1)).min(2, 'Kamida 2 ta muassasa kerak').max(4, "Ko'pi bilan 4 ta muassasa"),
    label: z.string().max(100).optional(),
  })

  // ─────────────────────────────────────────────
  // POST /compare/saved
  // ─────────────────────────────────────────────

  fastify.post('/compare/saved', async (request, reply) => {
    const { id: userId } = request.user as { id: string }
    const { institutionIds, label } = saveSchema.parse(request.body)

    const count = await prisma.institution.count({
      where: { id: { in: institutionIds }, status: { in: ['ACTIVE', 'PREMIUM'] } },
    })
    if (count !== institutionIds.length) {
      return reply.status(404).send({ error: "Ba'zi muassasalar topilmadi" })
    }

    const saved = await prisma.savedComparison.create({
      data: { userId, institutionIds, label: label || null },
      select: { id: true, institutionIds: true, label: true, createdAt: true },
    })

    return reply.status(201).send({ data: saved, message: 'Solishtirish saqlandi' })
  })

  // ─────────────────────────────────────────────
  // GET /compare/saved
  // ─────────────────────────────────────────────

  fastify.get('/compare/saved', async (request, reply) => {
    const { id: userId } = request.user as { id: string }

    const saved = await prisma.savedComparison.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, institutionIds: true, label: true, createdAt: true },
    })

    // Har bir saqlangan solishtirish uchun muassasa nomlarini biriktiramiz
    // (bitta so'rovda — N+1 yo'q)
    const allIds = [...new Set(saved.flatMap((s) => s.institutionIds))]
    const institutions = allIds.length > 0
      ? await prisma.institution.findMany({
          where: { id: { in: allIds } },
          select: { id: true, nameUz: true, nameRu: true, slug: true },
        })
      : []
    const byId = new Map(institutions.map((i) => [i.id, i]))

    const data = saved.map((s) => ({
      ...s,
      institutions: s.institutionIds.map((id) => byId.get(id)).filter(Boolean),
    }))

    return reply.send({ data })
  })

  // ─────────────────────────────────────────────
  // DELETE /compare/saved/:id
  // ─────────────────────────────────────────────

  fastify.delete<{ Params: { id: string } }>('/compare/saved/:id', async (request, reply) => {
    const { id: userId } = request.user as { id: string }
    const { id } = request.params

    const existing = await prisma.savedComparison.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({ error: 'Saqlangan solishtirish topilmadi' })
    }

    await prisma.savedComparison.delete({ where: { id } })
    return reply.send({ message: "Solishtirish o'chirildi" })
  })
}
