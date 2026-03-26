import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { searchInstitutions } from '../services/searchService'

/**
 * Search routes (Meilisearch orqali)
 *
 * GET 🔓 /search         — Full-text qidiruv + facets
 * GET 🔓 /search/suggest — Autocomplete (V2 — placeholder)
 * GET 🔓 /search/facets  — Filtr facets
 */
export default async function searchRoutes(fastify: FastifyInstance) {
  const searchQuerySchema = z.object({
    q:          z.string().optional().default(''),
    type:       z.string().optional(),
    cityId:     z.string().optional(),
    regionId:   z.string().optional(),
    minRating:  z.coerce.number().min(1).max(5).optional(),
    monthlyMax: z.coerce.number().positive().optional(),
    sortBy:     z.enum(['rating', 'price_asc', 'price_desc', 'newest', 'popular']).optional().default('rating'),
    page:       z.coerce.number().int().min(1).optional().default(1),
    limit:      z.coerce.number().int().min(1).max(50).optional().default(20),
  })

  // ─────────────────────────────────────────────
  // GET /search
  // ─────────────────────────────────────────────

  fastify.get('/search', async (request, reply) => {
    const params = searchQuerySchema.parse(request.query)

    try {
      const result = await searchInstitutions({
        q: params.q,
        type: params.type,
        cityId: params.cityId,
        regionId: params.regionId,
        minRating: params.minRating,
        monthlyMax: params.monthlyMax,
        sortBy: params.sortBy,
        page: params.page,
        limit: params.limit,
      })
      return reply.send(result)
    } catch (err) {
      fastify.log.error(err, 'Meilisearch xatosi')
      // Meilisearch ishlamasa — Prisma fallback
      return reply.status(503).send({
        error: 'Qidiruv vaqtincha ishlamayapti. Iltimos, keyinroq urinib ko\'ring.',
        code: 'SEARCH_UNAVAILABLE',
      })
    }
  })

  // ─────────────────────────────────────────────
  // GET /search/suggest — V2 uchun placeholder
  // ─────────────────────────────────────────────

  fastify.get('/search/suggest', async (request, reply) => {
    const { q = '' } = request.query as { q?: string }

    if (q.length < 2) {
      return reply.send({ data: [] })
    }

    // V2'da Meilisearch autocomplete ishlatiladi
    // Hozircha Prisma'dan sodda qidiruv
    const suggestions = await fastify.prisma.institution.findMany({
      where: {
        status: { in: ['ACTIVE', 'PREMIUM'] },
        nameUz: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, nameUz: true, nameRu: true, type: true, slug: true },
      take: 5,
    })

    return reply.send({ data: suggestions })
  })

  // ─────────────────────────────────────────────
  // GET /search/facets — Filtr uchun statistika
  // ─────────────────────────────────────────────

  fastify.get('/search/facets', async (_request, reply) => {
    const [byType, byCity] = await Promise.all([
      fastify.prisma.institution.groupBy({
        by: ['type'],
        where: { status: { in: ['ACTIVE', 'PREMIUM'] } },
        _count: { id: true },
      }),
      fastify.prisma.institution.groupBy({
        by: ['cityId'],
        where: { status: { in: ['ACTIVE', 'PREMIUM'] }, cityId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
    ])

    return reply.send({
      data: {
        types: Object.fromEntries(byType.map((r) => [r.type, r._count.id])),
        cities: Object.fromEntries(byCity.map((r) => [r.cityId ?? '', r._count.id])),
      },
    })
  })
}
