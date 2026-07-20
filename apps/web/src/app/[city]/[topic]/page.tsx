import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Header from '@/components/shared/Header'
import SearchResults from '../../search/SearchResults'
import type { InstitutionCard } from '../../search/page'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface CityRow {
  id: string
  nameUz: string
  nameRu: string
  slug: string
  region?: { nameUz: string; nameRu: string }
}

interface Topic {
  slug: string
  term: string
  labelUz: string
  labelRu: string
  descUz: string
  descRu: string
}

// Haqiqiy seed dasturlaridan tanlangan, qidiruv sinonimlari (subjectSynonyms.ts)
// bilan mos keladigan mavzular — SEO uchun eng ko'p qidiriladigan yo'nalishlar.
const TOPICS: Topic[] = [
  {
    slug: 'python', term: 'Python',
    labelUz: 'Python dasturlash kurslari', labelRu: 'Курсы программирования Python',
    descUz: 'Python dasturlash tilini o\'rgatuvchi eng yaxshi kurslar va IT markazlar.',
    descRu: 'Лучшие курсы и IT-центры, обучающие языку программирования Python.',
  },
  {
    slug: 'frontend', term: 'Frontend',
    labelUz: 'Frontend dasturlash kurslari', labelRu: 'Курсы Frontend-разработки',
    descUz: 'Frontend (HTML, CSS, JavaScript, React) yo\'nalishida o\'qitadigan kurslar.',
    descRu: 'Курсы, обучающие Frontend-разработке (HTML, CSS, JavaScript, React).',
  },
  {
    slug: 'flutter', term: 'Flutter',
    labelUz: 'Flutter (mobil dasturlash) kurslari', labelRu: 'Курсы Flutter (мобильная разработка)',
    descUz: 'Flutter yordamida mobil ilova yaratishni o\'rgatuvchi kurslar.',
    descRu: 'Курсы по созданию мобильных приложений на Flutter.',
  },
  {
    slug: 'dasturlash', term: 'dasturlash',
    labelUz: 'Dasturlash kurslari', labelRu: 'Курсы программирования',
    descUz: 'Dasturlashni noldan o\'rgatadigan IT kurs markazlari.',
    descRu: 'IT-центры и курсы, обучающие программированию с нуля.',
  },
  {
    slug: 'ingliz-tili', term: 'ingliz tili',
    labelUz: 'Ingliz tili kurslari', labelRu: 'Курсы английского языка',
    descUz: 'Ingliz tilini har qanday darajada o\'rgatadigan til markazlari.',
    descRu: 'Языковые центры, обучающие английскому языку любого уровня.',
  },
  {
    slug: 'ielts', term: 'IELTS',
    labelUz: 'IELTS tayyorgarlik kurslari', labelRu: 'Курсы подготовки к IELTS',
    descUz: 'IELTS xalqaro imtihoniga tayyorlaydigan eng yaxshi markazlar.',
    descRu: 'Лучшие центры, готовящие к международному экзамену IELTS.',
  },
  {
    slug: 'dizayn', term: 'dizayn',
    labelUz: 'Dizayn kurslari (UI/UX, grafik)', labelRu: 'Курсы дизайна (UI/UX, графика)',
    descUz: 'UI/UX va grafik dizayn yo\'nalishida o\'qitadigan kurslar.',
    descRu: 'Курсы, обучающие UI/UX и графическому дизайну.',
  },
  {
    slug: 'robototexnika', term: 'robototexnika',
    labelUz: 'Robototexnika kurslari', labelRu: 'Курсы робототехники',
    descUz: 'Bolalar va o\'quvchilar uchun robototexnika to\'garaklari.',
    descRu: 'Кружки робототехники для детей и школьников.',
  },
]

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
    <>
      <Header />
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {city.nameUz} — {topic.labelUz}
        </h1>
        <p className="mt-1.5 max-w-2xl text-gray-500">{topic.descUz}</p>
      </div>
      <SearchResults institutions={institutions} meta={meta} params={searchParams} />
    </>
  )
}
