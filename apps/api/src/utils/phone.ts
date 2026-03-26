/**
 * O'zbekiston telefon raqamlarini normalizatsiya qilish.
 * Kiritish: +998901234567, 998901234567, 0901234567, 901234567
 * Chiqish:  +998901234567
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')

  if (digits.startsWith('998') && digits.length === 12) {
    return `+${digits}`
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+998${digits.slice(1)}`
  }

  if (digits.length === 9) {
    return `+998${digits}`
  }

  return null
}

/**
 * Telefon raqamni ko'rsatiladigan formatga o'tkazish
 * +998901234567 → +998 (90) 123-45-67
 */
export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  if (!normalized) return phone

  const d = normalized.replace('+998', '')
  return `+998 (${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}`
}

/**
 * Tasodifiy 6 xonali OTP yaratish
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
