import { PrismaClient } from '@prisma/client'
import { loadTestEnv } from './loadTestEnv'

loadTestEnv()

/** Faqat testlar uchun — `.env.test`dagi ajratilgan DB'ga ulanadi */
export const testPrisma = new PrismaClient()

/**
 * Barcha jadvallarni bo'shatadi (migratsiyalar jadvalidan tashqari).
 * Jadval ro'yxati Prisma sxemasidan emas, DB'ning o'zidan olinadi —
 * shuning uchun sxema o'zgarganda bu funksiyani yangilash shart emas.
 */
export async function resetDb(): Promise<void> {
  const tables = await testPrisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `
  if (tables.length === 0) return
  const names = tables.map((t) => `"public"."${t.tablename}"`).join(', ')
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`)
}
