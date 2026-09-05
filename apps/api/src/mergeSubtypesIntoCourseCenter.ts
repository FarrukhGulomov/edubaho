/**
 * mergeSubtypesIntoCourseCenter.ts — bir martalik skript: DB'da
 * type=TUTORING yoki type=LANGUAGE_CENTER bo'lgan muassasalarni
 * type=COURSE_CENTER'ga o'tkazadi (Til markazi va Repetitor aslida
 * O'quv markaz guruhiga kiradi). Asl turi yo'qolmaydi — additionalTypes
 * massiviga (agar hali yo'q bo'lsa) qo'shiladi, shu bilan "Qo'shimcha
 * turlar" sifatida saqlanib qoladi.
 *
 * Ishlatish (bir marta, production yoki dev muhitida):
 *   npx tsx src/mergeSubtypesIntoCourseCenter.ts
 *   # yoki: npm run merge:subtypes (dev) / npm run merge:subtypes:prod (build'dan keyin)
 *
 * BU SKRIPT XAVFSIZ QAYTA ISHGA TUSHIRILADI (idempotent) — type allaqachon
 * COURSE_CENTER bo'lgan yozuvlarga tegilmaydi, faqat hozircha TUTORING/
 * LANGUAGE_CENTER bo'lganlar o'zgaradi.
 */
import { PrismaClient, InstitutionType } from '@prisma/client'
import { indexInstitution } from './services/searchService'

const prisma = new PrismaClient()

async function main() {
  const targets = await prisma.institution.findMany({
    where: { type: { in: [InstitutionType.TUTORING, InstitutionType.LANGUAGE_CENTER] } },
    include: {
      city:    { select: { nameUz: true } },
      details: { select: { descriptionUz: true, descriptionRu: true, programs: true, specializations: true } },
      pricing: { select: { monthlyMin: true } },
    },
  })

  console.log(`📋 TUTORING/LANGUAGE_CENTER turidagi muassasalar topildi: ${targets.length}`)

  let merged = 0
  let indexErrors = 0
  const byOldType: Record<string, number> = {}

  for (const inst of targets) {
    const oldType = inst.type
    const newAdditionalTypes = inst.additionalTypes.includes(oldType)
      ? inst.additionalTypes
      : [...inst.additionalTypes, oldType]

    const updated = await prisma.institution.update({
      where: { id: inst.id },
      data: {
        type: InstitutionType.COURSE_CENTER,
        additionalTypes: newAdditionalTypes,
      },
    })

    try {
      await indexInstitution({ ...inst, status: updated.status, type: updated.type })
    } catch (err) {
      indexErrors++
      console.warn(`  ⚠ ${inst.nameUz}: Meilisearch indekslashda xato -`, err instanceof Error ? err.message : err)
    }

    byOldType[oldType] = (byOldType[oldType] ?? 0) + 1
    merged++
    console.log(`  ✓ ${inst.nameUz} (${oldType} → COURSE_CENTER, additionalTypes: [${newAdditionalTypes.join(', ')}])`)
  }

  console.log('\n📊 Yakun:')
  console.log(`   ✓ COURSE_CENTER'ga ko'chirildi: ${merged}`)
  Object.entries(byOldType).forEach(([type, count]) => console.log(`      - avvalgi ${type}: ${count}`))
  console.log(`   ⚠ Meilisearch indekslash xatosi (ma'lumot baribir yangilandi): ${indexErrors}`)
}

main()
  .catch((err) => {
    console.error('❌ Skript muvaffaqiyatsiz:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
