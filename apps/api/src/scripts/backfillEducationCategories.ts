/**
 * Bir martalik backfill: mavjud InstitutionDetail yozuvlariga
 * Ta'lim profili (categories) maydonini avtomatik to'ldiradi.
 *
 * Sabab: seed.ts endi yangi muassasa yaratganda categories'ni avtomatik
 * hisoblaydi, lekin allaqachon DB'da mavjud yozuvlarga ta'sir qilmaydi
 * (upsert'ning `update` shoxobchasi details'ga tegmaydi). Shu skript
 * bir martalik ishga tushiriladi: `npx tsx --env-file=.env src/scripts/backfillEducationCategories.ts`
 */
import { PrismaClient } from '@prisma/client'
import { inferCategories } from '../utils/educationCategories'

const prisma = new PrismaClient()

async function main() {
  const details = await prisma.institutionDetail.findMany({
    select: {
      id: true, programs: true, specializations: true, descriptionUz: true, categories: true,
      institution: { select: { type: true, nameUz: true } },
    },
  })

  let updated = 0
  for (const d of details) {
    if (d.categories.length > 0) continue // admin allaqachon qo'lda belgilagan bo'lishi mumkin
    const categories = inferCategories({
      type: d.institution.type,
      programs: d.programs,
      specializations: d.specializations,
      descriptionUz: d.descriptionUz,
    })
    if (categories.length === 0) continue
    await prisma.institutionDetail.update({ where: { id: d.id }, data: { categories } })
    console.log(`  ✓ ${d.institution.nameUz}: ${categories.join(', ')}`)
    updated++
  }

  console.log(`\n✅ ${updated}/${details.length} muassasa uchun Ta'lim profili to'ldirildi`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
