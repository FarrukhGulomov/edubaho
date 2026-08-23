import type { FastifyInstance, FastifyReply } from 'fastify'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { env } from '../utils/env'
import { sendOtpSchema, verifyOtpSchema, updateProfileSchema } from '../schemas/auth'
import { normalizePhone, generateOtp } from '../utils/phone'
import {
  redis, setOtp, verifyOtp, canSendOtp, markOtpSent,
  withinHourlyOtpLimit, incrementAttempts, safeCompare,
} from '../utils/redis'
import { sendSmsOtp } from '../services/sms'
import { verifyTelegramAuth, verifyTelegramWebAppInitData } from '../services/telegram'
import { verifyGoogleIdToken } from '../services/google'
import { generateTokens, verifyRefreshToken, revokeRefreshToken, REFRESH_TTL } from '../services/tokens'
import { attributeReferral } from '../services/referralService'

const REFRESH_COOKIE = 'rt'
// Faqat /auth/* yo'llariga yuboriladi — boshqa so'rovlarga tarqalmaydi.
// JS o'qiy olmaydi (httpOnly) — XSS orqali refresh token o'g'irlanishining oldini oladi.
function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: REFRESH_TTL,
  })
}
function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' })
}

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

  fastify.post('/auth/send-otp', {
    // SMS pumping himoyasi: bitta IP dan daqiqasiga ko'pi bilan 5 ta OTP so'rovi
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
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

    // Bitta raqamga soatiga ko'pi bilan 5 ta SMS (xarajat himoyasi)
    if (!(await withinHourlyOtpLimit(phone))) {
      return reply.status(429).send({
        error: "Juda ko'p urinish. 1 soatdan keyin qayta urinib ko'ring.",
        retryAfter: 3600,
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

  fastify.post('/auth/verify-otp', {
    // Brute-force himoyasi: bitta IP dan daqiqasiga ko'pi bilan 10 ta tekshirish
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { phone: rawPhone, otp, referralCode } = verifyOtpSchema.parse(request.body)

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
        createdAt: true,
        updatedAt: true,
        institutionClaims: {
          where: { status: 'APPROVED' },
          select: { institutionId: true },
          take: 1,
        },
      },
    })

    const isNewUser = !user.name
    // Referral atributsiyasi FAQAT hisob AYNAN shu so'rovda yaratilgan bo'lsa
    // ishlaydi (createdAt===updatedAt — upsert "create" tarmog'ini bosgan
    // paytda ikkalasi bir xil vaqtga o'rnatiladi). "isNewUser" flagiga
    // ishonib bo'lmaydi — u ismi hali kiritilmagan QAYTA kirgan userda ham
    // true bo'lishi mumkin, bu esa mavjud userni referralga aylantirib
    // qo'yardi (texnik topshiriq item #38'ni buzardi)
    if (referralCode && user.createdAt.getTime() === user.updatedAt.getTime()) {
      await attributeReferral(prisma, { referralCode, referredUserId: user.id, ip: request.ip })
    }
    const institutionId = user.institutionClaims[0]?.institutionId

    const { accessToken, refreshToken } = await generateTokens(
      user.id,
      user.role as Parameters<typeof generateTokens>[1],
      institutionId,
    )
    setRefreshCookie(reply, refreshToken)

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
    })
  })

  // ─────────────────────────────────────────────
  // POST /auth/refresh
  // Refresh token faqat httpOnly cookie'dan o'qiladi — JS unga kira olmaydi.
  // ─────────────────────────────────────────────

  fastify.post('/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE]
    if (!refreshToken) {
      return reply.status(401).send({ error: 'Qayta kirish kerak' })
    }

    try {
      const payload = await verifyRefreshToken(refreshToken)

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          phone: true,
          name: true,
          role: true,
          isActive: true,
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

      if (!user.isActive) {
        // Deaktiv qilingan hisob — eski refresh token'ni ham darhol bekor qilamiz
        await revokeRefreshToken(payload.sub, payload.jti)
        return reply.status(403).send({ error: 'Hisobingiz faol emas' })
      }

      // Eski refresh token'ni bekor qilish (rotation)
      await revokeRefreshToken(payload.sub, payload.jti)

      const institutionId = user.institutionClaims[0]?.institutionId
      const tokens = await generateTokens(
        user.id,
        user.role as Parameters<typeof generateTokens>[1],
        institutionId,
      )
      setRefreshCookie(reply, tokens.refreshToken)

      return reply.send({ accessToken: tokens.accessToken })
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
      clearRefreshCookie(reply)

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
          phoneVerifiedAt: true,
          createdAt: true,
          matchOnboardingCompletedAt: true,
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

      try {
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
            matchOnboardingCompletedAt: true,
          },
        })

        return reply.send({ data: user, message: 'Profil yangilandi' })
      } catch (err: unknown) {
        // P2002: unique constraint — telefon/email boshqa hisobda allaqachon ishlatilgan
        const code = (err as { code?: string; meta?: { target?: string[] } }).code
        if (code === 'P2002') {
          const field = (err as { meta?: { target?: string[] } }).meta?.target?.[0]
          const msg = field === 'phone'
            ? 'Bu telefon raqami boshqa hisobda ishlatilmoqda'
            : field === 'email'
              ? 'Bu email boshqa hisobda ishlatilmoqda'
              : "Bu ma'lumot allaqachon band"
          return reply.status(409).send({ error: msg })
        }
        throw err
      }
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

      // PIN brute-force himoyasi: 15 daqiqada ko'pi bilan 5 urinish
      const attempts = await incrementAttempts(`pin_attempts:${userId}`, 900)
      if (attempts > 5) {
        return reply.status(429).send({
          error: "Juda ko'p noto'g'ri urinish. 15 daqiqadan keyin qayta urining.",
        })
      }

      if (!safeCompare(pin, env.ADMIN_PIN)) {
        return reply.status(401).send({ error: "Admin PIN noto'g'ri" })
      }

      // Muvaffaqiyatli kirishda hisoblagichni tozalash
      await redis.del(`pin_attempts:${userId}`)

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

  fastify.post('/auth/setup-super-admin', {
    // Bootstrap endpoint — juda qattiq rate limit
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const { phone: rawPhone, pin } = z.object({
      phone: z.string().min(9),
      pin:   z.string().min(4),
    }).parse(request.body)

    // Faqat BIRINCHI super adminni yaratish uchun ishlaydi.
    // Super admin allaqachon mavjud bo'lsa — endpoint yopiq (privilege escalation himoyasi).
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    })
    if (existingSuperAdmin) {
      return reply.status(403).send({
        error: "Super admin allaqachon mavjud. Yangi adminlar faqat super admin panelidan tayinlanadi.",
      })
    }

    if (!safeCompare(pin, env.ADMIN_PIN)) {
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
      referralCode: z.string().min(4).max(20).optional(),
    }).parse(request.body)

    if (!verifyTelegramAuth(tgData, env.TELEGRAM_BOT_TOKEN)) {
      return reply.status(401).send({ error: 'Telegram tasdiqlanmadi yoki muddati o\'tgan' })
    }

    const telegramId = String(tgData.id)
    const name = [tgData.first_name, tgData.last_name].filter(Boolean).join(' ')
    const telegramUsername = tgData.username ?? null

    const user = await prisma.user.upsert({
      where:  { telegramId },
      update: { lastActiveAt: new Date(), telegramUsername },
      create: { telegramId, telegramUsername, name, isVerified: true },
      select: {
        id: true, phone: true, name: true, role: true, createdAt: true, updatedAt: true,
        institutionClaims: {
          where:  { status: 'APPROVED' },
          select: { institutionId: true },
          take:   1,
        },
      },
    })

    const isNewUser = !user.phone && !user.name
    if (tgData.referralCode && user.createdAt.getTime() === user.updatedAt.getTime()) {
      await attributeReferral(prisma, { referralCode: tgData.referralCode, referredUserId: user.id, ip: request.ip })
    }
    const institutionId = user.institutionClaims[0]?.institutionId
    const { accessToken, refreshToken } = await generateTokens(
      user.id,
      user.role as Parameters<typeof generateTokens>[1],
      institutionId,
    )
    setRefreshCookie(reply, refreshToken)

    return reply.send({
      success: true,
      isNewUser,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      accessToken,
    })
  })

  // ─────────────────────────────────────────────
  // POST /auth/telegram-webapp
  // Telegram Mini App ichidan avtomatik kirish (initData bilan).
  // Foydalanuvchi hech narsa bosmaydi — Telegram o'zi imzolangan
  // ma'lumotni beradi, biz tekshirib token qaytaramiz.
  // ─────────────────────────────────────────────

  fastify.post('/auth/telegram-webapp', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return reply.status(503).send({ error: 'Telegram kirish hali sozlanmagan' })
    }

    const { initData, referralCode } = z.object({
      initData: z.string().min(20).max(8192),
      referralCode: z.string().min(4).max(20).optional(),
    }).parse(request.body)

    const tgUser = verifyTelegramWebAppInitData(initData, env.TELEGRAM_BOT_TOKEN)
    if (!tgUser) {
      return reply.status(401).send({ error: 'Telegram tasdiqlanmadi yoki muddati o\'tgan' })
    }

    const telegramId = String(tgUser.id)
    const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    const telegramUsername = tgUser.username ?? null

    const user = await prisma.user.upsert({
      where:  { telegramId },
      update: { lastActiveAt: new Date(), telegramUsername },
      create: {
        telegramId,
        telegramUsername,
        name,
        avatarUrl: tgUser.photo_url,
        isVerified: true,
      },
      select: {
        id: true, phone: true, name: true, role: true, createdAt: true, updatedAt: true,
        institutionClaims: {
          where:  { status: 'APPROVED' },
          select: { institutionId: true },
          take:   1,
        },
      },
    })

    const isNewUser = !user.phone && !user.name
    if (referralCode && user.createdAt.getTime() === user.updatedAt.getTime()) {
      await attributeReferral(prisma, { referralCode, referredUserId: user.id, ip: request.ip })
    }
    const institutionId = user.institutionClaims[0]?.institutionId
    const { accessToken, refreshToken } = await generateTokens(
      user.id,
      user.role as Parameters<typeof generateTokens>[1],
      institutionId,
    )
    setRefreshCookie(reply, refreshToken)

    return reply.send({
      success: true,
      isNewUser,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      accessToken,
    })
  })

  // ─────────────────────────────────────────────
  // POST /auth/telegram/verify-phone
  // Telefon raqamni Telegram bot orqali TASDIQLASH jarayonini boshlaydi
  // (login usulidan qat'i nazar — Google orqali kirganlar uchun ham ishlaydi).
  // Bir martalik token yaratadi, bot deep-link'ini qaytaradi. Haqiqiy
  // tasdiqlash telegramWebhook.ts'da (bot suhbatida) sodir bo'ladi.
  // ─────────────────────────────────────────────

  fastify.post(
    '/auth/telegram/verify-phone',
    {
      preHandler: [fastify.authenticate],
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET || !env.TELEGRAM_BOT_USERNAME) {
        return reply.status(503).send({ error: 'Telegram orqali tasdiqlash hali sozlanmagan' })
      }
      const { id: userId } = request.user as { id: string }

      const token = randomBytes(16).toString('hex')
      await redis.set(`tg_verify:${token}`, userId, 'EX', 600)

      return reply.send({
        deepLink: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=verify_${token}`,
        expiresIn: 600,
      })
    },
  )

  // ─────────────────────────────────────────────
  // POST /auth/google
  // Google (Gmail) orqali kirish — GIS ID token bilan
  // ─────────────────────────────────────────────

  fastify.post('/auth/google', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (!env.GOOGLE_CLIENT_ID) {
      return reply.status(503).send({ error: 'Google orqali kirish hali sozlanmagan' })
    }

    const { idToken, referralCode } = z.object({
      idToken: z.string().min(20),
      referralCode: z.string().min(4).max(20).optional(),
    }).parse(request.body)

    const googleUser = await verifyGoogleIdToken(idToken)
    if (!googleUser) {
      return reply.status(401).send({ error: 'Google hisobi tasdiqlanmadi' })
    }

    const userSelect = {
      id: true, phone: true, name: true, role: true, email: true,
      institutionClaims: {
        where:  { status: 'APPROVED' },
        select: { institutionId: true },
        take:   1,
      },
    } as const

    // 1) googleId bo'yicha izlash, 2) email bo'yicha mavjud hisobga bog'lash, 3) yangi hisob
    let user = await prisma.user.findUnique({ where: { googleId: googleUser.googleId }, select: userSelect })
    let justCreated = false

    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
    } else {
      const byEmail = await prisma.user.findUnique({ where: { email: googleUser.email }, select: { id: true } })

      if (byEmail) {
        // Email allaqachon ro'yxatda — Google hisobini shu foydalanuvchiga bog'laymiz
        // (mavjud hisob — referral EMAS, texnik topshiriq item #38)
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: googleUser.googleId,
            lastActiveAt: new Date(),
            isVerified: true,
          },
          select: userSelect,
        })
      } else {
        user = await prisma.user.create({
          data: {
            googleId:  googleUser.googleId,
            email:     googleUser.email,
            name:      googleUser.name,
            avatarUrl: googleUser.avatarUrl,
            isVerified: true,
          },
          select: userSelect,
        })
        justCreated = true
      }
    }

    if (referralCode && justCreated) {
      await attributeReferral(prisma, { referralCode, referredUserId: user.id, ip: request.ip })
    }

    const isNewUser = !user.phone
    const institutionId = user.institutionClaims[0]?.institutionId
    const { accessToken, refreshToken } = await generateTokens(
      user.id,
      user.role as Parameters<typeof generateTokens>[1],
      institutionId,
    )
    setRefreshCookie(reply, refreshToken)

    return reply.send({
      success: true,
      isNewUser,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      accessToken,
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
