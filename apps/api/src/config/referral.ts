import { env } from '../utils/env'

/**
 * Referral & Rewards — biznes qoidalari (bitta manba, boshqa hech qayerda
 * takrorlanmasin — backend har doim haqiqiy manba, frontend faqat
 * ko'rsatish uchun shu qiymatlarni API orqali oladi).
 *
 * Miqdorlar env orqali sozlanadi (utils/env.ts) — masalan aksiya davrida
 * REFERRAL_REWARD_UZS oshirilishi mumkin, kodga tegmasdan.
 */

/** Har bir ACTIVE USER bo'lgan referral uchun referrerga beriladigan mukofot (BCN — BilimCoin) */
export const REFERRAL_REWARD_UZS = env.REFERRAL_REWARD_UZS

/** Minimal yechib olish summasi (BCN) */
export const MIN_WITHDRAWAL_UZS = env.MIN_WITHDRAWAL_UZS

/** Dastur butunlay o'chirilgan bo'lsa — yangi referral yaratilmaydi */
export const REFERRAL_PROGRAM_ENABLED = env.REFERRAL_PROGRAM_ENABLED === 'true'

/**
 * "ACTIVE USER" — referral mukofot olishi uchun referred foydalanuvchi
 * bajarishi shart bo'lgan LeadEvent turlari (kamida bittasi yetarli).
 *
 * Tanlov mezoni: shunchaki sahifa ochish yoki ro'yxatdan o'tish YETARLI
 * EMAS — chin niyatni bildiruvchi, ko'p bosqichli, real mahsulot
 * qiymatini ifodalovchi harakat kerak. "Menga mosini top" (EduFit)
 * wizard'ini tugatish platformaning asosiy va eng ma'noli harakati —
 * tasodifan bosilmaydi, 5 ta savolga astoydil javob berishni talab qiladi.
 *
 * ESLATMA: bu — UCHTA qalifikatsiya shartidan FAQAT bittasi (referralService.ts
 * tryQualifyReferral). Qolgan ikkitasi: ism-familiya kiritilgan va telefon
 * Telegram orqali tasdiqlangan (User.phoneVerifiedAt) bo'lishi shart.
 */
export const ACTIVE_USER_QUALIFYING_EVENTS = ['match_completed'] as const
