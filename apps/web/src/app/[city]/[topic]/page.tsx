import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import SearchResults from '../../search/SearchResults'
import type { InstitutionCard } from '../../search/page'
import { TOPICS, type Topic } from '@/lib/seoTopics'
import { breadcrumbSchema, itemListSchema } from '@/lib/structuredData'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bilimon.uz'

interface CityRow {
  id: string
  nameUz: string
  nameRu: string
  slug: string
  region?: { nameUz: string; nameRu: string }
}

async function resolveCity(slug: string): Promise<CityRow | null> {
  try {
    // Shaharlar ro'yxati kamdan-kam o'zgaradi — har so'rovda qayta olish
    // TTFB'ni keraksiz sekinlashtiradi (bu asosiy organik trafik sahifasi,
    // Core Web Vitals qidiruv reytingiga bevosita ta'sir qiladi)
    const res = await fetch(`${API}/geo/cities`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    const cities = (data.data ?? []) as CityRow[]
    return cities.find(c => c.slug === slug) ?? null
  } catch {
    return null
  }
}

function findTopic(slug: string): Topic | null {
  return TOPICS.find(t => t.slug === slug) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; topic: string }>
}): Promise<Metadata> {
  const { city: citySlug, topic: topicSlug } = await params
  const topic = findTopic(topicSlug)
  const city = topic ? await resolveCity(citySlug) : null

  if (!topic || !city) {
    return { title: 'BilimOn' }
  }

  const title = `${topic.labelUz} — ${city.nameUz} | BilimOn`
  const description = `${city.nameUz}dagi eng yaxshi ${topic.labelUz.toLowerCase()}. ${topic.descUz}`
  const url = `${SITE_URL}/${citySlug}/${topicSlug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', siteName: 'BilimOn' },
  }
}

export default async function CityTopicPage({
  params,
}: {
  params: Promise<{ city: string; topic: string }>
}) {
  const { city: citySlug, topic: topicSlug } = await params

  const topic = findTopic(topicSlug)
  if (!topic) notFound()

  const city = await resolveCity(citySlug)
  if (!city) notFound()

  const searchParams: Record<string, string> = {
    cityId: city.id,
    q: topic.term,
    sortBy: 'value',
  }
  const query = new URLSearchParams(searchParams).toString()

  let institutions: InstitutionCard[] = []
  let meta = { total: 0, page: 1, limit: 20, totalPages: 0 }

  try {
    // 30 daqiqalik ISR cache — bu asosiy organik trafik (SEO landing)
    // sahifasi, har so'rovda qayta hisoblash TTFB'ni keraksiz sekinlashtiradi
    const res = await fetch(`${API}/institutions?${query}`, { next: { revalidate: 1800 } })
    if (res.ok) {
      const data = await res.json()
      institutions = data.data
      meta = data.meta
    }
  } catch {
    // API ishlamasa bo'sh natija bilan davom etamiz
  }

  const pageUrl = `${SITE_URL}/${citySlug}/${topicSlug}`
  const jsonLd = [
    breadcrumbSchema([
      { name: 'BilimOn', url: SITE_URL },
      { name: `${city.nameUz} — ${topic.labelUz}`, url: pageUrl },
    ]),
    ...(institutions.length > 0 ? [itemListSchema(
      institutions.map((i) => ({ name: i.nameUz, url: `${SITE_URL}/institutions/${i.slug}` })),
    )] : []),
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {jsonLd.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- JSON.stringify chiqishi, foydalanuvchi kiritmasi emas — XSS xavfi yo'q
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Header />
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {city.nameUz} — {topic.labelUz}
        </h1>
        <p className="mt-1.5 max-w-2xl text-gray-500">{topic.descUz}</p>
      </div>
      <SearchResults institutions={institutions} meta={meta} params={searchParams} />
      <Footer />
    </div>
  )
}
