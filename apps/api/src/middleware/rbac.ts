import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { redis } from '../utils/redis'

declare module 'fastify' {
  interface FastifyInstance {
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireSuperAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireB2B: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

/** PIN tasdig'i amal qilish muddati (soniya) */
const PIN_TTL = 3600

/**
 * Admin PIN (ikkinchi faktor) Redis'da tasdiqlanganmi — tekshiradi.
 * /auth/admin-pin muvaffaqiyatli chaqirilganda `admin_verified:${userId}`
 * 1 soatga o'rnatiladi. Bu tekshiruv YO'Q bo'lsa, o'g'irlangan/oqib chiqqan
 * JWT o'zi orqali PIN'siz to'g'ridan-to'g'ri admin API'ga kirish mumkin
 * bo'lib qolar edi — PIN faqat frontend UX qadami bo'lib qolardi.
 *
 * Muddat SIRPANUVCHI (sliding): har bir muvaffaqiyatli admin so'rovida
 * qaytadan 1 soatga uzaytiriladi. Aks holda admin bir soatdan uzoq forma
 * to'ldirsa (muassasa ma'lumotlarini kiritish odatda shuncha vaqt oladi),
 * "Saqlash" bosgan payt PIN muddati tugab, yozgan ma'lumoti yo'qolardi.
 * Faol ishlayotgan admin uzilmaydi, ishni to'xtatgandan 1 soat o'tib esa
 * tasdiq baribir bekor bo'ladi.
 */
async function isPinVerified(userId: string): Promise<boolean> {
  const key = `admin_verified:${userId}`
  const verified = (await redis.get(key)) === '1'
  if (verified) await redis.expire(key, PIN_TTL)
  return verified
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
      const { id, role } = request.user
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Bu amalni bajarish uchun admin huquqi kerak' })
      }
      if (!(await isPinVerified(id))) {
        return reply.status(403).send({ error: 'Admin PIN tasdiqlanishi kerak', code: 'ADMIN_PIN_REQUIRED' })
      }
    },
  )

  fastify.decorate(
    'requireSuperAdmin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, role } = request.user
      if (role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Bu amal faqat super admin uchun' })
      }
      if (!(await isPinVerified(id))) {
        return reply.status(403).send({ error: 'Admin PIN tasdiqlanishi kerak', code: 'ADMIN_PIN_REQUIRED' })
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
