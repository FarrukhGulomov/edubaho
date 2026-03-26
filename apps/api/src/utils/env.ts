import { z } from 'zod'

/**
 * Muhit o'zgaruvchilarini Zod orqali validatsiya qilish.
 * Server ishga tushganda noto'g'ri config erta aniqlanadi.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET kamida 32 ta belgi bo\'lishi kerak'),
  REFRESH_SECRET: z.string().min(32, 'REFRESH_SECRET kamida 32 ta belgi bo\'lishi kerak'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_IN: z.string().default('30d'),

  SMS_LOGIN: z.string(),
  SMS_PASSWORD: z.string(),
  SMS_FROM: z.string().default('EduReyting'),
  SMS_BASE_URL: z.string().url(),

  MEILISEARCH_URL: z.string().url(),
  MEILISEARCH_KEY: z.string(),

  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY: z.string(),
  R2_SECRET_KEY: z.string(),
  R2_BUCKET: z.string(),
  R2_PUBLIC_URL: z.string().url(),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Admin kirish uchun maxfiy PIN (telefon OTP dan keyin)
  ADMIN_PIN: z.string().min(4, 'ADMIN_PIN kamida 4 ta belgi'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Noto\'g\'ri muhit o\'zgaruvchilari:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
