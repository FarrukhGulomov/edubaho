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
  await redis.connect()

  fastify.decorate('redis', redis)

  fastify.addHook('onClose', async () => {
    await redis.quit()
  })
})
