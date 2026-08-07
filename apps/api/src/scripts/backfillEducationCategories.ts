/**
 * Backfill/top-up: InstitutionDetail yozuvlariga Ta'lim profili
 * (categories) maydonini avtomatik to'ldiradi/to'ldirib boradi.
 *
 * Sabab: seed.ts endi yangi muassasa yaratganda categories'ni avtomatik
 * hisoblaydi, lekin allaqachon DB'da mavjud yozuvlarga ta'sir qilmaydi
 * (upsert'ning `update` shoxobchasi details'ga tegmaydi). Shu skript
 * ishga tushiriladi: `npx tsx --env-file=.env src/scripts/backfillEducationCategories.ts`
 *
 * XAVFSIZ QAYTA ISHGA TUSHIRISH: mavjud (admin qo'lda belgilagan yoki
 * oldingi ishga tushirishda topilgan) toifalar HECH QACHON o'chirilmaydi —
 * yangi aniqlanganlar faqat QO'SHILADI (union). Shuning uchun
 * inferCategories() mantig'i yaxshilanganda (masalan yangi kalit so'z
 * qo'shilsa) bu skriptni xavfsiz qayta ishga tushirish mumkin.
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
    const inferred = inferCategories({
      type: d.institution.type,
      programs: d.programs,
      specializations: d.specializations,
      descriptionUz: d.descriptionUz,
    })
    const merged = [...new Set([...d.categories, ...inferred])]
    const added = merged.filter((c) => !d.categories.includes(c))
    if (added.length === 0) continue
    await prisma.institutionDetail.update({ where: { id: d.id }, data: { categories: merged } })
    console.log(`  ✓ ${d.institution.nameUz}: +${added.join(', ')}`)
    updated++
  }

  console.log(`\n✅ ${updated}/${details.length} muassasa uchun Ta'lim profili yangilandi`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
