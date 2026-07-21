import './utils/env' // Env validatsiya — eng birinchi
import Fastify, { type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

import { env } from './utils/env'
import prismaPlugin from './plugins/prisma'
import redisPlugin from './plugins/redis'
import authMiddleware from './middleware/auth'
import rbacMiddleware from './middleware/rbac'

// Routes
import authRoutes from './routes/auth'
import institutionRoutes from './routes/institutions'
import reviewRoutes from './routes/reviews'
import searchRoutes from './routes/search'
import matchRoutes from './routes/match'
import geoRoutes from './routes/geo'
import adminReviewRoutes from './routes/admin/reviews'
import adminInstitutionRoutes from './routes/admin/institutions'
import adminClaimRoutes from './routes/admin/claims'
import adminTrialBookingRoutes from './routes/admin/trial-bookings'
import superAdminRoutes from './routes/super-admin/index'
import superAdminAnalytics from './routes/super-admin/analytics'
import trackRoutes from './routes/track'
import compareRoutes from './routes/compare'
import dashboardRoutes from './routes/dashboard'
import dashboardReviewRoutes from './routes/dashboard/reviews'

async function buildApp() {
  const fastify = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } }
        : { level: 'warn' },
    // Railway/Vercel kabi reverse-proxy ortida ishlaganda haqiqiy client IP
    // X-Forwarded-For headeridan olinadi — busiz rate-limit hamma
    // foydalanuvchini bitta (proxy) IP sifatida ko'radi
    trustProxy: true,
  })

  // ─── CORS ────────────────────────────────────
  await fastify.register(cors, {
    origin: env.ALLOWED_ORIGINS.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })

  // ─── Rate Limiting ───────────────────────────
  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
      error: 'Juda ko\'p so\'rov. Iltimos, biroz kuting.',
      code: 'RATE_LIMIT_EXCEEDED',
    }),
  })

  // ─── JWT ─────────────────────────────────────
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })

  // ─── Multipart (file upload) ─────────────────
  await fastify.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  })

  // ─── DB & Cache plugins ───────────────────────
  await fastify.register(prismaPlugin)
  await fastify.register(redisPlugin)

  // ─── Auth decorators ──────────────────────────
  await fastify.register(authMiddleware)
  await fastify.register(rbacMiddleware)

  // ─── Xavfsizlik headerlari ───────────────────
  fastify.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Cross-Origin-Opener-Policy', 'same-origin')
    if (env.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
  })

  // ─── Health check ────────────────────────────
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.1.0',
    env: env.NODE_ENV,
  }))

  // ─── API v1 ───────────────────────────────────
  await fastify.register(
    async (api) => {
      // Public + Auth routes
      await api.register(authRoutes)
      await api.register(institutionRoutes)
      await api.register(reviewRoutes)
      await api.register(searchRoutes)
      await api.register(matchRoutes)
      await api.register(geoRoutes)
      await api.register(compareRoutes)

      // Admin routes
      await api.register(adminReviewRoutes)
      await api.register(adminInstitutionRoutes)
      await api.register(adminClaimRoutes)
      await api.register(adminTrialBookingRoutes)

      // Super Admin routes
      await api.register(superAdminRoutes)
      await api.register(superAdminAnalytics)

      // Analytics / Lead tracking (auth shart emas)
      await api.register(trackRoutes)

      // B2B Dashboard routes
      await api.register(dashboardRoutes)
      await api.register(dashboardReviewRoutes)
    },
    { prefix: '/api/v1' },
  )

  // ─── Global xato handler ─────────────────────
  fastify.setErrorHandler((err: FastifyError, _request, reply) => {
    fastify.log.error(err)

    if (err.name === 'ZodError') {
      return reply.status(400).send({
        error: "Kiritilgan ma'lumotlar noto'g'ri",
        code: 'VALIDATION_ERROR',
        details: err.message,
      })
    }

    if (
      err.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
      err.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED'
    ) {
      return reply.status(401).send({ error: 'Tizimga kirishingiz kerak' })
    }

    return reply.status(err.statusCode ?? 500).send({
      error: env.NODE_ENV === 'development' ? err.message : 'Server xatosi yuz berdi',
    })
  })

  // ─── 404 handler ──────────────────────────────
  fastify.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: 'So\'ralgan manzil topilmadi' })
  })

  return fastify
}

// ─── Start ────────────────────────────────────
buildApp()
  .then(async (app) => {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`\n🚀  API: http://localhost:${env.PORT}`)
    console.log(`📋  Health: http://localhost:${env.PORT}/health`)
    console.log(`🔑  Auth: http://localhost:${env.PORT}/api/v1/auth/send-otp`)
  })
  .catch((err) => {
    console.error('❌ Server ishga tushmadi:', err)
    process.exit(1)
  })

export { buildApp }
