import { randomBytes } from 'crypto'
import jwt from 'jsonwebtoken'
import { redis } from '../utils/redis'
import { env } from '../utils/env'
import type { Role } from '@prisma/client'

const REFRESH_TTL = 30 * 24 * 60 * 60 // 30 kun (soniya)

/**
 * Access + Refresh token juftini yaratish.
 *
 * accessToken  — JWT_SECRET bilan, 15 daqiqa
 * refreshToken — REFRESH_SECRET bilan, 30 kun
 * Redis'da saqlangan: refresh:{userId}:{jti}
 */
export async function generateTokens(
  userId: string,
  role: Role,
  institutionId?: string,
) {
  const jti = randomBytes(16).toString('hex')

  const accessToken = jwt.sign(
    { id: userId, role, institutionId, jti },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  )

  const refreshToken = jwt.sign(
    { sub: userId, jti },
    env.REFRESH_SECRET,
    { expiresIn: env.REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  )

  // Refresh token Redis'da saqlanadi (rotation + revocation)
  await redis.setex(`refresh:${userId}:${jti}`, REFRESH_TTL, '1')

  return { accessToken, refreshToken }
}

/**
 * Refresh token'ni tekshirish.
 * Agar Redis'da yo'q bo'lsa — revoked deb hisoblanadi.
 */
export async function verifyRefreshToken(
  token: string,
): Promise<{ sub: string; jti: string }> {
  let payload: { sub: string; jti: string }

  try {
    payload = jwt.verify(token, env.REFRESH_SECRET) as { sub: string; jti: string }
  } catch {
    throw { statusCode: 401, message: 'Refresh token noto\'g\'ri yoki muddati tugagan' }
  }

  const exists = await redis.exists(`refresh:${payload.sub}:${payload.jti}`)
  if (!exists) {
    throw { statusCode: 401, message: 'Token bekor qilingan. Qayta kiring.' }
  }

  return payload
}

/**
 * Refresh token'ni revoke qilish (logout uchun)
 */
export async function revokeRefreshToken(userId: string, jti: string): Promise<void> {
  await redis.del(`refresh:${userId}:${jti}`)
}

/**
 * Foydalanuvchining barcha refresh token'larini o'chirish (barcha qurilmalardan chiqish)
 */
export async function revokeAllTokens(userId: string): Promise<void> {
  const keys = await redis.keys(`refresh:${userId}:*`)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
