import type { MetadataRoute } from 'next'
import { TOPICS } from '@/lib/seoTopics'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edula.uz'

interface InstitutionRow {
  slug: string
  updatedAt?: string
}
interface CityRow {
  slug: string
}

// Barcha muassasalarni sahifalab yig'ish — API bir so'rovda ko'pi bilan
// 50 tasini qaytaradi, shuning uchun bo'sh sahifagacha davom etamiz.
async function fetchAllInstitutions(): Promise<InstitutionRow[]> {
  const all: InstitutionRow[] = []
  const SAFETY_MAX_PAGES = 40 // ~2000 muassasagacha yetarli

  for (let page = 1; page <= SAFETY_MAX_PAGES; page++) {
    try {
      const res = await fetch(`${API}/institutions?limit=50&page=${page}`, {
        next: { revalidate: 3600 },
      })
      if (!res.ok) break
      const data = await res.json()
      const rows = (data.data ?? []) as InstitutionRow[]
      all.push(...rows)
      if (rows.length < 50) break
    } catch {
      break
    }
  }

  return all
}

async function fetchCities(): Promise<CityRow[]> {
  try {
    const res = await fetch(`${API}/geo/cities`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.data ?? []) as CityRow[]
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [institutions, cities] = await Promise.all([fetchAllInstitutions(), fetchCities()])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/match`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/compare`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const institutionRoutes: MetadataRoute.Sitemap = institutions.map((inst) => ({
    url: `${SITE_URL}/institutions/${inst.slug}`,
    lastModified: inst.updatedAt ? new Date(inst.updatedAt) : undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Shahar × mavzu SEO landing sahifalari (masalan /toshkent/python)
  const cityTopicRoutes: MetadataRoute.Sitemap = cities.flatMap((city) =>
    TOPICS.map((topic) => ({
      url: `${SITE_URL}/${city.slug}/${topic.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  )

  return [...staticRoutes, ...institutionRoutes, ...cityTopicRoutes]
}
