import { z } from 'zod'

// O'zbekiston telefon raqami validatsiyasi
// Operator prefikslari: 90,91 (Beeline), 93,94 (Ucell), 97 (MTS),
//                       95,99 (Humans), 98 (UzMobile), 88 (Uztelecom)
const uzPhoneSchema = z
  .string()
  .regex(/^\+998(9[0-9]|88)\d{7}$/, "Noto'g'ri O'zbekiston telefon raqami. Format: +998XXXXXXXXX")

export const sendOtpSchema = z.object({
  phone: uzPhoneSchema,
})

export const verifyOtpSchema = z.object({
  phone: uzPhoneSchema,
  otp: z.string().length(6, 'OTP 6 ta raqamdan iborat bo\'lishi kerak').regex(/^\d+$/, 'OTP faqat raqamlardan iborat'),
  // Referral havolasi orqali kelgan bo'lsa (?ref=CODE) — faqat YANGI
  // foydalanuvchi yaratilganda ishlatiladi, mavjud userga ta'sir qilmaydi
  referralCode: z.string().min(4).max(20).optional(),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Ism kamida 2 ta belgi').max(100).optional(),
  email: z.string().email('Noto\'g\'ri email format').optional(),
  cityId: z.string().min(1).optional(),
  // Telegram/Google orqali ro'yxatdan o'tgan foydalanuvchilar telefon
  // raqamini profildan qo'shishi/yangilashi uchun (Lead CRM'da ko'rinishi shart)
  phone: uzPhoneSchema.optional(),
  // "Mos Edu'ni top" onboarding'ni bajarish/o'tkazib yuborish belgisi
  matchOnboardingCompletedAt: z.coerce.date().optional(),
})

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
