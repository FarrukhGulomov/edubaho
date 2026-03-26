import Redis from 'ioredis'
import { env } from './env'

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

/**
 * OTP ni tekshirish va o'chirish (1 marta ishlatiladi)
 */
export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const stored = await redis.get(`otp:${phone}`)
  if (stored !== otp) return false
  await redis.del(`otp:${phone}`)
  return true
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
