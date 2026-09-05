import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Bildirishnomalar — foydalanuvchining o'ziga tegishli xabarlar ro'yxati
 * (masalan "sizga BilimCoin qo'shildi" kabi notifyUser() orqali yozilgan
 * yozuvlar). Notification jadvali avvaldan bor edi (Telegram push bilan
 * birga yoziladi), lekin frontend hech qachon o'qimagan edi.
 *
 * GET  🔑 /notifications           — so'nggi xabarlar + o'qilmagan soni
 * POST 🔑 /notifications/:id/read — bitta xabarni o'qilgan deb belgilash
 * POST 🔑 /notifications/read-all — barchasini o'qilgan deb belgilash
 */
export default async function notificationRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)

  const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })

  fastify.get('/notifications', async (request, reply) => {
    const { id: userId } = request.user as { id: string }
    const { limit } = listQuerySchema.parse(request.query)

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, type: true, title: true, body: true, isRead: true, createdAt: true },
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ])

    return reply.send({ data: notifications, meta: { unreadCount } })
  })

  const paramsSchema = z.object({ id: z.string() })

  fastify.post('/notifications/:id/read', async (request, reply) => {
    const { id: userId } = request.user as { id: string }
    const { id } = paramsSchema.parse(request.params)

    // updateMany + userId filtri — boshqa userning xabarini o'qilgan
    // qilib belgilab qo'yishning oldi shu bilan olinadi
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    })

    return reply.send({ success: true })
  })

  fastify.post('/notifications/read-all', async (request, reply) => {
    const { id: userId } = request.user as { id: string }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })

    return reply.send({ success: true })
  })
}
