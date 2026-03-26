import { MeiliSearch } from 'meilisearch'
import { env } from '../utils/env'

export const meili = new MeiliSearch({
  host: env.MEILISEARCH_URL,
  apiKey: env.MEILISEARCH_KEY,
})

const INDEX = 'institutions'

/**
 * Meilisearch index sozlamalari.
 * Birinchi marta ishga tushirishda yoki index qayta tuzilganda chaqiriladi.
 */
export async function setupSearchIndex(): Promise<void> {
  await meili.index(INDEX).updateSettings({
    searchableAttributes: ['nameUz', 'nameRu', 'descriptionUz', 'address', 'cityName'],
    filterableAttributes: ['type', 'cityId', 'regionId', 'status', 'avgRating', 'monthlyMin', 'isVerified'],
    sortableAttributes: ['avgRating', 'viewCount', 'reviewCount', 'createdAt', 'monthlyMin'],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    },
    pagination: { maxTotalHits: 1000 },
  })
  console.log('✅ Meilisearch index sozlandi')
}

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
  details?: { descriptionUz?: string | null } | null
  pricing?: { monthlyMin?: number | null } | null
}): Promise<void> {
  await meili.index(INDEX).addDocuments([
    {
      id: institution.id,
      nameUz: institution.nameUz,
      nameRu: institution.nameRu,
      type: institution.type,
      status: institution.status,
      cityId: institution.cityId,
      cityName: institution.city?.nameUz,
      regionId: institution.regionId,
      address: institution.address,
      avgRating: institution.avgRating,
      reviewCount: institution.reviewCount,
      viewCount: institution.viewCount,
      isVerified: institution.isVerified,
      monthlyMin: institution.pricing?.monthlyMin,
      descriptionUz: institution.details?.descriptionUz,
      createdAt: institution.createdAt.getTime(),
    },
  ])
}

/**
 * Muassasani Meilisearch'dan o'chirish.
 */
export async function removeFromIndex(institutionId: string): Promise<void> {
  await meili.index(INDEX).deleteDocument(institutionId)
}

/**
 * Meilisearch orqali qidiruv.
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

  const result = await meili.index(INDEX).search(q, {
    filter: filters.join(' AND '),
    sort,
    offset: (page - 1) * limit,
    limit,
    facets: ['type', 'cityId'],
  })

  return {
    data: result.hits,
    meta: {
      total: result.estimatedTotalHits ?? 0,
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
