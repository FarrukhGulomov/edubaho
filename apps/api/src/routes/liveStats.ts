import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { redis } from '../utils/redis'

/**
 * Live statistika — hozir onlayn bo'lganlar va jami tashrif buyuruvchilar.
 *
 * MUHIM: bu yerdagi raqamlar 100% HAQIQIY — soxta/random emas.
 * "Onlayn" — oxirgi 90 soniyada heartbeat yuborgan sessiyalar soni
 * (frontend har 45 soniyada bir marta so'rov jo'natadi, TTL 90s bo'lgani
 * uchun brauzer yopilsa ~1.5 daqiqada avtomatik hisobdan chiqadi).
 * "Jami tashrif buyuruvchilar" — saytga kirgan barcha unikal sessiyalar
 * (Redis Set — hech qachon kamaymaydi, faqat o'sadi).
 *
 * sessionId — apps/web/src/lib/analytics.ts dagi getSessionId() bilan bir xil
 * (localStorage'da saqlangan barqaror UUID), alohida "visitor id" sxemasi
 * qo'shilmadi.
 */

const PRESENCE_TTL = 90 // soniya
const ALL_VISITORS_KEY = 'live:visitors:alltime'

const heartbeatSchema = z.object({
  sessionId: z.string().min(8).max(64),
})

export default async function liveStatsRoutes(fastify: FastifyInstance) {
  fastify.post('/track/heartbeat', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = heartbeatSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: "Noto'g'ri so'rov" })

    const { sessionId } = body.data
    await Promise.all([
      redis.set(`live:presence:${sessionId}`, '1', 'EX', PRESENCE_TTL),
      redis.sadd(ALL_VISITORS_KEY, sessionId),
    ])

    return reply.status(204).send()
  })

  fastify.get('/stats/live', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (_request, reply) => {
    // KEYS o'rniga SCAN — Redis'ni bloklamaydi
    let cursor = '0'
    let online = 0
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', 'live:presence:*', 'COUNT', 200)
      cursor = next
      online += keys.length
    } while (cursor !== '0')

    const totalVisitors = await redis.scard(ALL_VISITORS_KEY)

    return reply.send({ online, totalVisitors })
  })
}
