/**
 * importJsonInstitutions.ts — bir martalik import: "Golden Pages" turidagi
 * manbadan yig'ilgan 500 ta yozuvdan tozalangan 263 tasini (haqiqiy ta'lim
 * muassasalari) DB'ga qo'shadi.
 *
 * Ishlatish (bir marta, production yoki dev muhitida):
 *   npx tsx src/importJsonInstitutions.ts
 *   # yoki: npm run import:institutions (agar package.json'da qo'shilgan bo'lsa)
 *
 * Manba fayl `prisma/import-data/bilimon-uzbekistan-263.json` — asl 500 ta
 * yozuvdan quyidagilar OLIB TASHLANGAN (tozalash allaqachon bajarilgan):
 *   - 217 ta: haqiqiy muassasa emas, katalog sahifasining o'zi (masalan
 *     "Why Search for Companies... on Golden Pages?", "Frequently Asked
 *     Questions") — barchasi umumiy "781400909" bezak raqami yoki
 *     "<Viloyat> region" kabi umumiy (haqiqiy manzil bo'lmagan) yozuvlar bilan
 *     aniqlangan.
 *   - 20 ta: fayl ICHIDA bir xil nom/telefon/sayt bilan takrorlangan yozuvlar
 *     (masalan "Registon o'quv markazi" 3 marta uchragan).
 *   - 4 ta zaif signal edi (na telefon, na sayt, na manzil).
 *
 * BU SKRIPT XAVFSIZ QAYTA ISHGA TUSHIRILADI (idempotent):
 *   - Har bir yozuv uchun DB'dagi joriy holatga qarab (nameKey/telefon/sayt)
 *     TAKRORIY EKANLIGI tekshiriladi — allaqachon mavjud muassasa QAYTA
 *     YARATILMAYDI va USTIGA YOZILMAYDI (mavjud, qo'lda tahrirlangan
 *     ma'lumot buzilmaydi).
 *   - Barcha yozuvlar status=PENDING bilan yaratiladi (JSON manbadagidek) —
 *     ya'ni ular admin panelda ko'rib chiqilib "Faol" qilinmaguncha
 *     saytda (qidiruv/ro'yxatda) KO'RINMAYDI — GET /institutions faqat
 *     ACTIVE/PREMIUM statusni qaytaradi.
 *   - `branches` massivi ATAYLAB import qilinmaydi — manba faylda bitta
 *     manzilning bir necha marta turlicha formatda ("filial" sifatida)
 *     takrorlanish holatlari aniqlangan, ishonchli ajratib bo'lmadi.
 */
import { PrismaClient, InstitutionType, DeliveryMode } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { normalizeInstitutionName } from './utils/normalizeName'
import { generateSlug } from './utils/slug'

const prisma = new PrismaClient()

interface ImportRow {
  nameUz: string
  nameRu?: string | null
  type: string
  additionalTypes?: string[]
  status?: string
  isVerified?: boolean
  trialLessonEnabled?: boolean
  deliveryMode?: string
  phone?: string | null
  phone2?: string | null
  email?: string | null
  website?: string | null
  telegram?: string | null
  instagram?: string | null
  regionSlug?: string | null
  citySlug?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  descriptionUz?: string | null
  descriptionRu?: string | null
  foundedYear?: number | null
  studentCount?: number | null
  teacherCount?: number | null
  languages?: string[]
  programs?: string[]
  specializations?: string[]
  shifts?: string[]
  achievements?: string | null
  categories?: string[]
  monthlyMin?: number | null
  monthlyMax?: number | null
  paymentMethods?: string[]
}

// Manba fayldagi ba'zi citySlug/regionSlug qiymatlari DB'dagi haqiqiy
// slug'lardan farq qiladi (masalan lotin transliteratsiyasi farqi) —
// bu yerda mos qo'yiladi.
const CITY_SLUG_ALIASES: Record<string, string> = {
  fargona: 'farghona',
}
const REGION_SLUG_ALIASES: Record<string, string> = {
  qashqadaryo: 'qashqadaryo-viloyati',
}

async function resolveGeo(
  cityBySlug: Map<string, { id: string; regionId: string; nameUz: string }>,
  regionBySlug: Map<string, { id: string }>,
  row: ImportRow,
): Promise<{ cityId?: string; regionId?: string; resolvedVia: string }> {
  const rawCity = row.citySlug?.trim()
  const rawRegion = row.regionSlug?.trim()

  // 1) to'g'ridan-to'g'ri citySlug
  if (rawCity && cityBySlug.has(rawCity)) {
    const c = cityBySlug.get(rawCity)!
    return { cityId: c.id, regionId: c.regionId, resolvedVia: 'citySlug' }
  }
  // 2) alias orqali citySlug
  const aliasedCity = rawCity ? CITY_SLUG_ALIASES[rawCity] : undefined
  if (aliasedCity && cityBySlug.has(aliasedCity)) {
    const c = cityBySlug.get(aliasedCity)!
    return { cityId: c.id, regionId: c.regionId, resolvedVia: 'citySlug-alias' }
  }
  // 3) manzil matnidan shahar nomini qidirish (masalan citySlug="ozbekiston"
  //    kabi umumiy/noto'g'ri qiymat bo'lganda)
  const addr = (row.address ?? '').toLowerCase()
  if (addr) {
    for (const [, city] of cityBySlug) {
      if (addr.includes(city.nameUz.toLowerCase())) {
        return { cityId: city.id, regionId: city.regionId, resolvedVia: 'address-text' }
      }
    }
  }
  // 4) faqat regionSlug (shahar aniqlanmasa ham viloyat darajasida bog'lash)
  const regionKey = rawRegion && REGION_SLUG_ALIASES[rawRegion] ? REGION_SLUG_ALIASES[rawRegion] : rawRegion
  if (regionKey && regionBySlug.has(regionKey)) {
    return { regionId: regionBySlug.get(regionKey)!.id, resolvedVia: 'regionSlug' }
  }
  return { resolvedVia: 'unresolved' }
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let n = 2
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.institution.findUnique({ where: { slug }, select: { id: true } })
    if (!existing) return slug
    slug = `${base}-${n}`
    n++
  }
}

async function main() {
  const dataPath = join(__dirname, '../prisma/import-data/bilimon-uzbekistan-263.json')
  const rows: ImportRow[] = JSON.parse(readFileSync(dataPath, 'utf-8'))
  console.log(`📦 ${rows.length} ta tozalangan yozuv topildi: ${dataPath}\n`)

  const cities = await prisma.city.findMany({ select: { id: true, slug: true, regionId: true, nameUz: true } })
  const regions = await prisma.region.findMany({ select: { id: true, slug: true } })
  const cityBySlug = new Map(cities.map((c) => [c.slug, c]))
  const regionBySlug = new Map(regions.map((r) => [r.slug, r]))

  let created = 0
  let skippedDuplicate = 0
  let skippedError = 0
  const unresolvedGeo: string[] = []
  const duplicates: string[] = []
  const errors: { name: string; error: string }[] = []

  for (const row of rows) {
    try {
      const nameKey = normalizeInstitutionName(row.nameUz)

      // Takroriylik tekshiruvi — DB'ning JORIY holatiga qarab (nameKey +
      // telefon + sayt), admin panel bilan bir xil qoidada
      // (checkNameKeyConflict, apps/api/src/routes/admin/institutions.ts)
      const nameConflict = await prisma.institution.findFirst({ where: { nameKey }, select: { id: true, nameUz: true } })
      if (nameConflict) {
        duplicates.push(`${row.nameUz} (nomi allaqachon mavjud: "${nameConflict.nameUz}")`)
        skippedDuplicate++
        continue
      }
      if (row.phone) {
        const phoneConflict = await prisma.institution.findFirst({ where: { phone: row.phone }, select: { id: true, nameUz: true } })
        if (phoneConflict) {
          duplicates.push(`${row.nameUz} (telefoni allaqachon mavjud: "${phoneConflict.nameUz}")`)
          skippedDuplicate++
          continue
        }
      }
      if (row.website) {
        const siteConflict = await prisma.institution.findFirst({ where: { website: row.website }, select: { id: true, nameUz: true } })
        if (siteConflict) {
          duplicates.push(`${row.nameUz} (sayti allaqachon mavjud: "${siteConflict.nameUz}")`)
          skippedDuplicate++
          continue
        }
      }

      const geo = await resolveGeo(cityBySlug, regionBySlug, row)
      if (geo.resolvedVia === 'unresolved') {
        unresolvedGeo.push(row.nameUz)
      }

      const slug = await uniqueSlug(generateSlug(row.nameUz))

      const hasDetails = Boolean(
        row.descriptionUz || row.descriptionRu || row.foundedYear || row.studentCount || row.teacherCount ||
        row.languages?.length || row.programs?.length || row.specializations?.length ||
        row.shifts?.length || row.achievements || row.categories?.length,
      )

      await prisma.institution.create({
        data: {
          nameUz: row.nameUz,
          nameRu: row.nameRu || undefined,
          nameKey,
          slug,
          type: row.type as InstitutionType,
          additionalTypes: (row.additionalTypes ?? []) as InstitutionType[],
          status: 'PENDING',
          isVerified: false,
          trialLessonEnabled: row.trialLessonEnabled ?? false,
          deliveryMode: (row.deliveryMode ?? 'OFFLINE') as DeliveryMode,
          phone: row.phone || undefined,
          phone2: row.phone2 || undefined,
          email: row.email || undefined,
          website: row.website || undefined,
          telegram: row.telegram || undefined,
          instagram: row.instagram || undefined,
          address: row.address || undefined,
          lat: row.lat ?? undefined,
          lng: row.lng ?? undefined,
          cityId: geo.cityId,
          regionId: geo.regionId,
          ...(hasDetails ? {
            details: {
              create: {
                descriptionUz: row.descriptionUz || undefined,
                descriptionRu: row.descriptionRu || undefined,
                foundedYear: row.foundedYear ?? undefined,
                studentCount: row.studentCount ?? undefined,
                teacherCount: row.teacherCount ?? undefined,
                languages: row.languages ?? [],
                programs: row.programs ?? [],
                specializations: row.specializations ?? [],
                shifts: row.shifts ?? [],
                achievements: row.achievements || undefined,
                categories: row.categories ?? [],
              },
            },
          } : {}),
          ...(row.monthlyMin ? {
            pricing: {
              create: {
                monthlyMin: row.monthlyMin,
                monthlyMax: row.monthlyMax ?? row.monthlyMin,
                paymentMethods: row.paymentMethods?.length ? row.paymentMethods : ['Payme', 'Click', 'Naqd'],
              },
            },
          } : {}),
          subscription: { create: { plan: 'FREE', isActive: false } },
        },
      })

      created++
      console.log(`  ✓ ${row.nameUz}${geo.resolvedVia === 'unresolved' ? '  ⚠ shahar aniqlanmadi' : ''}`)
    } catch (err) {
      skippedError++
      const message = err instanceof Error ? err.message : String(err)
      errors.push({ name: row.nameUz, error: message })
      console.warn(`  ✗ ${row.nameUz}: ${message}`)
    }
  }

  console.log('\n📊 Yakun:')
  console.log(`   ✓ Yaratildi (status=PENDING, admin tasdiqlashi kerak): ${created}`)
  console.log(`   ⚠ Takroriy deb o'tkazib yuborildi: ${skippedDuplicate}`)
  console.log(`   ✗ Xato: ${skippedError}`)
  console.log(`   🌍 Shahar/viloyat aniqlanmagan (qo'lda to'ldirish kerak): ${unresolvedGeo.length}`)

  if (duplicates.length) {
    console.log('\n--- Takroriy deb o\'tkazib yuborilganlar ---')
    duplicates.forEach((d) => console.log('  -', d))
  }
  if (unresolvedGeo.length) {
    console.log('\n--- Shahar aniqlanmagan (admin panelda qo\'lda to\'ldiring) ---')
    unresolvedGeo.forEach((n) => console.log('  -', n))
  }
  if (errors.length) {
    console.log('\n--- Xatolar ---')
    errors.forEach((e) => console.log('  -', e.name, ':', e.error))
  }
}

main()
  .catch((err) => {
    console.error('❌ Import muvaffaqiyatsiz:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
