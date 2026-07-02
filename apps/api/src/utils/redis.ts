import Redis from 'ioredis'
import { timingSafeEqual } from 'crypto'
import { env } from './env'

/**
 * Ikki satrni timing-safe taqqoslash (timing attack himoyasi).
 * Uzunliklar farq qilsa ham doimiy vaqtda ishlashga harakat qiladi.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})

redis.on('connect', () => {
  console.log('✅ Redis connected')
})

/**
 * OTP ni Redis'da saqlash
 * Key: otp:{phone}
 * TTL: 120 soniya
 */
export async function setOtp(phone: string, otp: string, ttl = 120): Promise<void> {
  await redis.set(`otp:${phone}`, otp, 'EX', ttl)
}

// Bitta OTP uchun ruxsat etilgan maksimal urinishlar soni (brute-force himoyasi)
const MAX_OTP_ATTEMPTS = 5

/**
 * OTP ni tekshirish va o'chirish (1 marta ishlatiladi).
 * 5 marta noto'g'ri urinishdan keyin OTP bekor qilinadi — brute-force himoyasi.
 */
export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const stored = await redis.get(`otp:${phone}`)
  if (!stored) return false

  if (!safeCompare(stored, otp)) {
    // Noto'g'ri urinishlarni sanash; limitdan oshsa OTP o'chiriladi
    const attempts = await redis.incr(`otp_attempts:${phone}`)
    await redis.expire(`otp_attempts:${phone}`, 120)
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await redis.del(`otp:${phone}`, `otp_attempts:${phone}`)
    }
    return false
  }

  await redis.del(`otp:${phone}`, `otp_attempts:${phone}`)
  return true
}

/**
 * Umumiy urinishlar hisoblagichi (masalan, admin PIN uchun).
 * Qaytaradi: joriy urinishlar soni.
 */
export async function incrementAttempts(key: string, ttlSeconds: number): Promise<number> {
  const attempts = await redis.incr(key)
  if (attempts === 1) await redis.expire(key, ttlSeconds)
  return attempts
}

/**
 * OTP yuborilgan vaqtni tekshirish (rate limit uchun)
 * Key: otp_sent:{phone}
 * TTL: 60 soniya
 */
export async function canSendOtp(phone: string): Promise<boolean> {
  const exists = await redis.get(`otp_sent:${phone}`)
  return !exists
}

export async function markOtpSent(phone: string, ttl = 60): Promise<void> {
  await redis.set(`otp_sent:${phone}`, '1', 'EX', ttl)
}

/**
 * Bir telefon raqamiga soatiga maksimal OTP yuborish cheklovi.
 * SMS pumping (xarajat) hujumidan himoya.
 */
export async function withinHourlyOtpLimit(phone: string, max = 5): Promise<boolean> {
  const count = await incrementAttempts(`otp_hourly:${phone}`, 3600)
  return count <= max
}

/**
 * Refresh token'ni blacklist'ga qo'shish (logout uchun)
 * TTL: 30 kun
 */
export async function blacklistToken(jti: string, ttl = 60 * 60 * 24 * 30): Promise<void> {
  await redis.set(`blacklist:${jti}`, '1', 'EX', ttl)
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const exists = await redis.get(`blacklist:${jti}`)
  return !!exists
}
