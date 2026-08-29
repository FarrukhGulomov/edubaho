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
    optionalAuthenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
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

  /**
   * Ochiq (public) route'lar uchun — token bo'lsa `request.user`ni to'ldiradi,
   * lekin token yo'q/noto'g'ri bo'lsa ham so'rovni RAD ETMAYDI (mehmon sifatida
   * davom etadi). Blacklist tekshiruvi bu yerda emas — chaqiruvchi route o'zi
   * `request.user`dagi `jti`ni `isTokenBlacklisted` bilan tekshirib, kerak
   * bo'lsa mehmon sifatida ko'radi (faqat "mehmonga qisqartirilgan javob"
   * kabi holatlar uchun ishlatiladi).
   */
  fastify.decorate(
    'optionalAuthenticate',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch {
        // Token yo'q yoki noto'g'ri — mehmon sifatida davom etadi
      }
    },
  )
})
