import { loadTestEnv } from './loadTestEnv'

loadTestEnv()

// Ilova ishlatadigan xuddi shu singleton — .env.test orqali REDIS_URL
// ajratilgan test DB indeksiga (masalan /1) ko'rsatilgan bo'lishi kerak.
// `loadTestEnv()` yuqorida chaqirilgani uchun bu import paytida
// `utils/env.ts` allaqachon to'g'ri REDIS_URL'ni ko'radi.
import { redis as testRedis } from '../utils/redis'

export { testRedis }

/** Faqat testlar uchun ajratilgan Redis DB indeksini tozalaydi */
export async function flushTestRedis(): Promise<void> {
  const url = new URL(process.env.REDIS_URL ?? '')
  const dbIndex = url.pathname.replace('/', '')
  if (dbIndex === '' || dbIndex === '0') {
    throw new Error(
      'Xavfsizlik: test REDIS_URL DB indeksi 0 (standart) — bu asosiy/dev ma\'lumotlarni ' +
      'FLUSHDB qilib yuborishi mumkin. .env.test da /1 kabi alohida indeks ko\'rsating.',
    )
  }
  await testRedis.flushdb()
}
