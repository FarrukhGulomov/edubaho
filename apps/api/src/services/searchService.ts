import { MeiliSearch } from 'meilisearch'
import { env } from '../utils/env'
import { transliterateCyrillic, hasCyrillic } from '../utils/transliterate'
import { getMeilisearchSynonyms, expandSearchTerms } from '../utils/subjectSynonyms'

export const meili = new MeiliSearch({
  host: env.MEILISEARCH_URL,
  apiKey: env.MEILISEARCH_KEY,
})

const INDEX = 'institutions'

// ─────────────────────────────────────────────────────────────────────────────
// INDEX SOZLAMALARI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Meilisearch index sozlamalari.
 * Birinchi marta ishga tushirishda yoki index qayta tuzilganda chaqiriladi.
 */
export async function setupSearchIndex(): Promise<void> {
  // Index mavjud emasligini tekshirib, kerak bo'lsa yaratamiz (primaryKey majburiy)
  try {
    await meili.getIndex(INDEX)
  } catch {
    await meili.createIndex(INDEX, { primaryKey: 'id' })
  }

  await meili.index(INDEX).updateSettings({
    searchableAttributes: [
      'nameUz',          // O'zbek lotin nomi
      'nameRu',          // Rus kirill nomi
      'searchText',      // Barcha matnni birlashtirgan maydon (dasturlar, ta'rif, manzil...)
      'descriptionUz',   // O'zbek lotin ta'rifi
      'descriptionRu',   // Rus kirill ta'rifi
      'address',         // Manzil
      'cityName',        // Shahar nomi
    ],
    filterableAttributes: ['type', 'cityId', 'regionId', 'status', 'avgRating', 'monthlyMin', 'isVerified'],
    sortableAttributes: ['avgRating', 'viewCount', 'reviewCount', 'createdAt', 'monthlyMin'],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 3, twoTypos: 6 },
    },
    pagination: { maxTotalHits: 1000 },
    // Predmet sinonimlari: "химия"↔"kimyo"↔"chemistry" barchasini topadi
    synonyms: getMeilisearchSynonyms(),
  })
  console.log('✅ Meilisearch index sozlandi (sinonimlar bilan)')
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEXLASH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Muassasani Meilisearch'ga qo'shish/yangilash.
 * Institution approved yoki yangilanganda chaqiriladi.
 */
export async function indexInstitution(institution: {
  id: string
  nameUz: string
  nameRu?: string | null
  type: string
  status: string
  cityId?: string | null
  regionId?: string | null
  address?: string | null
  avgRating?: number | null
  reviewCount: number
  viewCount: number
  isVerified: boolean
  createdAt: Date
  city?: { nameUz: string } | null
  details?: {
    descriptionUz?: string | null
    descriptionRu?: string | null
    programs?: string[] | null
    specializations?: string[] | null
  } | null
  pricing?: { monthlyMin?: number | null } | null
}): Promise<void> {
  const programs        = institution.details?.programs?.join(' ') ?? ''
  const specializations = institution.details?.specializations?.join(' ') ?? ''
  const descUz          = institution.details?.descriptionUz ?? ''
  const descRu          = institution.details?.descriptionRu ?? ''

  // Barcha qidiriladigan matnni birlashtiramiz + Kirill matnini lotinga transliteratsiya qilib qo'shamiz
  // Shu yordamida "математика" deb yozsada "matematika" mavjud datasidan topiladi
  const cyrillicParts = [institution.nameRu ?? '', descRu].filter(Boolean).join(' ')
  const transliterated = cyrillicParts ? transliterateCyrillic(cyrillicParts) : ''

  const searchText = [
    institution.nameUz,
    institution.nameRu ?? '',
    descUz,
    descRu,
    programs,
    specializations,
    institution.address ?? '',
    institution.city?.nameUz ?? '',
    transliterated,           // Kirill → Lotin transliteratsiyasi
  ].filter(Boolean).join(' ')

  // primaryKey aniq ko'rsatiladi — 'id', 'cityId', 'regionId' ni farqlash uchun
  await meili.index(INDEX).addDocuments(
    [{
      id:              institution.id,
      nameUz:          institution.nameUz,
      nameRu:          institution.nameRu ?? null,
      type:            institution.type,
      status:          institution.status,
      cityId:          institution.cityId ?? null,
      cityName:        institution.city?.nameUz ?? null,
      regionId:        institution.regionId ?? null,
      address:         institution.address ?? null,
      avgRating:       institution.avgRating ?? null,
      reviewCount:     institution.reviewCount,
      viewCount:       institution.viewCount,
      isVerified:      institution.isVerified,
      monthlyMin:      institution.pricing?.monthlyMin ?? null,
      descriptionUz:   descUz || null,
      descriptionRu:   descRu || null,
      searchText:      searchText || null,
      createdAt:       institution.createdAt.getTime(),
    }],
    { primaryKey: 'id' },   // ← aniq ko'rsatamiz
  )
}

/**
 * Muassasani Meilisearch'dan o'chirish.
 */
export async function removeFromIndex(institutionId: string): Promise<void> {
  await meili.index(INDEX).deleteDocument(institutionId)
}

// ─────────────────────────────────────────────────────────────────────────────
// QIDIRUV
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Meilisearch orqali qidiruv.
 * Kirill alifbosida yozilgan so'rovlar avtomatik transliteratsiya qilinadi.
 */
export async function searchInstitutions(params: {
  q?: string
  type?: string
  cityId?: string
  regionId?: string
  minRating?: number
  monthlyMax?: number
  sortBy?: string
  page?: number
  limit?: number
}) {
  const { q = '', type, cityId, regionId, minRating, monthlyMax, sortBy = 'rating', page = 1, limit = 20 } = params

  const filters: string[] = ['status IN [ACTIVE, PREMIUM]']

  if (type)       filters.push(`type = "${type}"`)
  if (cityId)     filters.push(`cityId = "${cityId}"`)
  if (regionId)   filters.push(`regionId = "${regionId}"`)
  if (minRating)  filters.push(`avgRating >= ${minRating}`)
  if (monthlyMax) filters.push(`monthlyMin <= ${monthlyMax}`)

  const sort = buildMeiliSort(sortBy)

  // 1) Kirill → lotin transliteratsiya ("химия" → "ximiya")
  const translitQ = q && hasCyrillic(q) ? transliterateCyrillic(q) : q

  // 2) Sinonim kengaytirish: eng yaxshi mos keluvchi sinonimni asosiy so'rov sifatida ishlatamiz
  //    "химия" → expandSearchTerms → ["химия","кимё","kimyo","chemistry",...] → birinchi lotin terminni olamiz
  const expandedTerms = q ? expandSearchTerms(translitQ) : [translitQ]
  // Lotin terminlardan birinchisini tanlash (DB da lotin formatida saqlangan)
  const bestLatinTerm = expandedTerms.find(t => !/[а-яёА-ЯЁ]/u.test(t)) ?? translitQ
  const searchQuery = bestLatinTerm || q

  const meiliOptions = {
    filter: filters.join(' AND '),
    sort,
    offset: (page - 1) * limit,
    limit,
    facets: ['type', 'cityId'],
  }

  // Asosiy qidiruv (eng yaxshi sinonim term yoki transliteratsiya)
  const result = await meili.index(INDEX).search(searchQuery, meiliOptions)

  // Agar natija 0 → asl so'rov bilan ham qidiramiz (Meilisearch sinonim index ishlashi uchun)
  if (q && (result.estimatedTotalHits ?? 0) === 0 && searchQuery !== q) {
    const fallback = await meili.index(INDEX).search(q, meiliOptions)
    if ((fallback.estimatedTotalHits ?? 0) > 0) {
      return {
        data: fallback.hits,
        meta: {
          total:      fallback.estimatedTotalHits ?? 0,
          page,
          limit,
          totalPages: Math.ceil((fallback.estimatedTotalHits ?? 0) / limit),
        },
        facets: fallback.facetDistribution ?? {},
      }
    }
  }

  return {
    data: result.hits,
    meta: {
      total:      result.estimatedTotalHits ?? 0,
      page,
      limit,
      totalPages: Math.ceil((result.estimatedTotalHits ?? 0) / limit),
    },
    facets: result.facetDistribution ?? {},
  }
}

function buildMeiliSort(sortBy: string): string[] {
  switch (sortBy) {
    case 'price_asc':  return ['monthlyMin:asc']
    case 'price_desc': return ['monthlyMin:desc']
    case 'newest':     return ['createdAt:desc']
    case 'popular':    return ['viewCount:desc']
    default:           return ['avgRating:desc']
  }
}
