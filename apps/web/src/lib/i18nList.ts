import type { Lang } from '@/contexts/LangContext'

/**
 * programs/shifts/specializations kabi ELEMENT-BO'YICHA tarjima qilinadigan
 * ro'yxatlar uchun umumiy yordamchi.
 *
 * `ru[i]` — `uz[i]`ning tarjimasi. Bu maydonlar ilgari umuman
 * tarjima qilinmagan edi (CLAUDE.md qoidasi: har bir content field
 * uz/ru juft bo'lishi kerak — UX audit topilmasi). `ru` ro'yxati
 * `uz`dan qisqaroq yoki bo'sh bo'lishi mumkin (tarjima hali to'liq
 * kiritilmagan) — bunday holatda mos element uchun o'zbekcha qiymatga
 * qaytiladi, hech narsa yashirilmaydi yoki bo'sh chiqmaydi.
 */
export function localizeList(uz: string[] | null | undefined, ru: string[] | null | undefined, lang: Lang): string[] {
  if (!uz || uz.length === 0) return []
  if (lang !== 'ru') return uz
  return uz.map((v, i) => ru?.[i]?.trim() || v)
}

/**
 * Admin formadagi "Dars vaqtlari" (shifts) — erkin matn EMAS, tugmalar
 * orqali tanlanadigan YOPIQ 5 ta qiymatdan iborat to'plam (InstitutionForm.tsx
 * dagi SHIFTS ro'yxati). Shu sababli tarjimasini xavfsiz avtomatik
 * hisoblash mumkin — dasturlash kurslari yoki fan nomlaridan farqli
 * o'laroq, bu yerda noto'g'ri tarjima xavfi yo'q (oddiy, bir ma'noli so'zlar).
 */
export const SHIFT_RU_MAP: Record<string, string> = {
  'Ertalabki (08:00-13:00)': 'Утренняя (08:00-13:00)',
  'Tushki (13:00-18:00)':    'Дневная (13:00-18:00)',
  'Kechki (18:00-22:00)':    'Вечерняя (18:00-22:00)',
  'Dam olish kunlari':       'Выходные дни',
  'Onlayn':                  'Онлайн',
}
