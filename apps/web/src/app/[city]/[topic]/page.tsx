import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import SearchResults from '../../search/SearchResults'
import type { InstitutionCard } from '../../search/page'
import { TOPICS, type Topic } from '@/lib/seoTopics'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface CityRow {
  id: string
  nameUz: string
  nameRu: string
  slug: string
  region?: { nameUz: string; nameRu: string }
}

async function resolveCity(slug: string): Promise<CityRow | null> {
  try {
    const res = await fetch(`${API}/geo/cities`, { cache: 'no-store' })
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
    return { title: 'EDULA' }
  }

  return {
    title: `${topic.labelUz} — ${city.nameUz} | EDULA`,
    description: `${city.nameUz}dagi eng yaxshi ${topic.labelUz.toLowerCase()}. ${topic.descUz}`,
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
    const res = await fetch(`${API}/institutions?${query}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      institutions = data.data
      meta = data.meta
    }
  } catch {
    // API ishlamasa bo'sh natija bilan davom etamiz
  }

  return (
    <div className="flex min-h-screen flex-col">
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
