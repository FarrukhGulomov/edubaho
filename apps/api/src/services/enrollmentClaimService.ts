import type { PrismaClient } from '@prisma/client'
import { notifyUser } from './notify'
import { formatBcn } from '../utils/currency'
import { ENROLLMENT_REWARD_UZS } from '../config/enrollment'

/**
 * Enrollment Claims — "Men kurs sotib oldim" asosiy biznes mantiq.
 *
 * OQIM:
 *   Foydalanuvchi profilida "Kurs sotib oldim" → EnrollmentClaim(PENDING)
 *   → Admin ko'rib chiqadi → APPROVED bo'lsa: EnrollmentReward(CONFIRMED,
 *     +10 000 BCN — BilimCoin) — bu ReferralReward bilan BIR XIL hamyon
 *     balansiga qo'shiladi (referralService.getAvailableBalance)
 *
 * MUHIM (fraud-himoya, ikkala yo'nalishda):
 * - Bitta claim = ko'pi bilan BITTA mukofot (EnrollmentReward.claimId
 *   @unique + updateMany(status:'PENDING') compare-and-swap)
 * - Bitta foydalanuvchi bitta muassasaga bir vaqtning o'zida FAQAT bitta
 *   PENDING claim yubora oladi (spam/ko'p marta urinish oldini olish) —
 *   lekin oldingi claim ko'rib chiqilgach (APPROVED/REJECTED), yangi
 *   claim yuborish mumkin (masalan ikkinchi kursni sotib olgan bo'lsa,
 *   yoki birinchi marta noto'g'ri rad etilgan bo'lsa qayta urinish uchun)
 * - Admin QAROR QABUL QILADI — markazning o'z hisoboti EMAS. Shu bilan
 *   markaz "faqat 1 tasi sotib oldi" deb kam ko'rsatishi endi ahamiyatsiz:
 *   har bir APPROVED claim alohida, real foydalanuvchiga bog'langan dalil
 *   va markazga hisob-kitob qilishda aynan shu son ishlatiladi.
 */

export class DuplicatePendingClaimError extends Error {}

/** Yangi claim yaratadi — shu foydalanuvchi shu muassasaga PENDING claim yuborgan bo'lsa rad etadi */
export async function createEnrollmentClaim(
  prisma: PrismaClient,
  params: { userId: string; institutionId: string; courseNote?: string; receiptUrl?: string },
) {
  const { userId, institutionId, courseNote, receiptUrl } = params

  const pending = await prisma.enrollmentClaim.findFirst({
    where: { userId, institutionId, status: 'PENDING' },
    select: { id: true },
  })
  if (pending) throw new DuplicatePendingClaimError()

  return prisma.enrollmentClaim.create({
    data: { userId, institutionId, courseNote, receiptUrl },
  })
}

/**
 * Admin claim'ni tasdiqlaydi: bonus beriladi va markazga hisob-kitob
 * uchun hisoblanadigan holatga o'tadi. Idempotent — allaqachon ko'rib
 * chiqilgan claim uchun xato qaytaradi (compare-and-swap DB darajasida).
 */
export async function approveEnrollmentClaim(
  prisma: PrismaClient,
  claimId: string,
  adminId: string,
): Promise<{ ok: boolean; userId?: string }> {
  const claim = await prisma.enrollmentClaim.findUnique({
    where: { id: claimId },
    select: { id: true, userId: true, status: true, institution: { select: { nameUz: true } } },
  })
  if (!claim || claim.status !== 'PENDING') return { ok: false }

  const approved = await prisma.$transaction(async (tx) => {
    const result = await tx.enrollmentClaim.updateMany({
      where: { id: claimId, status: 'PENDING' },
      data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() },
    })
    if (result.count === 0) return false

    await tx.enrollmentReward.create({
      data: { claimId, userId: claim.userId, amount: ENROLLMENT_REWARD_UZS },
    })
    return true
  })

  if (!approved) return { ok: false }

  notifyUser(prisma, {
    userId: claim.userId,
    type: 'enrollment_claim_approved',
    title: "Kurs sotib olganingiz tasdiqlandi!",
    body: `🎉 "${claim.institution.nameUz}" markazida kurs sotib olganingiz tasdiqlandi. Balansingizga ${formatBcn(ENROLLMENT_REWARD_UZS)} bonus qo'shildi.`,
    data: { claimId, amount: ENROLLMENT_REWARD_UZS },
  })

  return { ok: true, userId: claim.userId }
}

/** Admin claim'ni rad etadi — sabab bilan */
export async function rejectEnrollmentClaim(
  prisma: PrismaClient,
  claimId: string,
  adminId: string,
  reason: string,
): Promise<{ ok: boolean }> {
  const claim = await prisma.enrollmentClaim.findUnique({
    where: { id: claimId },
    select: { id: true, userId: true, status: true },
  })
  if (!claim || claim.status !== 'PENDING') return { ok: false }

  await prisma.enrollmentClaim.update({
    where: { id: claimId },
    data: { status: 'REJECTED', reviewedBy: adminId, reviewedAt: new Date(), reviewNote: reason },
  })

  notifyUser(prisma, {
    userId: claim.userId,
    type: 'enrollment_claim_rejected',
    title: "Kurs sotib olish xabari rad etildi",
    body: `⚠️ Sizning "kurs sotib oldim" xabaringiz tasdiqlanmadi. Sabab: ${reason}`,
  })

  return { ok: true }
}
