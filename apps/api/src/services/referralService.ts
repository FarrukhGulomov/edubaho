import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'
import { notifyUser } from './notify'
import { incrementAttempts } from '../utils/redis'
import {
  REFERRAL_REWARD_UZS, MIN_WITHDRAWAL_UZS, REFERRAL_PROGRAM_ENABLED,
  ACTIVE_USER_QUALIFYING_EVENTS,
} from '../config/referral'

/**
 * Referral & Rewards — asosiy biznes mantiq.
 *
 * OQIM:
 *   Referral havola → Yangi user → Ro'yxatdan o'tish → Referral(PENDING)
 *   → "ACTIVE USER" bo'lish uchun UCHALASI ham bajarilishi kerak:
 *     1) Ism-familiya kiritilgan
 *     2) Telefon Telegram orqali TASDIQLANGAN (phoneVerifiedAt)
 *     3) "Menga mosini top" wizard'ini tugatgan (match_completed)
 *   → Referral(QUALIFIED) → ReferralReward(CONFIRMED, +500 so'm)
 *
 * Bu uchta shart ikkita mustaqil joydan tekshiriladi (track.ts'da
 * match_completed kelganda, telegramWebhook.ts'da telefon tasdiqlanganda)
 * — qaysi biri OXIRGI bo'lib bajarilsa, referral o'sha yerda qalifikatsiya
 * qiladi (tartib muhim emas, har chaqiriqda uchala shart ham qayta tekshiriladi).
 *
 * MUHIM (fraud-himoya):
 * - Ro'yxatdan o'tishning o'zi HECH QACHON mukofot bermaydi
 * - Bitta referral = ko'pi bilan BITTA mukofot (ReferralReward.referralId @unique
 *   + updateMany(status:'PENDING') compare-and-swap — parallel so'rovlarda ham
 *   faqat bittasi g'olib chiqadi, DB darajasida kafolatlangan)
 * - Frontend HECH QACHON ishonchli manba emas — miqdor va faollik holati
 *   faqat shu yerda, serverda hisoblanadi
 */

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // chalkash belgilar (0/O, 1/I/L) olib tashlangan

// ─── Fraud himoyasi: IP asosida referral atributsiyasini cheklash ─────────
// Maqsad: bitta odam ko'plab akkaunt ochib (masalan turli Gmail/Telegram
// bilan), hammasini o'ziga referral qilib pul "ishlab olishi"ning oldini
// olish. Ikki qatlam: (1) bitta IP'dan kuniga umumiy referral soni,
// (2) bitta referrer bitta IP orqali kuniga necha marta "faollashishi"
// mumkinligi — aynan shu ikkinchisi sim-farming'ni ushlaydi, chunki oddiy
// foydalanuvchi turli do'stlarini turli joylardan taklif qiladi, lekin
// firibgar bitta joydan (uy/ofis) o'ziga ko'p marta referral yaratadi.
const MAX_REFERRALS_PER_IP_DAILY = 5
const MAX_REFERRALS_PER_REFERRER_IP_DAILY = 2

async function withinReferralIpLimits(ip: string, referrerId: string): Promise<boolean> {
  const [globalCount, referrerCount] = await Promise.all([
    incrementAttempts(`ref_ip:${ip}`, 86400),
    incrementAttempts(`ref_ip_ref:${ip}:${referrerId}`, 86400),
  ])
  return globalCount <= MAX_REFERRALS_PER_IP_DAILY && referrerCount <= MAX_REFERRALS_PER_REFERRER_IP_DAILY
}

function generateCode(): string {
  const bytes = randomBytes(8)
  let code = ''
  for (let i = 0; i < 8; i++) code += CODE_CHARS[(bytes[i] ?? 0) % CODE_CHARS.length]
  return code
}

/** Foydalanuvchining doimiy referral kodi — birinchi so'ralganda "lazy" yaratiladi */
export async function getOrCreateReferralCode(prisma: PrismaClient, userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } })
  if (user?.referralCode) return user.referralCode

  // Kollizyon ehtimoli juda past (32^8), lekin himoya uchun bir necha marta urinamiz
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } })
      return code
    } catch (err) {
      const isUniqueClash = (err as { code?: string })?.code === 'P2002'
      if (!isUniqueClash) throw err
    }
  }
  throw new Error("Referral kodi yaratib bo'lmadi")
}

/**
 * Yangi foydalanuvchi ro'yxatdan o'tganda chaqiriladi (FAQAT isNewUser=true
 * bo'lganda) — referral havolasi orqali kelgan bo'lsa, munosabatni yaratadi.
 *
 * Xato chiqarmaydi (fire-safe) — referral atributsiyasi muvaffaqiyatsiz
 * bo'lsa ham, asosiy ro'yxatdan o'tish jarayoni davom etishi kerak.
 */
export async function attributeReferral(
  prisma: PrismaClient,
  params: { referralCode?: string | null; referredUserId: string; ip?: string },
): Promise<void> {
  const { referralCode, referredUserId, ip } = params
  if (!REFERRAL_PROGRAM_ENABLED || !referralCode) return

  try {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.trim().toUpperCase() },
      select: { id: true, name: true, phone: true },
    })
    // Kod topilmasa yoki o'zini-o'zi taklif qilishga urinsa — jim o'tkaziladi
    if (!referrer || referrer.id === referredUserId) return

    // Fraud himoyasi: IP kunlik limitidan oshsa, referral bog'lanmaydi
    // (foydalanuvchi ro'yxatdan o'tishda hech qanday xato ko'rmaydi —
    // faqat referrer mukofot ololmaydi)
    if (ip && !(await withinReferralIpLimits(ip, referrer.id))) {
      console.warn(`Referral fraud himoyasi: IP limiti oshdi (ip=${ip}, referrer=${referrer.id})`)
      return
    }

    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId,
        referralCode: referralCode.trim().toUpperCase(),
      },
    })

    notifyUser(prisma, {
      userId: referrer.id,
      type: 'referral_registered',
      title: uzTitle('registered'),
      body: "👤 Yangi do'stingiz platformaga qo'shildi. U hali aktiv emas. Aktiv foydalanuvchiga aylanganda sizga " +
        fmtUzs(REFERRAL_REWARD_UZS) + ' bonus beriladi.',
    })
  } catch (err) {
    // P2002: referredUserId allaqachon boshqa referralga bog'langan
    // (masalan takroriy so'rov) — jim o'tkaziladi, referrer o'zgarmaydi
    const isUniqueClash = (err as { code?: string })?.code === 'P2002'
    if (!isUniqueClash) {
      console.error('Referral atributsiyasida xatolik:', err)
    }
  }
}

/**
 * Foydalanuvchi "ACTIVE USER" bo'ladigan harakatni bajarganda chaqiriladi
 * (track.ts'dan, LeadEvent yozilgandan keyin). Agar shu userga tegishli
 * PENDING referral bo'lsa — QUALIFIED qilib, mukofotni tasdiqlaydi.
 *
 * Idempotent: bir necha marta chaqirilsa ham (masalan foydalanuvchi
 * match wizard'ini qayta-qayta tugatsa) — faqat BITTA marta mukofot beriladi.
 */
export async function tryQualifyReferral(prisma: PrismaClient, referredUserId: string): Promise<void> {
  const referral = await prisma.referral.findUnique({
    where: { referredUserId },
    select: { id: true, status: true, referrerId: true },
  })
  if (!referral || referral.status !== 'PENDING') return

  // "ACTIVE USER" — uchala shart ham bajarilgan bo'lishi kerak. Bu funksiya
  // ikkita mustaqil chaqiruv nuqtasidan (match_completed va telefon
  // tasdiqlash) ishlaydi — tartibdan qat'i nazar, har safar hammasi qayta
  // tekshiriladi, faqat uchalasi ham to'g'ri bo'lganda qalifikatsiya bo'ladi
  const referredUser = await prisma.user.findUnique({
    where: { id: referredUserId },
    select: { name: true, phone: true, phoneVerifiedAt: true },
  })
  if (!referredUser?.name || !referredUser.phone || !referredUser.phoneVerifiedAt) return

  const qualifyingActivity = await prisma.leadEvent.findFirst({
    where: { userId: referredUserId, event: { in: [...ACTIVE_USER_QUALIFYING_EVENTS] } },
    select: { id: true },
  })
  if (!qualifyingActivity) return

  // Mukofotdan OLDINGI balansni bilib olamiz — "100 000 so'mga yetdi" xabari
  // faqat chegaradan AYNAN shu mukofot bilan o'tganda yuborilishi uchun
  const balanceBefore = await getAvailableBalance(prisma, referral.referrerId)

  const qualified = await prisma.$transaction(async (tx) => {
    // Compare-and-swap: faqat hali ham PENDING bo'lsa yangilanadi — parallel
    // so'rovlarda faqat BITTASI count=1 qaytaradi, qolganlari 0 (DB darajasida kafolat)
    const result = await tx.referral.updateMany({
      where: { id: referral.id, status: 'PENDING' },
      data: { status: 'QUALIFIED', qualifiedAt: new Date() },
    })
    if (result.count === 0) return false

    await tx.referralReward.create({
      data: {
        referralId: referral.id,
        userId: referral.referrerId,
        amount: REFERRAL_REWARD_UZS,
      },
    })
    return true
  })

  if (!qualified) return

  notifyUser(prisma, {
    userId: referral.referrerId,
    type: 'referral_qualified',
    title: uzTitle('qualified'),
    body: `🎉 Tabriklaymiz! Referalingiz aktiv foydalanuvchiga aylandi. Balansingizga ${fmtUzs(REFERRAL_REWARD_UZS)} bonus qo'shildi.`,
    data: { referralId: referral.id, amount: REFERRAL_REWARD_UZS },
  })

  const balanceAfter = balanceBefore + REFERRAL_REWARD_UZS
  if (balanceBefore < MIN_WITHDRAWAL_UZS && balanceAfter >= MIN_WITHDRAWAL_UZS) {
    notifyUser(prisma, {
      userId: referral.referrerId,
      type: 'referral_threshold_reached',
      title: uzTitle('threshold'),
      body: `🎉 Referral balansingiz ${fmtUzs(MIN_WITHDRAWAL_UZS)}ga yetdi. Endi bonusni yechib olishingiz mumkin.`,
    })
  }
}

/** Yechib olish uchun mavjud balans: tasdiqlangan mukofotlar − band qilingan/to'langan yechib olishlar */
export async function getAvailableBalance(prisma: PrismaClient, userId: string): Promise<number> {
  const [earned, reserved] = await Promise.all([
    prisma.referralReward.aggregate({
      where: { userId, status: 'CONFIRMED' },
      _sum: { amount: true },
    }),
    prisma.referralWithdrawal.aggregate({
      where: { userId, status: { in: ['PENDING', 'APPROVED', 'PAID'] } },
      _sum: { amount: true },
    }),
  ])
  return (earned._sum.amount ?? 0) - (reserved._sum.amount ?? 0)
}

/** Foydalanuvchining to'liq referral statistikasi — profil paneli va admin uchun bir xil manba */
export async function getReferralStats(prisma: PrismaClient, userId: string) {
  const [earned, withdrawn, counts, availableBalance] = await Promise.all([
    prisma.referralReward.aggregate({ where: { userId, status: 'CONFIRMED' }, _sum: { amount: true } }),
    prisma.referralWithdrawal.aggregate({ where: { userId, status: 'PAID' }, _sum: { amount: true } }),
    prisma.referral.groupBy({ by: ['status'], where: { referrerId: userId }, _count: true }),
    getAvailableBalance(prisma, userId),
  ])

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count])) as Record<string, number>
  const pendingCount = countByStatus.PENDING ?? 0
  const activeCount = countByStatus.QUALIFIED ?? 0
  const rejectedCount = countByStatus.REJECTED ?? 0
  const totalCount = pendingCount + activeCount + rejectedCount

  const remainingAmount = Math.max(0, MIN_WITHDRAWAL_UZS - availableBalance)
  const remainingActiveReferrals = remainingAmount > 0 ? Math.ceil(remainingAmount / REFERRAL_REWARD_UZS) : 0

  return {
    referralReward: REFERRAL_REWARD_UZS,
    minWithdrawal: MIN_WITHDRAWAL_UZS,
    availableBalance,
    totalEarned: earned._sum.amount ?? 0,
    totalWithdrawn: withdrawn._sum.amount ?? 0,
    // "Potensial" — hali aktiv bo'lmagan referallar aktiv bo'lsa qo'shiladigan miqdor
    // (haqiqiy balans emas, faqat gamifikatsiya ko'rsatkichi)
    potentialPending: pendingCount * REFERRAL_REWARD_UZS,
    totalReferrals: totalCount,
    activeReferrals: activeCount,
    pendingReferrals: pendingCount,
    rejectedReferrals: rejectedCount,
    canWithdraw: availableBalance >= MIN_WITHDRAWAL_UZS,
    remainingAmount,
    remainingActiveReferrals,
    progressPercent: Math.min(100, Math.round((availableBalance / MIN_WITHDRAWAL_UZS) * 100)),
  }
}

function fmtUzs(n: number): string {
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
}

function uzTitle(kind: 'registered' | 'qualified' | 'threshold'): string {
  return {
    registered: "Yangi referral",
    qualified: 'Referral bonusi!',
    threshold: 'Yechib olishga tayyor!',
  }[kind]
}
