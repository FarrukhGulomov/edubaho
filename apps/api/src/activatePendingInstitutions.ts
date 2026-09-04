/**
 * activatePendingInstitutions.ts — bir martalik skript: DB'da status=PENDING
 * bo'lgan BARCHA muassasalarni status=ACTIVE ga o'zgartiradi va Meilisearch
 * indeksiga qo'shadi (shu bilan ular saytda qidiruv/ro'yxatda ko'rina boshlaydi).
 *
 * Ishlatish (bir marta, production yoki dev muhitida):
 *   npx tsx src/activatePendingInstitutions.ts
 *   # yoki: npm run activate:pending (dev) / npm run activate:pending:prod (build'dan keyin)
 *
 * BU SKRIPT XAVFSIZ QAYTA ISHGA TUSHIRILADI (idempotent) — status=ACTIVE
 * bo'lib qolgan yozuvlarga qayta tegilmaydi, faqat hozircha PENDING
 * bo'lganlar o'zgaradi.
 */
import { PrismaClient, InstitutionStatus } from '@prisma/client'
import { indexInstitution } from './services/searchService'

const prisma = new PrismaClient()

async function main() {
  const pending = await prisma.institution.findMany({
    where: { status: InstitutionStatus.PENDING },
    include: {
      city:    { select: { nameUz: true } },
      details: { select: { descriptionUz: true, descriptionRu: true, programs: true, specializations: true } },
      pricing: { select: { monthlyMin: true } },
    },
  })

  console.log(`📋 PENDING statusdagi muassasalar topildi: ${pending.length}`)

  let activated = 0
  let indexErrors = 0

  for (const inst of pending) {
    const updated = await prisma.institution.update({
      where: { id: inst.id },
      data: { status: InstitutionStatus.ACTIVE },
    })

    try {
      await indexInstitution({ ...inst, status: updated.status })
    } catch (err) {
      indexErrors++
      console.warn(`  ⚠ ${inst.nameUz}: Meilisearch indekslashda xato -`, err instanceof Error ? err.message : err)
    }

    activated++
    console.log(`  ✓ ${inst.nameUz}`)
  }

  console.log('\n📊 Yakun:')
  console.log(`   ✓ ACTIVE qilindi: ${activated}`)
  console.log(`   ⚠ Meilisearch indekslash xatosi (status baribir ACTIVE): ${indexErrors}`)
}

main()
  .catch((err) => {
    console.error('❌ Skript muvaffaqiyatsiz:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
