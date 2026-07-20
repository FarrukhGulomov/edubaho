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

  return safeHashCompare(computedHash, hash)
}

// ─────────────────────────────────────────────────────────────
// Telegram Mini App (Web App) initData tekshiruvi
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// ─────────────────────────────────────────────────────────────

export interface TelegramWebAppUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

/**
 * Mini App'dan kelgan initData satrini tekshirish.
 *
 * Login Widget'dan farqi: secret = HMAC_SHA256(bot_token, key="WebAppData").
 * Muvaffaqiyatda user obyektini, aks holda null qaytaradi.
 *
 * @param maxAgeSeconds — initData eskirish muddati (default 24 soat;
 *   Mini App sessiyasi davomida initData yangilanmaydi)
 */
export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): TelegramWebAppUser | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  // auth_date eskirganini tekshirish (replay himoyasi)
  const authDate = Number(params.get('auth_date'))
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAgeSeconds) return null

  // hash'dan tashqari barcha maydonlar alfavit tartibida "key=value\n..." bo'ladi
  params.delete('hash')
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  // Mini App uchun maxsus secret: HMAC("WebAppData", bot_token)
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex')

  if (!safeHashCompare(computedHash, hash)) return null

  // user maydoni JSON satr sifatida keladi
  const userJson = params.get('user')
  if (!userJson) return null
  try {
    const user = JSON.parse(userJson) as TelegramWebAppUser
    if (!user.id || !user.first_name) return null
    return user
  } catch {
    return null
  }
}

/** Timing-safe hex hash taqqoslash */
function safeHashCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

// ─────────────────────────────────────────────────────────────
// Proaktiv push (Telegram Bot API)
// ─────────────────────────────────────────────────────────────

/**
 * Foydalanuvchiga Telegram orqali xabar yuboradi (masalan: narx tushdi,
 * saqlangan muassasada yangi sharh). Xatolik bo'lsa (bot bloklangan,
 * chatId noto'g'ri va h.k.) jim tashlab yuboriladi — bu fire-and-forget
 * bildirishnoma, asosiy oqimni to'xtatmasligi kerak.
 */
export async function sendTelegramMessage(
  botToken: string,
  telegramId: string,
  text: string,
): Promise<boolean> {
  if (!botToken || !telegramId) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
