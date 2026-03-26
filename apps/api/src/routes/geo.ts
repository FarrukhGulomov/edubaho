import type { FastifyInstance } from 'fastify'

/**
 * Geo routes
 *
 * GET 🔓 /geo/regions              — Barcha viloyatlar
 * GET 🔓 /geo/districts/:regionId  — Tuman ro'yxati
 * GET 🔓 /geo/cities               — Shaharlar (qidiruv uchun)
 */
export default async function geoRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  // ─────────────────────────────────────────────
  // GET /geo/regions
  // ─────────────────────────────────────────────

  fastify.get('/geo/regions', async (_request, reply) => {
    const regions = await prisma.region.findMany({
      where: { parentId: null },
      select: {
        id: true,
        nameUz: true,
        nameRu: true,
        slug: true,
        type: true,
        _count: {
          select: { institutions: { where: { status: { in: ['ACTIVE', 'PREMIUM'] } } } },
        },
      },
      orderBy: { nameUz: 'asc' },
    })
    return reply.send({
      data: regions.map(r => ({
        ...r,
        institutionCount: r._count.institutions,
      })),
    })
  })

  // ─────────────────────────────────────────────
  // GET /geo/districts/:regionId
  // ─────────────────────────────────────────────

  fastify.get<{ Params: { regionId: string } }>(
    '/geo/districts/:regionId',
    async (request, reply) => {
      const { regionId } = request.params

      const districts = await prisma.region.findMany({
        where: { parentId: regionId, type: { in: ['district', 'city'] } },
        select: { id: true, nameUz: true, nameRu: true, slug: true, type: true },
        orderBy: { nameUz: 'asc' },
      })

      return reply.send({ data: districts })
    },
  )

  // ─────────────────────────────────────────────
  // GET /geo/cities
  // Shaharlar ro'yxati — qidiruv dropdown uchun
  // ─────────────────────────────────────────────

  fastify.get('/geo/cities', async (request, reply) => {
    const query = (request.query as { q?: string; regionId?: string })
    const { q, regionId } = query

    const cities = await prisma.city.findMany({
      where: {
        ...(regionId && { regionId }),
        ...(q && {
          OR: [
            { nameUz: { contains: q, mode: 'insensitive' } },
            { nameRu: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        nameUz: true,
        nameRu: true,
        slug: true,
        lat: true,
        lng: true,
        region: { select: { nameUz: true, nameRu: true } },
      },
      orderBy: { nameUz: 'asc' },
      take: 50,
    })

    return reply.send({ data: cities })
  })
}
