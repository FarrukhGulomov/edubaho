import type { Lang } from '@/contexts/LangContext'

/**
 * Muassasa narxlarini ko'rsatish — YAGONA joy.
 *
 * Ilgari `fmtUzs`/`formatUzs` 5 xil faylda alohida-alohida yozilgan edi va
 * natijada narx shunchaki "600 000 so'm" ko'rinishida chiqardi. Bu chalkash:
 * bu bir oylikmi, kursning to'liq narximi yoki bir martalik to'lovmi —
 * bilib bo'lmasdi.
 *
 * InstitutionPricing modelida davr ANIQ belgilangan (`monthlyMin/Max` va
 * `yearlyMin/Max`), shuning uchun matn ham shunga qarab beriladi:
 *   monthlyMin bor  → "Oyiga 600 000 so'mdan"
 *   faqat yearlyMin → "Yiliga 6 000 000 so'mdan"
 *   davr noma'lum   → "600 000 so'mdan"
 *
 * Ma'lumot yo'q bo'lsa hech narsa TAXMIN QILINMAYDI — null qaytadi va
 * chaqiruvchi joy narxni umuman ko'rsatmaydi.
 */

export interface PricingLike {
  monthlyMin?: number | null
  monthlyMax?: number | null
  yearlyMin?: number | null
  yearlyMax?: number | null
}

/** 600000 → "600 000 so'm" (CLAUDE.md: bo'shliq ajratuvchi + "so'm" suffiksi) */
export function formatUzs(n: number): string {
  return `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`
}

/** 600000 → "600 000" (birliksiz — birlik alohida qo'shiladigan joylar uchun) */
export function formatNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export interface PriceLabel {
  /** Kartalarda ko'rinadigan qisqa matn — "600 000 so'm/oy" */
  short: string
  /** To'liq, o'qib tushunarli matn — "Oyiga 600 000 so'mdan" */
  full: string
  /** Boshlanish summasi (saralash/solishtirish uchun) */
  amount: number
}

/**
 * Muassasaning "dan boshlab" narxini matnga aylantiradi.
 * Narx ma'lumoti bo'lmasa null.
 */
export function priceFrom(pricing: PricingLike | null | undefined, lang: Lang): PriceLabel | null {
  if (!pricing) return null

  const monthly = pricing.monthlyMin ?? null
  const yearly  = pricing.yearlyMin ?? null

  if (monthly && monthly > 0) {
    const money = formatUzs(monthly)
    return {
      amount: monthly,
      short: lang === 'ru' ? `${formatNum(monthly)} сум/мес` : `${formatNum(monthly)} so'm/oy`,
      full:  lang === 'ru' ? `От ${money.replace("so'm", 'сум')} в месяц` : `Oyiga ${money}dan`,
    }
  }

  if (yearly && yearly > 0) {
    const money = formatUzs(yearly)
    return {
      amount: yearly,
      short: lang === 'ru' ? `${formatNum(yearly)} сум/год` : `${formatNum(yearly)} so'm/yil`,
      full:  lang === 'ru' ? `От ${money.replace("so'm", 'сум')} в год` : `Yiliga ${money}dan`,
    }
  }

  return null
}

/**
 * Davri noma'lum summa uchun (masalan foydalanuvchi kiritgan byudjet) —
 * "dan" qo'shiladi, lekin oylik/yillik deb TAXMIN QILINMAYDI.
 */
export function amountFrom(amount: number, lang: Lang): string {
  const money = formatUzs(amount)
  return lang === 'ru' ? `От ${money.replace("so'm", 'сум')}` : `${money}dan`
}
