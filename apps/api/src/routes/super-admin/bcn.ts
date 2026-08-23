import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { adjustBcnBalance, resetBcnBalance, getBcnLedger, InvalidAdjustmentError } from '../../services/bcnAdminService'
import { logAdminAction } from '../../services/auditLog'

/**
 * Super Admin — foydalanuvchining BilimCoin (BCN) balansini butunlay
 * boshqarish: ko'rish, qo'lda qo'shish/ayirish, nolga tushirish.
 *
 * GET  /super-admin/users/:id/bcn         — balans + to'liq tarix
 * POST /super-admin/users/:id/bcn/adjust  — qo'shish (musbat) yoki ayirish (manfiy)
 * POST /super-admin/users/:id/bcn/reset   — balansni 0 ga tushirish
 *
 * Barchasi 🛡️🛡️ SUPER_ADMIN roli talab qiladi (oddiy ADMIN emas —
 * bu to'g'ridan-to'g'ri, tasdiqlashsiz moliyaviy amal)
 */
export default async function superAdminBcnRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireSuperAdmin)

  // ─────────────────────────────────────────────
  // GET /super-admin/users/:id/bcn
  // ─────────────────────────────────────────────

  fastify.get<{ Params: { id: string } }>('/super-admin/users/:id/bcn', async (request, reply) => {
    const { id } = request.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, email: true },
    })
    if (!user) return reply.status(404).send({ error: 'Foydalanuvchi topilmadi' })

    const ledger = await getBcnLedger(prisma, id)
    return reply.send({ data: { user, ...ledger } })
  })

  // ─────────────────────────────────────────────
  // POST /super-admin/users/:id/bcn/adjust
  // ─────────────────────────────────────────────

  const adjustSchema = z.object({
    amount: z.coerce.number().int(),
    reason: z.string().min(3, 'Sabab kiritilishi shart').max(500),
  })

  fastify.post<{ Params: { id: string } }>('/super-admin/users/:id/bcn/adjust', async (request, reply) => {
    const { id } = request.params
    const { id: adminId } = request.user as { id: string }

    // .safeParse() — global xato handleriga tayanmasdan to'g'ridan-to'g'ri toza 400
    const parsed = adjustSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Kiritilgan ma'lumotlar noto'g'ri" })
    }
    const { amount, reason } = parsed.data
    if (amount === 0) {
      return reply.status(400).send({ error: "Miqdor 0 bo'lmasligi kerak" })
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!user) return reply.status(404).send({ error: 'Foydalanuvchi topilmadi' })

    let newBalance: number
    try {
      ;({ newBalance } = await adjustBcnBalance(prisma, { userId: id, amount, reason, adminId }))
    } catch (err) {
      if (err instanceof InvalidAdjustmentError) {
        return reply.status(400).send({ error: "Miqdor 0 bo'lmasligi kerak" })
      }
      throw err
    }

    logAdminAction(prisma, request, {
      action: 'bcn.adjust',
      entityType: 'User',
      entityId: id,
      after: { amount, reason, newBalance },
    })

    return reply.send({
      data: { newBalance },
      message: `Balans yangilandi: ${newBalance.toLocaleString('ru-RU').replace(/,/g, ' ')} BCN`,
    })
  })

  // ─────────────────────────────────────────────
  // POST /super-admin/users/:id/bcn/reset
  // ─────────────────────────────────────────────

  const resetSchema = z.object({
    reason: z.string().min(3, 'Sabab kiritilishi shart').max(500),
  })

  fastify.post<{ Params: { id: string } }>('/super-admin/users/:id/bcn/reset', async (request, reply) => {
    const { id } = request.params
    const { id: adminId } = request.user as { id: string }

    const parsed = resetSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Kiritilgan ma'lumotlar noto'g'ri" })
    }
    const { reason } = parsed.data

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!user) return reply.status(404).send({ error: 'Foydalanuvchi topilmadi' })

    const { newBalance } = await resetBcnBalance(prisma, { userId: id, reason, adminId })

    logAdminAction(prisma, request, {
      action: 'bcn.reset',
      entityType: 'User',
      entityId: id,
      after: { reason, newBalance },
    })

    return reply.send({ data: { newBalance }, message: 'Balans 0 BCN ga tushirildi' })
  })
}
