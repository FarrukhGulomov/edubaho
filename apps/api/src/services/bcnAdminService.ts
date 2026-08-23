import type { PrismaClient } from '@prisma/client'
import { notifyUser } from './notify'
import { formatBcn } from '../utils/currency'
import { getAvailableBalance } from './referralService'

/**
 * Super Admin — foydalanuvchi BilimCoin (BCN) balansini qo'lda boshqarish.
 *
 * `BcnAdjustment.amount` musbat (qo'shish) yoki manfiy (ayirish) bo'lishi
 * mumkin — referralService.getAvailableBalance bu jadvalni ham hisobga
 * oladi, shuning uchun bu yerda alohida "balans" maydoni SAQLANMAYDI,
 * har doim mavjud manbalardan (referral+enrollment+adjustment-withdrawal)
 * qayta hisoblanadi (bir xil "bitta haqiqat manbai" tamoyili — xuddi
 * referral balansi kabi).
 */

export class InvalidAdjustmentError extends Error {}

/** Balansga qo'shish (musbat amount) yoki ayirish (manfiy amount) */
export async function adjustBcnBalance(
  prisma: PrismaClient,
  params: { userId: string; amount: number; reason: string; adminId: string },
): Promise<{ newBalance: number }> {
  const { userId, amount, reason, adminId } = params
  if (amount === 0) throw new InvalidAdjustmentError()

  await prisma.bcnAdjustment.create({
    data: { userId, amount, reason, adminId },
  })

  const newBalance = await getAvailableBalance(prisma, userId)

  notifyUser(prisma, {
    userId,
    type: amount > 0 ? 'bcn_admin_credit' : 'bcn_admin_debit',
    title: amount > 0 ? "BilimCoin balansingiz to'ldirildi" : 'BilimCoin balansingiz o\'zgartirildi',
    body: amount > 0
      ? `💰 Balansingizga ${formatBcn(amount)} qo'shildi. Sabab: ${reason}`
      : `⚠️ Balansingizdan ${formatBcn(Math.abs(amount))} ayirildi. Sabab: ${reason}`,
    data: { amount, reason },
  })

  return { newBalance }
}

/** Balansni butunlay 0 ga tushiradi (joriy balansga teng manfiy adjustment yaratadi) */
export async function resetBcnBalance(
  prisma: PrismaClient,
  params: { userId: string; reason: string; adminId: string },
): Promise<{ newBalance: number }> {
  const { userId, reason, adminId } = params
  const current = await getAvailableBalance(prisma, userId)
  if (current === 0) return { newBalance: 0 }

  await prisma.bcnAdjustment.create({
    data: { userId, amount: -current, reason, adminId },
  })

  notifyUser(prisma, {
    userId,
    type: 'bcn_admin_reset',
    title: 'BilimCoin balansingiz nollandi',
    body: `⚠️ Balansingiz 0 BCN ga tushirildi. Sabab: ${reason}`,
  })

  return { newBalance: 0 }
}

/** Foydalanuvchining to'liq BCN tarixi — super admin ko'rish paneli uchun */
export async function getBcnLedger(prisma: PrismaClient, userId: string) {
  const [referralRewards, enrollmentRewards, adjustments, withdrawals, balance] = await Promise.all([
    prisma.referralReward.findMany({
      where: { userId },
      select: {
        id: true, amount: true, status: true, createdAt: true,
        referral: { select: { referredUser: { select: { name: true, phone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.enrollmentReward.findMany({
      where: { userId },
      select: {
        id: true, amount: true, status: true, createdAt: true,
        claim: { select: { institution: { select: { nameUz: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bcnAdjustment.findMany({
      where: { userId },
      select: { id: true, amount: true, reason: true, createdAt: true, adminId: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.referralWithdrawal.findMany({
      where: { userId },
      select: { id: true, amount: true, status: true, requestedAt: true, paymentMethod: true },
      orderBy: { requestedAt: 'desc' },
    }),
    getAvailableBalance(prisma, userId),
  ])

  const adminIds = [...new Set(adjustments.map((a) => a.adminId))]
  const admins = adminIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true, phone: true } })
    : []
  const adminNameById = new Map(admins.map((a) => [a.id, a.name ?? a.phone ?? "Noma'lum admin"]))

  return {
    balance,
    referralRewards,
    enrollmentRewards,
    adjustments: adjustments.map((a) => ({ ...a, adminName: adminNameById.get(a.adminId) ?? "Noma'lum admin" })),
    withdrawals,
  }
}
