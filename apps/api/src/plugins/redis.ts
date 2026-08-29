import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { redis } from '../utils/redis'

declare module 'fastify' {
  interface FastifyInstance {
    redis: typeof redis
  }
}

/**
 * Redis plugin — fastify.redis orqali global redis client
 */
export default fp(async (fastify: FastifyInstance) => {
  // `redis` global singleton bo'lgani uchun (masalan testlarda app bir necha
  // marta qurilsa) allaqachon ulangan/ulanayotgan bo'lishi mumkin — ioredis
  // bunday holatda `.connect()` chaqirilsa xato tashlaydi, shuning uchun
  // holatni oldindan tekshiramiz (idempotent registratsiya)
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect()
  }

  fastify.decorate('redis', redis)

  fastify.addHook('onClose', async () => {
    await redis.quit()
  })
})
