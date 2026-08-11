import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ReferralStatus, ReferralWithdrawalStatus } from '@prisma/client'
import { notifyUser } from '../../services/notify'
import { logAdminAction } from '../../services/auditLog'
import { REFERRAL_REWARD_UZS, MIN_WITHDRAWAL_UZS } from '../../config/referral'

/**
 * Referral & Rewards — admin boshqaruvi
 *
 * GET  /admin/referrals                       — ro'yxat (filtr/qidiruv)
 * GET  /admin/referrals/statistics             — umumiy statistika
 * GET  /admin/referral-withdrawals             — yechib olish so'rovlari
 * POST /admin/referral-withdrawals/:id/approve
 * POST /admin/referral-withdrawals/:id/reject  — sabab majburiy
 * POST /admin/referral-withdrawals/:id/pay
 *
 * Barchasi 🛡️ ADMIN roli talab qiladi
 */
export default async function adminReferralRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // ─────────────────────────────────────────────
  // GET /admin/referrals
  // ─────────────────────────────────────────────

  const listQuerySchema = z.object({
    q:      z.string().optional(), // referrer/referred ism yoki telefon bo'yicha
    status: z.nativeEnum(ReferralStatus).optional(),
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
  })

  fastify.get('/admin/referrals', async (request, reply) => {
    const { q, status, page, limit } = listQuerySchema.parse(request.query)
    const skip = (page - 1) * limit

    const where = {
      ...(status && { status }),
      ...(q && {
        OR: [
          { referrer:     { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q } }] } },
          { referredUser: { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q } }] } },
          { referralCode: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        select: {
          id: true, referralCode: true, status: true, createdAt: true, qualifiedAt: true,
          referrer:     { select: { id: true, name: true, phone: true } },
          referredUser: { select: { id: true, name: true, phone: true } },
          reward:       { select: { amount: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.referral.count({ where }),
    ])

    return reply.send({
      data: referrals,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // ─────────────────────────────────────────────
  // GET /admin/referrals/statistics
  // ─────────────────────────────────────────────

  fastify.get('/admin/referrals/statistics', async (_request, reply) => {
    const [byStatus, rewardSum, withdrawnSum, pendingWithdrawals, activeReferrers] = await Promise.all([
      prisma.referral.groupBy({ by: ['status'], _count: true }),
      prisma.referralReward.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true } }),
      prisma.referralWithdrawal.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.referralWithdrawal.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true }, _count: true }),
      prisma.referral.groupBy({ by: ['referrerId'], where: { status: 'QUALIFIED' }, _count: true }),
    ])

    const countByStatus = Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Record<string, number>

    return reply.send({
      data: {
        totalReferrals:    Object.values(countByStatus).reduce((a, b) => a + b, 0),
        activeReferrals:   countByStatus.QUALIFIED ?? 0,
        pendingReferrals:  countByStatus.PENDING ?? 0,
        rejectedReferrals: countByStatus.REJECTED ?? 0,
        totalRewardsIssued: rewardSum._sum.amount ?? 0,
        totalWithdrawn:     withdrawnSum._sum.amount ?? 0,
        pendingWithdrawalsAmount: pendingWithdrawals._sum.amount ?? 0,
        pendingWithdrawalsCount:  pendingWithdrawals._count,
        activeReferrersCount: activeReferrers.length,
        referralReward: REFERRAL_REWARD_UZS,
        minWithdrawal:  MIN_WITHDRAWAL_UZS,
      },
    })
  })

  // ─────────────────────────────────────────────
  // GET /admin/referral-withdrawals
  // ─────────────────────────────────────────────

  const withdrawalListSchema = z.object({
    q:      z.string().optional(),
    status: z.nativeEnum(ReferralWithdrawalStatus).optional(),
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
  })

  fastify.get('/admin/referral-withdrawals', async (request, reply) => {
    const { q, status, page, limit } = withdrawalListSchema.parse(request.query)
    const skip = (page - 1) * limit

    const where = {
      ...(status && { status }),
      ...(q && {
        user: { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q } }] },
      }),
    }

    const [withdrawals, total] = await Promise.all([
      prisma.referralWithdrawal.findMany({
        where,
        select: {
          id: true, amount: true, paymentMethod: true, paymentDetails: true, status: true,
          requestedAt: true, processedAt: true, rejectionReason: true,
          user: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.referralWithdrawal.count({ where }),
    ])

    return reply.send({
      data: withdrawals,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // ─────────────────────────────────────────────
  // POST /admin/referral-withdrawals/:id/approve
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>('/admin/referral-withdrawals/:id/approve', async (request, reply) => {
    const { id } = request.params
    const withdrawal = await prisma.referralWithdrawal.findUnique({ where: { id } })
    if (!withdrawal) return reply.status(404).send({ error: "So'rov topilmadi" })
    if (withdrawal.status !== 'PENDING') {
      return reply.status(400).send({ error: "Faqat kutilayotgan so'rovlarni tasdiqlash mumkin" })
    }

    await prisma.referralWithdrawal.update({
      where: { id },
      data: { status: 'APPROVED', processedAt: new Date(), processedBy: (request.user as { id: string }).id },
    })

    logAdminAction(prisma, request, {
      action: 'referral_withdrawal.approve',
      entityType: 'ReferralWithdrawal',
      entityId: id,
      before: { status: withdrawal.status },
      after: { status: 'APPROVED' },
    })

    return reply.send({ message: "So'rov tasdiqlandi" })
  })

  // ─────────────────────────────────────────────
  // POST /admin/referral-withdrawals/:id/reject
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>('/admin/referral-withdrawals/:id/reject', async (request, reply) => {
    const { id } = request.params
    const { reason } = z.object({ reason: z.string().min(3, 'Sabab kiritilishi shart').max(500) }).parse(request.body)

    const withdrawal = await prisma.referralWithdrawal.findUnique({ where: { id } })
    if (!withdrawal) return reply.status(404).send({ error: "So'rov topilmadi" })
    if (withdrawal.status === 'PAID') {
      return reply.status(400).send({ error: "To'langan so'rovni rad etib bo'lmaydi" })
    }

    await prisma.referralWithdrawal.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        processedAt: new Date(),
        processedBy: (request.user as { id: string }).id,
      },
    })

    notifyUser(prisma, {
      userId: withdrawal.userId,
      type: 'referral_withdrawal_rejected',
      title: "Bonus yechib olish so'rovi rad etildi",
      body: `⚠️ Bonus yechib olish so'rovingiz rad etildi. Sabab: ${reason}`,
    })

    logAdminAction(prisma, request, {
      action: 'referral_withdrawal.reject',
      entityType: 'ReferralWithdrawal',
      entityId: id,
      before: { status: withdrawal.status },
      after: { status: 'REJECTED', reason },
    })

    return reply.send({ message: "So'rov rad etildi" })
  })

  // ─────────────────────────────────────────────
  // POST /admin/referral-withdrawals/:id/pay
  // ─────────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>('/admin/referral-withdrawals/:id/pay', async (request, reply) => {
    const { id } = request.params
    const withdrawal = await prisma.referralWithdrawal.findUnique({ where: { id } })
    if (!withdrawal) return reply.status(404).send({ error: "So'rov topilmadi" })
    if (withdrawal.status !== 'APPROVED') {
      return reply.status(400).send({ error: "Faqat tasdiqlangan so'rovlarni to'langan deb belgilash mumkin" })
    }

    await prisma.referralWithdrawal.update({
      where: { id },
      data: { status: 'PAID', processedAt: new Date(), processedBy: (request.user as { id: string }).id },
    })

    notifyUser(prisma, {
      userId: withdrawal.userId,
      type: 'referral_withdrawal_paid',
      title: "Bonus to'landi",
      body: "💰 Bonus yechib olish so'rovingiz yakunlandi.",
    })

    logAdminAction(prisma, request, {
      action: 'referral_withdrawal.pay',
      entityType: 'ReferralWithdrawal',
      entityId: id,
      before: { status: withdrawal.status },
      after: { status: 'PAID' },
    })

    return reply.send({ message: "To'langan deb belgilandi" })
  })
}
