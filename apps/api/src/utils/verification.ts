/**
 * Muassasa ishonch darajasi — 3 bosqichli tizim.
 *
 * UNVERIFIED — hali hech kim egalik qilib olmagan (masalan, tashqi manbadan
 *   import qilingan yoki admin qo'lda qo'shgan, lekin markaz o'zi hali
 *   ro'yxatdan o'tmagan).
 * CLAIMED    — markaz vakili "Bu muassasa siznikimi?" orqali egalik so'rovi
 *   yuborgan va admin uni tasdiqlagan (InstitutionClaim.status = APPROVED).
 *   Ma'lumotlarni markazning o'zi boshqaradi, lekin Bilimon hali chuqur
 *   tekshiruv (telefon/manzil/hujjat) o'tkazmagan.
 * VERIFIED   — Bilimon administratori ma'lumotlarni shaxsan tekshirib,
 *   qo'lda tasdiqlagan (Institution.isVerified = true).
 *
 * Muhim: claim tasdiqlash ENDI avtomatik VERIFIED qilib yubormaydi (avval
 * shunday edi) — faqat CLAIMED holatiga o'tkazadi. VERIFIED faqat admin
 * panelidagi alohida "Tasdiqlangan muassasa" tugmasi orqali beriladi.
 */
export type VerificationLevel = 'UNVERIFIED' | 'CLAIMED' | 'VERIFIED'

/** Prisma select'da qo'shiladigan minimal fragment — faqat APPROVED claim borligini bilish uchun */
export const approvedClaimSelect = {
  where: { status: 'APPROVED' as const },
  select: { id: true },
  take: 1,
} as const

/**
 * `isVerified` va (agar so'ralgan bo'lsa) `claims` maydonlaridan
 * `verificationLevel`ni hisoblab, natijaga qo'shadi. Ichki `claims`
 * massivi javobdan olib tashlanadi (frontend'ga kerak emas).
 */
export function withVerificationLevel<T extends { isVerified: boolean; claims?: { id: string }[] }>(
  inst: T,
): Omit<T, 'claims'> & { verificationLevel: VerificationLevel } {
  const { claims, ...rest } = inst
  const verificationLevel: VerificationLevel = inst.isVerified
    ? 'VERIFIED'
    : (claims?.length ?? 0) > 0
      ? 'CLAIMED'
      : 'UNVERIFIED'
  return { ...rest, verificationLevel }
}
