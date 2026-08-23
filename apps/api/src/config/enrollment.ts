import { env } from '../utils/env'

/**
 * Enrollment Claims — biznes qoidalari (bitta manba: backend).
 *
 * "Men kurs sotib oldim" — foydalanuvchi o'zi bildirgan, admin tasdiqlagan
 * har bir claim uchun beriladigan bonus. referralService.getAvailableBalance
 * bilan BIR XIL hamyon (wallet) balansiga qo'shiladi — foydalanuvchi uchun
 * referral va enrollment bonuslari bitta umumiy balans sifatida ko'rinadi.
 */

/** Admin tasdiqlagan har bir enrollment claim uchun foydalanuvchiga beriladigan bonus (BCN — BilimCoin) */
export const ENROLLMENT_REWARD_UZS = env.ENROLLMENT_REWARD_UZS
