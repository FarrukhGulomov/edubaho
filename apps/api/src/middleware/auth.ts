import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { isTokenBlacklisted } from '../utils/redis'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string
      phone: string
      role: string
      institutionId?: string
      jti?: string
    }
    user: {
      id: string
      phone: string
      role: string
      institutionId?: string
      jti?: string
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

/**
 * JWT authentication decorator.
 * Route'larda: preHandler: [fastify.authenticate]
 */
export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()

        // Blacklist tekshiruvi (logout bo'lgan tokenlar)
        const { jti } = request.user
        if (jti && (await isTokenBlacklisted(jti))) {
          return reply.status(401).send({ error: 'Token bekor qilingan' })
        }
      } catch {
        return reply.status(401).send({ error: 'Tizimga kirishingiz kerak' })
      }
    },
  )
})
