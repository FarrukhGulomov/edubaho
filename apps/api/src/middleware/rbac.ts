import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireSuperAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireB2B: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

/**
 * Role-Based Access Control decoratorlar.
 *
 * requireAdmin — ADMIN yoki SUPER_ADMIN uchun
 * requireB2B   — INSTITUTION_OWNER uchun
 *
 * Har doim fastify.authenticate dan KEYIN ishlatiladi:
 *   preHandler: [fastify.authenticate, fastify.requireAdmin]
 */
export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    'requireAdmin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { role } = request.user
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Bu amalni bajarish uchun admin huquqi kerak' })
      }
    },
  )

  fastify.decorate(
    'requireSuperAdmin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { role } = request.user
      if (role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Bu amal faqat super admin uchun' })
      }
    },
  )

  fastify.decorate(
    'requireB2B',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { role } = request.user
      if (role !== 'INSTITUTION_OWNER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Bu amalni bajarish uchun muassasa egasi huquqi kerak' })
      }
    },
  )
})
