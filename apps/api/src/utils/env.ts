import { z } from 'zod'

/**
 * Muhit o'zgaruvchilarini Zod orqali validatsiya qilish.
 *
 * Majburiy (server ishlamaydi):  DATABASE_URL, REDIS_URL, JWT_SECRET, REFRESH_SECRET
 * Ixtiyoriy (xususiyat o'chadi): SMS_*, R2_*, MEILISEARCH_*
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // ── Majburiy ─────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'DATABASE_URL talab qilinadi'),
  REDIS_URL: z.string().min(1, 'REDIS_URL talab qilinadi'),

  JWT_SECRET: z.string().min(32, "JWT_SECRET kamida 32 ta belgi bo'lishi kerak"),
  REFRESH_SECRET: z.string().min(32, "REFRESH_SECRET kamida 32 ta belgi bo'lishi kerak"),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_IN: z.string().default('30d'),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  ADMIN_PIN: z.string().min(4, "ADMIN_PIN kamida 4 ta belgi").default('1234'),

  // ── SMS (Playmobile) — ixtiyoriy, yo'q bo'lsa OTP faqat logga chiqadi ────
  SMS_LOGIN: z.string().default(''),
  SMS_PASSWORD: z.string().default(''),
  SMS_FROM: z.string().default('EduReyting'),
  SMS_BASE_URL: z.string().default('http://91.204.239.44/broker-api/send'),

  // ── Telegram Login Widget — ixtiyoriy, yo'q bo'lsa Telegram kirish o'chiq ─
  TELEGRAM_BOT_TOKEN: z.string().default(''),

  // ── Google OAuth (Gmail orqali kirish) — ixtiyoriy ──────────────────────
  GOOGLE_CLIENT_ID: z.string().default(''),

  // ── Meilisearch — ixtiyoriy, yo'q bo'lsa search DB fallback ishlatadi ────
  MEILISEARCH_URL: z.string().default('http://localhost:7700'),
  MEILISEARCH_KEY: z.string().default(''),

  // ── Cloudflare R2 — ixtiyoriy, yo'q bo'lsa fayl yuklash ishlamaydi ───────
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY: z.string().default(''),
  R2_SECRET_KEY: z.string().default(''),
  R2_BUCKET: z.string().default('edureyting-media'),
  R2_PUBLIC_URL: z.string().default('https://media.edureyting.uz'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Noto'g'ri muhit o'zgaruvchilari:")
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

// Production'da zaif/standart qiymatlar bilan ishga tushishga yo'l qo'ymaslik
if (parsed.data.NODE_ENV === 'production') {
  const problems: string[] = []

  if (parsed.data.ADMIN_PIN === '1234' || parsed.data.ADMIN_PIN === '147258') {
    problems.push("ADMIN_PIN standart qiymatda — production uchun kuchli PIN o'rnating")
  }
  if (parsed.data.ADMIN_PIN.length < 6) {
    problems.push("ADMIN_PIN production'da kamida 6 ta belgi bo'lishi kerak")
  }
  if (parsed.data.JWT_SECRET === parsed.data.REFRESH_SECRET) {
    problems.push("JWT_SECRET va REFRESH_SECRET bir xil bo'lmasligi kerak")
  }
  if (process.env.ALLOW_DEV_OTP === 'true') {
    problems.push("ALLOW_DEV_OTP production'da yoqib bo'lmaydi — OTP oshkor bo'ladi")
  }

  if (problems.length > 0) {
    console.error("❌ Production xavfsizlik talablari bajarilmadi:")
    problems.forEach((p) => console.error(`   • ${p}`))
    process.exit(1)
  }
}

export const env = parsed.data
export type Env = typeof env
