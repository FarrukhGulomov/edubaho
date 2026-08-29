import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { loadTestEnv } from './loadTestEnv'

/**
 * Vitest `globalSetup` — butun test yugurishida BIR MARTA ishlaydi.
 *
 * 1) Test DB (masalan `edureyting_test`) mavjudligini tekshiradi, yo'q
 *    bo'lsa yaratadi (maintenance `postgres` bazasiga ulanib).
 * 2) `prisma migrate deploy` orqali sxemani joriy holatga keltiradi.
 *
 * XAVFSIZLIK: bu fayl HECH QACHON production DATABASE_URL bilan
 * ishlamaydi — faqat `.env.test`dan o'qiladi, va DB nomi ustida hech
 * qanday tekshiruv qilinmasdan CREATE DATABASE chaqirilmasligi uchun
 * pastda aniq tekshiruv bor.
 */
export default async function globalSetup(): Promise<void> {
  loadTestEnv()

  const testUrl = process.env.DATABASE_URL
  if (!testUrl) throw new Error('DATABASE_URL (.env.test) topilmadi — testlar uchun ajratilgan DB kerak')

  const url = new URL(testUrl)
  const dbName = url.pathname.replace(/^\//, '')

  if (!dbName.includes('test')) {
    throw new Error(
      `Xavfsizlik: test DATABASE_URL nomi "${dbName}" — "test" so'zini o'z ichiga olmaydi. ` +
      'Ishonchsiz DB ustida testlar yugurmasligi uchun to\'xtatildi.',
    )
  }

  const maintenanceUrl = new URL(testUrl)
  maintenanceUrl.pathname = '/postgres'

  const admin = new PrismaClient({ datasources: { db: { url: maintenanceUrl.toString() } } })
  try {
    const rows = await admin.$queryRawUnsafe<{ exists: boolean }[]>(
      'SELECT EXISTS (SELECT FROM pg_database WHERE datname = $1) AS exists',
      dbName,
    )
    if (!rows[0]?.exists) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`)
    }
  } finally {
    await admin.$disconnect()
  }

  // MUHIM: Prisma CLI har doim schema/CWD yonidagi `.env` faylini
  // process.env'dan USTUN qo'yadi (tekshirilgan, hujjatlashtirilmagan
  // xatti-harakat) — shuning uchun oddiy `env:{DATABASE_URL: testUrl}`
  // orqali `apps/api/.env` (haqiqiy dev DB!) ustidan yozib bo'lmaydi.
  // Yechim: vaqtinchalik, faqat test URL'lari bor `.env` bilan ALOHIDA
  // CWD'da ishga tushiramiz — shunda Prisma o'sha yerdagi `.env`ni
  // topadi va `apps/api/.env` bilan hech qanday aloqasi bo'lmaydi.
  const tmpCwd = mkdtempSync(path.join(tmpdir(), 'bilimon-prisma-test-'))
  try {
    writeFileSync(
      path.join(tmpCwd, '.env'),
      `DATABASE_URL=${testUrl}\nDIRECT_URL=${process.env.DIRECT_URL ?? testUrl}\n`,
    )
    const schemaPath = path.join(__dirname, '../../prisma/schema.prisma')
    execSync(`npx --prefix "${path.join(__dirname, '../..')}" prisma migrate deploy --schema="${schemaPath}"`, {
      cwd: tmpCwd,
      env: { ...process.env, DATABASE_URL: testUrl },
      stdio: 'inherit',
    })
  } finally {
    rmSync(tmpCwd, { recursive: true, force: true })
  }
}
