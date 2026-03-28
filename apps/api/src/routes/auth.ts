import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { env } from '../utils/env'
import { sendOtpSchema, verifyOtpSchema, refreshSchema, updateProfileSchema } from '../schemas/auth'
import { normalizePhone, generateOtp } from '../utils/phone'
import { redis, setOtp, verifyOtp, canSendOtp, markOtpSent } from '../utils/redis'
import { sendSmsOtp } from '../services/sms'
import { verifyTelegramAuth } from '../services/telegram'
import { generateTokens, verifyRefreshToken, revokeRefreshToken } from '../services/tokens'

/**
 * Auth routes
 *
 * POST 🔓 /auth/send-otp     — OTP yuborish
 * POST 🔓 /auth/verify-otp   — OTP tasdiqlash + token olish
 * POST 🔓 /auth/refresh      — Access token yangilash
 * POST 🔑 /auth/logout       — Chiqish
 * GET  🔑 /auth/me           — Joriy foydalanuvchi ma'lumotlari
 * PATCH 🔑 /auth/profile     — Profil yangilash
 */
export default async function authRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify

  // ─────────────────────────────────────────────
  // POST /auth/send-otp
  // Rate limit: 10 req/min/IP (global config'da)
  // ─────────────────────────────────────────────

  fastify.post('/auth/send-otp', async (request, reply) => {
    const { phone: rawPhone } = sendOtpSchema.parse(request.body)

    const phone = normalizePhone(rawPhone)
    if (!phone) {
      return reply.status(400).send({ error: "Noto'g'ri telefon raqami formati" })
    }

    // 60 soniya davomida qayta yuborish cheklovi
    const allowed = await canSendOtp(phone)
    if (!allowed) {
      return reply.status(429).send({
        error: 'Iltimos, 60 soniya kuting',
        retryAfter: 60,
      })
    }

    const otp = generateOtp()

    await Promise.all([
      setOtp(phone, otp, 120),       // OTP 2 daqiqa amal qiladi
      markOtpSent(phone, 60),        // 60 soniya cooldown
      sendSmsOtp(phone, otp),        // SMS yuborish
    ])

    return reply.send({ success: true, expiresIn: 120 })
  })

  // ─────────────────────────────────────────────
  // POST /auth/verify-otp
  // ─────────────────────────────────────────────

  fastify.post('/auth/verify-otp', async (request, reply) => {
    const { phone: rawPhone, otp } = verifyOtpSchema.parse(request.body)

    const phone = normalizePhone(rawPhone)
    if (!phone) {
      return reply.status(400).send({ error: "Noto'g'ri telefon raqami formati" })
    }

    const isValid = await verifyOtp(phone, otp)
    if (!isValid) {
      return reply.status(400).send({ error: "OTP noto'g'ri yoki muddati tugagan" })
    }

    // Foydalanuvchini topish yoki yaratish (upsert)
    const user = await prisma.user.upsert({
      where: { phone },
      update: { lastActiveAt: new Date() },
      create: { phone, isVerified: true },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        institutionClaims: {
          where: { status: 'APPROVED' },
          select: { institutionId: true },
          take: 1,
        },
      },
    })

    const isNewUser = !user.name
    const institutionId = user.institutionClaims[0]?.institutionId

    const { accessToken, refreshToken } = await generateTokens(
      user.id,
      user.role as Parameters<typeof generateTokens>[1],
      institutionId,
    )

    return reply.send({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    })
  })

  // ─────────────────────────────────────────────
  // POST /auth/refresh
  // ─────────────────────────────────────────────

  fastify.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body)

    try {
      const payload = await verifyRefreshToken(refreshToken)

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          phone: true,
          name: true,
          role: true,
          institutionClaims: {
            where: { status: 'APPROVED' },
            select: { institutionId: true },
            take: 1,
          },
        },
      })

      if (!user) {
        return reply.status(401).send({ error: 'Foydalanuvchi topilmadi' })
      }

      // Eski refresh token'ni bekor qilish (rotation)
      await revokeRefreshToken(payload.sub, payload.jti)

      const institutionId = user.institutionClaims[0]?.institutionId
      const tokens = await generateTokens(
        user.id,
        user.role as Parameters<typeof generateTokens>[1],
        institutionId,
      )

      return reply.send(tokens)
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string }
      if (error.statusCode) {
        return reply.status(error.statusCode).send({ error: error.message })
      }
      throw err
    }
  })

  // ─────────────────────────────────────────────
  // POST /auth/logout
  // ─────────────────────────────────────────────

  fastify.post(
    '/auth/logout',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: userId, jti } = request.user as { id: string; jti?: string }

      if (jti) {
        await revokeRefreshToken(userId, jti)
      }

      return reply.send({ success: true, message: 'Muvaffaqiyatli chiqdingiz' })
    },
  )

  // ─────────────────────────────────────────────
  // GET /auth/me
  // ─────────────────────────────────────────────

  fastify.get(
    '/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.user as { id: string }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          isVerified: true,
          createdAt: true,
          city: { select: { id: true, nameUz: true, nameRu: true } },
          institutionClaims: {
            where: { status: 'APPROVED' },
            select: {
              institutionId: true,
              institution: { select: { nameUz: true, slug: true } },
            },
            take: 1,
          },
        },
      })

      if (!user) {
        return reply.status(404).send({ error: 'Foydalanuvchi topilmadi' })
      }

      return reply.send({ data: user })
    },
  )

  // ─────────────────────────────────────────────
  // PATCH /auth/profile
  // ─────────────────────────────────────────────

  fastify.patch(
    '/auth/profile',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.user as { id: string }
      const data = updateProfileSchema.parse(request.body)

      if (Object.keys(data).length === 0) {
        return reply.status(400).send({ error: "O'zgartirilishi kerak bo'lgan ma'lumot yo'q" })
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      })

      return reply.send({ data: user, message: 'Profil yangilandi' })
    },
  )

  // ─────────────────────────────────────────────
  // POST /auth/admin-pin
  // Admin kirish uchun ikkinchi qadam: PIN tasdiqlash
  // Token + PIN → admin_verified flag (Redis'da 1 soat)
  // ─────────────────────────────────────────────

  fastify.post(
    '/auth/admin-pin',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { pin } = z.object({ pin: z.string().min(4) }).parse(request.body)
      const { id: userId, role } = request.user as { id: string; role: string }

      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Faqat adminlar uchun' })
      }

      if (pin !== env.ADMIN_PIN) {
        return reply.status(401).send({ error: "Admin PIN noto'g'ri" })
      }

      // Redis'da admin kirish tasdiqlangani 1 soat saqlanadi
      await redis.setex(`admin_verified:${userId}`, 3600, '1')

      return reply.send({ success: true, message: 'Admin kirishi tasdiqlandi' })
    },
  )

  // ─────────────────────────────────────────────
  // GET /auth/admin-check
  // Admin verifikatsiyasi hali amal qiladimi?
  // ─────────────────────────────────────────────

  fastify.get(
    '/auth/admin-check',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: userId, role } = request.user as { id: string; role: string }

      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return reply.send({ verified: false })
      }

      const verified = await redis.get(`admin_verified:${userId}`)
      return reply.send({ verified: verified === '1', role })
    },
  )

  // ─────────────────────────────────────────────
  // POST /auth/setup-super-admin
  // Birinchi super adminni ADMIN_PIN orqali belgilash
  // Auth shart emas — faqat PIN bilan himoyalangan
  // ─────────────────────────────────────────────

  fastify.post('/auth/setup-super-admin', async (request, reply) => {
    const { phone: rawPhone, pin } = z.object({
      phone: z.string().min(9),
      pin:   z.string().min(4),
    }).parse(request.body)

    if (pin !== env.ADMIN_PIN) {
      return reply.status(401).send({ error: "PIN noto'g'ri" })
    }

    const phone = normalizePhone(rawPhone)
    if (!phone) return reply.status(400).send({ error: "Noto'g'ri telefon raqami" })

    const user = await prisma.user.upsert({
      where:  { phone },
      update: { role: 'SUPER_ADMIN', isVerified: true },
      create: { phone, role: 'SUPER_ADMIN', isVerified: true },
    })

    await prisma.adminPermission.upsert({
      where:  { adminId: user.id },
      update: { canManageAll: true, canCreateInstitutions: true, canEditInstitutions: true, canDeleteInstitutions: true, canModerateReviews: true, canViewUsers: true },
      create: { adminId: user.id, canManageAll: true, institutionIds: [], canCreateInstitutions: true, canEditInstitutions: true, canDeleteInstitutions: true, canModerateReviews: true, canViewUsers: true },
    })

    return reply.send({ success: true, phone: user.phone, role: user.role })
  })

  // ─────────────────────────────────────────────
  // POST /auth/telegram
  // Telegram Login Widget orqali kirish
  // ─────────────────────────────────────────────

  fastify.post('/auth/telegram', async (request, reply) => {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return reply.status(503).send({ error: 'Telegram kirish hali sozlanmagan' })
    }

    const tgData = z.object({
      id:         z.number(),
      first_name: z.string(),
      last_name:  z.string().optional(),
      username:   z.string().optional(),
      photo_url:  z.string().optional(),
      auth_date:  z.number(),
      hash:       z.string(),
    }).parse(request.body)

    if (!verifyTelegramAuth(tgData, env.TELEGRAM_BOT_TOKEN)) {
      return reply.status(401).send({ error: 'Telegram tasdiqlanmadi yoki muddati o\'tgan' })
    }

    const telegramId = String(tgData.id)
    const name = [tgData.first_name, tgData.last_name].filter(Boolean).join(' ')

    const user = await prisma.user.upsert({
      where:  { telegramId },
      update: { lastActiveAt: new Date() },
      create: { telegramId, name, isVerified: true },
      select: {
        id: true, phone: true, name: true, role: true,
        institutionClaims: {
          where:  { status: 'APPROVED' },
          select: { institutionId: true },
          take:   1,
        },
      },
    })

    const isNewUser = !user.phone && !user.name
    const institutionId = user.institutionClaims[0]?.institutionId
    const { accessToken, refreshToken } = await generateTokens(
      user.id,
      user.role as Parameters<typeof generateTokens>[1],
      institutionId,
    )

    return reply.send({
      success: true,
      isNewUser,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    })
  })

  // GET /auth/dev-otp/:phone — development yoki ALLOW_DEV_OTP=true bo'lganda OTP ni ko'rish
  if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_OTP === 'true') {
    fastify.get('/auth/dev-otp/:phone', async (request, reply) => {
      const { phone } = request.params as { phone: string }
      const otp = await redis.get(`otp:${phone}`)
      if (!otp) return reply.code(404).send({ error: 'OTP topilmadi yoki muddati tugagan' })
      return reply.send({ phone, otp })
    })
  }
}
