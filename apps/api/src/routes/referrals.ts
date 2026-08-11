import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getOrCreateReferralCode, getReferralStats, getAvailableBalance } from '../services/referralService'
import { MIN_WITHDRAWAL_UZS, REFERRAL_REWARD_UZS } from '../config/referral'

// Loyihaning to'lov usullari (packages/shared'dagi PAYMENT_METHOD_LABELS
// bilan bir xil kalitlar) — apps/api hech qachon @edureyting/shared'ni
// import qilmaydi, chunki paths-mapping orqali paket manba (.ts) fayliga
// bog'lansa, tsc'ning "rootDir" avtomatik xulosasi butun monorepo ildiziga
// kengayib, dist chiqishi (dist/apps/api/src/... namuna) buzilib qoladi
const VALID_PAYMENT_METHODS = ['payme', 'click', 'uzcard', 'humo', 'cash'] as const

/**
 * Referral & Rewards — foydalanuvchi (referrer) uchun API.
 *
 * GET  🔑 /referrals/me             — kod, havola, balans, hisoblagichlar
 * GET  🔑 /referrals/me/history     — taklif qilinganlar tarixi
 * GET  🔑 /referrals/me/withdrawals — yechib olish so'rovlari tarixi
 * POST 🔑 /referrals/withdraw       — yechib olish so'rovi yaratish
 */
export default async function referralRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/referrals/me', async (request, reply) => {
    const { id: userId } = request.user as { id: string }

    const [referralCode, stats] = await Promise.all([
      getOrCreateReferralCode(prisma, userId),
      getReferralStats(prisma, userId),
    ])

    return reply.send({ data: { referralCode, ...stats } })
  })

  const historyQuerySchema = z.object({
    page:  z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })

  fastify.get('/referrals/me/history', async (request, reply) => {
    const { id: userId } = request.user as { id: string }
    const { page, limit } = historyQuerySchema.parse(request.query)
    const skip = (page - 1) * limit

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where: { referrerId: userId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          qualifiedAt: true,
          referredUser: { select: { name: true, phone: true } },
          reward: { select: { amount: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.referral.count({ where: { referrerId: userId } }),
    ])

    return reply.send({
      data: referrals.map((r) => ({
        id: r.id,
        // Maxfiylik: taklif qilingan foydalanuvchining to'liq raqami emas,
        // faqat ismi (bo'lsa) yoki niqoblangan telefon ko'rsatiladi
        referredUserLabel: r.referredUser.name ?? maskPhone(r.referredUser.phone),
        status: r.status,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
        rewardAmount: r.reward?.amount ?? 0,
        rewardStatus: r.reward?.status ?? null,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  fastify.get('/referrals/me/withdrawals', async (request, reply) => {
    const { id: userId } = request.user as { id: string }

    const withdrawals = await prisma.referralWithdrawal.findMany({
      where: { userId },
      select: {
        id: true, amount: true, paymentMethod: true, status: true,
        requestedAt: true, processedAt: true, rejectionReason: true,
      },
      orderBy: { requestedAt: 'desc' },
      take: 50,
    })

    return reply.send({ data: withdrawals })
  })

  const withdrawSchema = z.object({
    amount: z.coerce.number().int().positive(),
    paymentMethod: z.enum(VALID_PAYMENT_METHODS),
    paymentDetails: z.string().min(4, "To'lov ma'lumotlarini kiriting").max(200),
  })

  fastify.post('/referrals/withdraw', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { id: userId } = request.user as { id: string }
    const { amount, paymentMethod, paymentDetails } = withdrawSchema.parse(request.body)

    // MUHIM: miqdor va balans FAQAT serverda tekshiriladi — frontend hech
    // qachon ishonchli manba emas (texnik topshiriq #43)
    if (amount < MIN_WITHDRAWAL_UZS) {
      return reply.status(400).send({
        error: `Minimal yechib olish summasi — ${fmtUzs(MIN_WITHDRAWAL_UZS)}`,
      })
    }

    const available = await getAvailableBalance(prisma, userId)
    if (amount > available) {
      return reply.status(400).send({ error: "Balansingizda yetarli mablag' yo'q" })
    }

    // Balansni "band qilish": yaratilgan so'nggi PENDING/APPROVED/PAID
    // so'rovlar getAvailableBalance'da hisobga olinadi — shu bilan bir
    // xil mablag' ikki marta so'ralishining oldi olinadi
    const withdrawal = await prisma.referralWithdrawal.create({
      data: { userId, amount, paymentMethod, paymentDetails },
    })

    return reply.status(201).send({
      data: withdrawal,
      message: "Yechib olish so'rovi yuborildi. Admin ko'rib chiqadi.",
    })
  })
}

function maskPhone(phone: string | null): string {
  if (!phone) return 'Foydalanuvchi'
  const digits = phone.replace(/\D/g, '')
  return `+998 •• ••• •• ${digits.slice(-2)}`
}

function fmtUzs(n: number): string {
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
}
