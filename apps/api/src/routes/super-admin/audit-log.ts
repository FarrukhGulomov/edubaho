import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Super Admin — Audit jurnali (kim-qachon-nima o'zgartirdi)
 *
 * GET /super-admin/audit-log — Ro'yxat (qidiruv/filtr/sahifalash)
 */
export default async function auditLogRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireSuperAdmin)

  const querySchema = z.object({
    q:          z.string().optional(),
    adminId:    z.string().optional(),
    action:     z.string().optional(),
    entityType: z.string().optional(),
    page:       z.coerce.number().int().min(1).optional().default(1),
    limit:      z.coerce.number().int().min(1).max(100).optional().default(30),
  })

  fastify.get('/super-admin/audit-log', async (request, reply) => {
    const { q, adminId, action, entityType, page, limit } = querySchema.parse(request.query)
    const skip = (page - 1) * limit

    const where = {
      ...(adminId && { adminId }),
      ...(action && { action }),
      ...(entityType && { entityType }),
      ...(q && {
        OR: [
          { adminName:   { contains: q, mode: 'insensitive' as const } },
          { entityLabel: { contains: q, mode: 'insensitive' as const } },
          { entityId:    { contains: q, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ])

    // Filtr dropdown'lari uchun mavjud amal turlari ro'yxati
    const distinctActions = await prisma.adminAuditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    })

    return reply.send({
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      facets: { actions: distinctActions.map((a) => a.action) },
    })
  })
}
