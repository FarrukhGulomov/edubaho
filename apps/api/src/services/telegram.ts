import crypto from 'crypto'

/**
 * Telegram Login Widget dan kelgan ma'lumotlarni tasdiqlash.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...fields } = data

  // auth_date 5 daqiqadan eski bo'lsa rad etish (replay attack himoyasi)
  const now = Math.floor(Date.now() / 1000)
  if (now - fields.auth_date > 300) return false

  // Bot tokendan secret key yasash
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  // Maydonlarni alfavit tartibida "key=value\n..." formatga keltirish
  const checkString = (Object.keys(fields) as (keyof typeof fields)[])
    .filter((k) => fields[k] !== undefined)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n')

  const computedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex')

  // Timing-safe taqqoslash (timing attack himoyasi)
  const a = Buffer.from(computedHash)
  const b = Buffer.from(hash)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
