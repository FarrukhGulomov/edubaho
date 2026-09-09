/**
 * Telefon raqamni ko'rsatiladigan formatga o'tkazish.
 * +998901234567 → +998 (90) 123-45-67 (CLAUDE.md: loyihaning standart formati)
 *
 * Backend'dagi apps/api/src/utils/phone.ts bilan bir xil algoritm — bu yerda
 * faqat KO'RSATISH uchun ishlatiladi (tel: havolasi xom qiymat bilan qoladi).
 * Normalizatsiya qilib bo'lmasa (kutilmagan format), xom qiymat qaytariladi —
 * hech narsa taxmin qilinmaydi.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  let normalized: string | null = null
  if (digits.startsWith('998') && digits.length === 12) normalized = digits
  else if (digits.startsWith('0') && digits.length === 10) normalized = `998${digits.slice(1)}`
  else if (digits.length === 9) normalized = `998${digits}`

  if (!normalized) return phone

  const d = normalized.slice(3)
  return `+998 (${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}`
}
